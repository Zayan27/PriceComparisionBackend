import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import VENDOR_RULES from '../config/vendorRules.js';
import logger from '../utils/logger.js';

/**
 * POST /api/admin/reset
 * Admin-only: purge all invoices and stale vendors, re-seed the 4 configured vendors.
 */
export const resetDatabase = async (req, res, next) => {
  try {
    logger.info('Admin-triggered database reset initiated');

    // 1. Delete all invoices
    const invoiceResult = await Invoice.deleteMany({});
    logger.info(`Deleted ${invoiceResult.deletedCount} invoices`);

    // 2. Delete ALL vendors (including stale Vendor A-E)
    const vendorResult = await Vendor.deleteMany({});
    logger.info(`Deleted ${vendorResult.deletedCount} vendors`);

    // 3. Re-seed the 4 configured vendors
    const seeded = [];
    for (const rule of VENDOR_RULES) {
      await Vendor.create({
        vendorId: rule.vendorKey,
        name: rule.name,
        description: rule.description || '',
        serialPatterns: [],
      });
      seeded.push({ vendorId: rule.vendorKey, name: rule.name });
      logger.info(`Created vendor: ${rule.name} (${rule.vendorKey})`);
    }

    // 4. Verify
    const finalVendors = await Vendor.find().lean();
    const finalInvoices = await Invoice.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Database reset complete. Old data purged, 4 vendors seeded.',
      data: {
        invoicesDeleted: invoiceResult.deletedCount,
        vendorsDeleted: vendorResult.deletedCount,
        vendorsSeeded: seeded,
        currentState: {
          vendors: finalVendors.map((v) => ({ id: v.vendorId, name: v.name })),
          invoiceCount: finalInvoices,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export default { resetDatabase };
