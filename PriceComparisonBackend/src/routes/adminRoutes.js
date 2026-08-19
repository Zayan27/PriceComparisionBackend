import { Router } from 'express';
import { resetDatabase } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/admin/reset
// Admin-only: purge all invoices + stale vendors, re-seed 4 configured vendors
router.post('/reset', requireAuth, requireRole('admin'), resetDatabase);

export default router;
