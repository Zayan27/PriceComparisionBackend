import { Router } from 'express';
import { listInvoices } from '../controllers/invoiceController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/invoices
// Admin-only: paginated invoice listing with filters
router.get('/', requireAuth, requireRole('admin'), listInvoices);

export default router;
