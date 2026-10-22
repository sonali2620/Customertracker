import { Router } from 'express';
import { getComplaints, getComplaintById, createComplaint, updateComplaint } from '../controllers/complaintController.js';
import { transitionStatus } from '../controllers/statusController.js';
import { assignComplaint } from '../controllers/assignmentController.js';
import { getComments, addComment } from '../controllers/commentController.js';
import { submitFeedback } from '../controllers/feedbackController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROLES, STATUSES } from '../config/constants.js';

const router = Router();

// All complaint routes require authentication
router.use(authenticate);

router.get('/', getComplaints);
router.post('/', createComplaint);
router.get('/:id', getComplaintById);
router.put('/:id', updateComplaint);

// Controlled status transition state machine
router.patch('/:id/status', transitionStatus);

// Convenience endpoint for reopening
router.post('/:id/reopen', (req, res, next) => {
  req.body.newStatus = STATUSES.REOPENED;
  return transitionStatus(req, res, next);
});

// Manager agent assignment / reassignment
router.patch('/:id/assign', requireRole(ROLES.MANAGER, ROLES.AGENT), assignComplaint);

// Comments and internal notes
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);

// Customer CSAT rating & feedback
router.post('/:id/feedback', submitFeedback);

export default router;
