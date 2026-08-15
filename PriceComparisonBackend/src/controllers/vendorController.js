import vendorService from '../services/vendorService.js';

/**
 * GET /api/vendors
 * Fetch all vendors with their aggregated statistics.
 */
export const listVendors = async (req, res, next) => {
  try {
    const vendors = await vendorService.getVendors();
    res.status(200).json({
      success: true,
      data: vendors,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/vendors/:id/products
 * Fetch all products supplied by a specific vendor with pricing history.
 */
export const listVendorProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await vendorService.getVendorProducts(id, page, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default { listVendors, listVendorProducts };
