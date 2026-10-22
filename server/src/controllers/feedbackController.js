import prisma from '../config/db.js';
import { ROLES, STATUSES } from '../config/constants.js';
import { logAuditEvent } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Submit Customer Feedback / CSAT Rating (1 to 5 stars)
 */
export async function submitFeedback(req, res, next) {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.'
      });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { feedback: true }
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Role check: Only customer who owns the ticket
    if (req.user.role === ROLES.CUSTOMER && complaint.customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    // Only allow rating on resolved or closed complaints
    if (![STATUSES.RESOLVED, STATUSES.CLOSED].includes(complaint.status)) {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be submitted once the complaint has been resolved or closed.'
      });
    }

    // Check if feedback already submitted
    if (complaint.feedback) {
      return res.status(409).json({
        success: false,
        message: 'Feedback has already been submitted for this complaint.'
      });
    }

    const feedback = await prisma.feedback.create({
      data: {
        complaintId: id,
        customerId: req.user.id,
        rating: parsedRating,
        comment: comment ? comment.trim() : null
      }
    });

    // Notify assigned agent of the rating received
    if (complaint.assignedAgentId) {
      await createNotification({
        userId: complaint.assignedAgentId,
        title: `Customer Rating: ${parsedRating} Stars`,
        message: `Customer rated ticket ${complaint.ticketNumber}: ${parsedRating}/5 stars. ${comment ? `"${comment}"` : ''}`,
        type: 'FEEDBACK',
        complaintId: id
      });
    }

    await logAuditEvent({
      action: 'FEEDBACK_SUBMITTED',
      entity: 'Complaint',
      entityId: id,
      userId: req.user.id,
      details: { rating: parsedRating }
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been recorded.',
      data: feedback
    });
  } catch (error) {
    next(error);
  }
}
