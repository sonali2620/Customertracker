import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/analyticsController.js';
import { exportComplaintsCSV } from '../controllers/exportController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardMetrics);
router.get('/export-csv', exportComplaintsCSV);

export default router;
