import { Router } from 'express';
import { getSLAPolicies, updateSLAPolicy, triggerEscalationCheck, getEscalations } from '../controllers/slaController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

// List policies
router.get('/policies', getSLAPolicies);

// Update SLA policy (Manager only)
router.put('/policies/:priority', requireRole(ROLES.MANAGER), updateSLAPolicy);

// Idempotent escalation check trigger (Staff only)
router.post('/check', requireRole(ROLES.MANAGER, ROLES.AGENT), triggerEscalationCheck);

// List escalation history
router.get('/escalations', requireRole(ROLES.MANAGER, ROLES.AGENT), getEscalations);

export default router;
