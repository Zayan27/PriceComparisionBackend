import { Router } from 'express';
import { listVendors, listVendorProducts } from '../controllers/vendorController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/vendors
// Admin-only: list all vendors with stats
router.get('/', requireAuth, requireRole('admin'), listVendors);

// GET /api/vendors/:id/products
// Admin-only: list products for a specific vendor
router.get('/:id/products', requireAuth, requireRole('admin'), listVendorProducts);

export default router;
