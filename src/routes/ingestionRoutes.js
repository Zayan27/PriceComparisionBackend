import { Router } from 'express';
import { triggerIngestion, uploadInvoice, upload } from '../controllers/ingestionController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/invoices/ingest-directory
// Admin-only: trigger batch ingestion of invoice files
router.post('/ingest-directory', requireAuth, requireRole('admin'), triggerIngestion);

// POST /api/invoices/upload
// Admin-only: handle single file upload and ingestion
router.post('/upload', requireAuth, requireRole('admin'), upload.single('file'), uploadInvoice);

export default router;
