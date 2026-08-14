import { Router } from 'express';
import { priceComparison } from '../controllers/analyticsController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/analytics/price-comparison
// Admin-only: cross-vendor SKU price comparison
router.get('/price-comparison', requireAuth, requireRole('admin'), priceComparison);

export default router;
