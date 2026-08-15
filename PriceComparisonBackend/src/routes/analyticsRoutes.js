import { Router } from 'express';
import { priceComparison, dashboard } from '../controllers/analyticsController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/analytics/price-comparison
// Admin-only: cross-vendor SKU price comparison
router.get('/price-comparison', requireAuth, requireRole('admin'), priceComparison);

// GET /api/analytics/dashboard
// Admin-only: dashboard metrics
router.get('/dashboard', requireAuth, requireRole('admin'), dashboard);

export default router;
