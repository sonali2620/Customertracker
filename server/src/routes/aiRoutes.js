import { Router } from 'express';
import { suggestClassification, summarizeThread, draftResponse } from '../controllers/aiController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

// AI classification suggestion on creation (open to all authenticated users)
router.post('/classify', suggestClassification);

// Staff-only advisory features
router.get('/summarize/:id', requireRole(ROLES.MANAGER, ROLES.AGENT), summarizeThread);
router.post('/draft-response/:id', requireRole(ROLES.MANAGER, ROLES.AGENT), draftResponse);

export default router;
