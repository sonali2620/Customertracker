import prisma from '../config/db.js';
import { ROLES, STATUSES } from '../config/constants.js';
import { createNotification } from '../services/notificationService.js';
import { logAuditEvent } from '../services/auditService.js';

/**
 * Get Comments for a Complaint
 * STRICT SECURITY: If requester is a CUSTOMER, filter out all isInternal = true comments.
 */
export async function getComments(req, res, next) {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      select: { id: true, customerId: true }
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    if (req.user.role === ROLES.CUSTOMER && complaint.customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const where = { complaintId: id };
    if (req.user.role === ROLES.CUSTOMER) {
      where.isInternal = false;
    }

    const comments = await prisma.complaintComment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, role: true, avatar: true }
        }
      }
    });

    return res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add a Comment or Internal Note
 */
export async function addComment(req, res, next) {
  try {
    const { id } = req.params;
    const { message, isInternal = false } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment message cannot be empty.'
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
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Role checks
    if (req.user.role === ROLES.CUSTOMER) {
      if (complaint.customerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden.' });
      }
      // Customer cannot create internal notes under any circumstance!
      if (isInternal) {
        return res.status(403).json({
          success: false,
          message: 'Customers are not permitted to create private internal notes.'
        });
      }
    }

    // Only Staff can create internal notes
    const willBeInternal = (req.user.role === ROLES.CUSTOMER) ? false : Boolean(isInternal);

    const now = new Date();

    // 1. Check if this is the first staff response (for SLA First Response tracking)
    let shouldRecordFirstResponse = false;
    if (!complaint.firstResponseAt && !willBeInternal && [ROLES.AGENT, ROLES.MANAGER].includes(req.user.role)) {
      shouldRecordFirstResponse = true;
    }

    // 2. Database write
    const comment = await prisma.$transaction(async (tx) => {
      const createdComment = await tx.complaintComment.create({
        data: {
          complaintId: id,
          userId: req.user.id,
          message: message.trim(),
          isInternal: willBeInternal
        },
        include: {
          user: {
            select: { id: true, name: true, role: true, avatar: true }
          }
        }
      });

      if (shouldRecordFirstResponse) {
        await tx.complaint.update({
          where: { id },
          data: { firstResponseAt: now }
        });
      }

      // If customer commented on WAITING_FOR_CUSTOMER, update status back to IN_PROGRESS
      if (req.user.role === ROLES.CUSTOMER && complaint.status === STATUSES.WAITING_FOR_CUSTOMER) {
        await tx.complaint.update({
          where: { id },
          data: { status: STATUSES.IN_PROGRESS }
        });

        await tx.statusHistory.create({
          data: {
            complaintId: id,
            previousStatus: STATUSES.WAITING_FOR_CUSTOMER,
            newStatus: STATUSES.IN_PROGRESS,
            changedById: req.user.id,
            reason: 'Customer replied to waiting inquiry.'
          }
        });
      }

      return createdComment;
    });

    // 3. Notifications
    if (!willBeInternal) {
      // If staff replied publicly, notify customer
      if (req.user.role !== ROLES.CUSTOMER) {
        await createNotification({
          userId: complaint.customerId,
          title: `New Reply on Ticket ${complaint.ticketNumber}`,
          message: `${req.user.name}: "${message.length > 80 ? message.substring(0, 80) + '...' : message}"`,
          type: 'COMMENT',
          complaintId: id
        });
      } else {
        // Customer replied, notify assigned agent if any
        if (complaint.assignedAgentId) {
          await createNotification({
            userId: complaint.assignedAgentId,
            title: `Customer Reply on Ticket ${complaint.ticketNumber}`,
            message: `${req.user.name}: "${message.length > 80 ? message.substring(0, 80) + '...' : message}"`,
            type: 'COMMENT',
            complaintId: id
          });
        }
      }
    }

    await logAuditEvent({
      action: willBeInternal ? 'INTERNAL_NOTE_ADDED' : 'PUBLIC_COMMENT_ADDED',
      entity: 'Complaint',
      entityId: id,
      userId: req.user.id,
      details: { isInternal: willBeInternal, messageLength: message.length }
    });

    return res.status(201).json({
      success: true,
      message: willBeInternal ? 'Internal note added.' : 'Reply posted successfully.',
      data: comment
    });
  } catch (error) {
    next(error);
  }
}
