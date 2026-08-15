import { getPriceComparison, getDashboardMetrics } from '../services/analyticsService.js';

/**
 * GET /api/analytics/price-comparison
 * Cross-vendor SKU price comparison with filters.
 *
 * Query params: sku, startDate, endDate, page, limit
 */
export const priceComparison = async (req, res, next) => {
  try {
    const { sku, startDate, endDate, page, limit } = req.query;

    const result = await getPriceComparison({
      sku,
      startDate,
      endDate,
      page: page || 1,
      limit: limit || 20,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/dashboard
 * Dashboard metrics
 */
export const dashboard = async (req, res, next) => {
  try {
    const result = await getDashboardMetrics();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default { priceComparison, dashboard };
