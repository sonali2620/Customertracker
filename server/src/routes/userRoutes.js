import { Router } from 'express';
import { getUsers, getAgents, getCategories, createUser, updateUser } from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

// Categories accessible to all authenticated users
router.get('/categories', getCategories);

// Agents list with workloads (accessible to Staff)
router.get('/agents', requireRole(ROLES.MANAGER, ROLES.AGENT), getAgents);

// User management endpoints (Manager only)
router.get('/', requireRole(ROLES.MANAGER), getUsers);
router.post('/', requireRole(ROLES.MANAGER), createUser);
router.put('/:id', requireRole(ROLES.MANAGER), updateUser);

export default router;
