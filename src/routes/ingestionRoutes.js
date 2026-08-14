import { Router } from 'express';
import { triggerIngestion } from '../controllers/ingestionController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/invoices/ingest-directory
// Admin-only: trigger batch ingestion of invoice files
router.post('/ingest-directory', requireAuth, requireRole('admin'), triggerIngestion);

export default router;
