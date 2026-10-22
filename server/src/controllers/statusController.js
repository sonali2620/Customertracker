import prisma from '../config/db.js';
import { ROLES, STATUSES, VALID_TRANSITIONS } from '../config/constants.js';
import { logAuditEvent } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Controlled State Machine Status Transition
 */
export async function transitionStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { newStatus, reason = '', resolutionNotes = '' } = req.body;

    if (!newStatus || !STATUSES[newStatus]) {
      return res.status(400).json({
        success: false,
        message: `Invalid target status. Must be one of: ${Object.keys(STATUSES).join(', ')}.`
      });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedAgent: true
      }
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    const currentStatus = complaint.status;

    // Check if transition is the same
    if (currentStatus === newStatus) {
      return res.status(400).json({
        success: false,
        message: `Complaint is already in ${newStatus} status.`
      });
    }

    // 1. State Machine Validity Check
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${currentStatus} to ${newStatus}. Permitted next statuses: ${allowedNextStatuses.join(', ')}.`
      });
    }

    // 2. Role-based Permission Checks for Transitions
    if (req.user.role === ROLES.CUSTOMER) {
      // Customer must own the ticket
      if (complaint.customerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden.' });
      }

      // Customer can ONLY:
      // a) Confirm resolution (RESOLVED -> CLOSED)
      // b) Reopen a resolved/closed complaint (RESOLVED / CLOSED -> REOPENED)
      const isConfirmClose = currentStatus === STATUSES.RESOLVED && newStatus === STATUSES.CLOSED;
      const isReopen = [STATUSES.RESOLVED, STATUSES.CLOSED].includes(currentStatus) && newStatus === STATUSES.REOPENED;

      if (!isConfirmClose && !isReopen) {
        return res.status(403).json({
          success: false,
          message: 'Customers are only permitted to confirm resolution (Close) or Reopen a resolved ticket.'
        });
      }

      if (isReopen && (!reason || reason.trim().length < 5)) {
        return res.status(400).json({
          success: false,
          message: 'A detailed reason (at least 5 characters) is required when reopening a ticket.'
        });
      }
    }

    // Agents can only update tickets assigned to them unless they are Manager
    if (req.user.role === ROLES.AGENT && complaint.assignedAgentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update status for tickets assigned to you.'
      });
    }

    // Reopen requires reason regardless of who triggers it
    if (newStatus === STATUSES.REOPENED && (!reason || reason.trim().length < 5)) {
      return res.status(400).json({
        success: false,
        message: 'An explicit reason is required to reopen a ticket.'
      });
    }

    const now = new Date();
    const updateData = {
      status: newStatus
    };

    if (newStatus === STATUSES.RESOLVED) {
      updateData.resolvedAt = now;
      if (resolutionNotes) {
        updateData.resolutionNotes = resolutionNotes.trim();
      }
    } else if (newStatus === STATUSES.CLOSED) {
      updateData.closedAt = now;
    } else if (newStatus === STATUSES.REOPENED) {
      updateData.lastReopenedAt = now;
      updateData.reopenReason = reason.trim();
      updateData.reopenedCount = { increment: 1 };
      // Clear previous resolvedAt when reopening
      updateData.resolvedAt = null;
    }

    // 3. Atomic Database Transaction
    const updatedComplaint = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          customer: { select: { id: true, name: true, email: true } },
          assignedAgent: { select: { id: true, name: true, email: true } }
        }
      });

      // Record in StatusHistory
      await tx.statusHistory.create({
        data: {
          complaintId: id,
          previousStatus: currentStatus,
          newStatus,
          changedById: req.user.id,
          reason: reason ? reason.trim() : `Status changed from ${currentStatus} to ${newStatus}`
        }
      });

      return updated;
    });

    // 4. Send Notifications based on transition
    if (req.user.role !== ROLES.CUSTOMER) {
      // Notify customer of status change
      await createNotification({
        userId: complaint.customerId,
        title: `Ticket Status Updated: ${complaint.ticketNumber}`,
        message: `Your ticket "${complaint.title}" is now ${newStatus.replace(/_/g, ' ')}. ${resolutionNotes ? `Notes: ${resolutionNotes}` : ''}`,
        type: 'STATUS_CHANGE',
        complaintId: id
      });
    } else {
      // Customer took action (e.g. Reopened or Closed) -> Notify Agent/Manager
      if (complaint.assignedAgentId) {
        await createNotification({
          userId: complaint.assignedAgentId,
          title: `Ticket ${newStatus}: ${complaint.ticketNumber}`,
          message: `Customer ${complaint.customer.name} marked ticket "${complaint.title}" as ${newStatus}. ${reason ? `Reason: ${reason}` : ''}`,
          type: 'STATUS_CHANGE',
          complaintId: id
        });
      }
    }

    await logAuditEvent({
      action: 'STATUS_TRANSITION',
      entity: 'Complaint',
      entityId: id,
      userId: req.user.id,
      details: {
        ticketNumber: complaint.ticketNumber,
        previousStatus: currentStatus,
        newStatus,
        reason
      }
    });

    return res.json({
      success: true,
      message: `Ticket status successfully updated to ${newStatus}.`,
      data: updatedComplaint
    });
  } catch (error) {
    next(error);
  }
}
