import prisma from '../config/db.js';
import { ROLES, STATUSES } from '../config/constants.js';
import { logAuditEvent } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Assign or Reassign Complaint to an Agent
 */
export async function assignComplaint(req, res, next) {
  try {
    const { id } = req.params;
    const { agentId, reason = '' } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'Target agentId is required.'
      });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { assignedAgent: true }
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    // Target agent verification
    const targetAgent = await prisma.user.findUnique({
      where: { id: agentId }
    });

    if (!targetAgent || targetAgent.role !== ROLES.AGENT || !targetAgent.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Selected user is not an active support agent.'
      });
    }

    const previousAgentId = complaint.assignedAgentId;

    if (previousAgentId === agentId) {
      return res.status(400).json({
        success: false,
        message: `Ticket is already assigned to ${targetAgent.name}.`
      });
    }

    // Determine new status: if OPEN, advance to ASSIGNED
    const newStatus = complaint.status === STATUSES.OPEN ? STATUSES.ASSIGNED : complaint.status;

    // Atomic transaction
    const updated = await prisma.$transaction(async (tx) => {
      const updatedComplaint = await tx.complaint.update({
        where: { id },
        data: {
          assignedAgentId: agentId,
          status: newStatus
        },
        include: {
          assignedAgent: { select: { id: true, name: true, email: true, department: true } },
          category: true,
          customer: { select: { id: true, name: true, email: true } }
        }
      });

      // Record in AssignmentHistory
      await tx.assignmentHistory.create({
        data: {
          complaintId: id,
          previousAgentId,
          newAgentId: agentId,
          assignedById: req.user.id,
          reason: reason ? reason.trim() : (previousAgentId ? 'Reassigned by manager' : 'Assigned to agent')
        }
      });

      // Record status change if status changed
      if (newStatus !== complaint.status) {
        await tx.statusHistory.create({
          data: {
            complaintId: id,
            previousStatus: complaint.status,
            newStatus,
            changedById: req.user.id,
            reason: `Status updated to ${newStatus} on agent assignment.`
          }
        });
      }

      return updatedComplaint;
    });

    // Notify newly assigned agent
    await createNotification({
      userId: agentId,
      title: `Ticket Assigned: ${complaint.ticketNumber}`,
      message: `You have been assigned ticket "${complaint.title}". ${reason ? `Note: ${reason}` : ''}`,
      type: 'ASSIGNMENT',
      complaintId: id
    });

    // If previous agent existed, inform them of reassignment
    if (previousAgentId) {
      await createNotification({
        userId: previousAgentId,
        title: `Ticket Reassigned: ${complaint.ticketNumber}`,
        message: `Ticket "${complaint.title}" previously assigned to you has been reassigned to ${targetAgent.name}.`,
        type: 'REASSIGNMENT',
        complaintId: id
      });
    }

    await logAuditEvent({
      action: 'TICKET_ASSIGNED',
      entity: 'Complaint',
      entityId: id,
      userId: req.user.id,
      details: {
        ticketNumber: complaint.ticketNumber,
        previousAgentId,
        newAgentId: agentId,
        reason
      }
    });

    return res.json({
      success: true,
      message: `Ticket successfully assigned to ${targetAgent.name}.`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}
