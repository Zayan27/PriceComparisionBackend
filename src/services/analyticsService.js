import Invoice from '../models/Invoice.js';
import mongoose from 'mongoose';

/**
 * Get cross-vendor price comparison for SKUs using MongoDB aggregation.
 *
 * @param {object} filters
 * @param {string}  [filters.sku]       - Filter by specific SKU/UPC
 * @param {string}  [filters.startDate] - Filter invoices from this date
 * @param {string}  [filters.endDate]   - Filter invoices up to this date
 * @param {number}  [filters.page=1]    - Page number for pagination
 * @param {number}  [filters.limit=20]  - Results per page
 * @returns {Promise<{ results: Array, pagination: object }>}
 */
export async function getPriceComparison(filters = {}) {
  const { sku, startDate, endDate, page = 1, limit = 20 } = filters;

  // ─── Build match stage ─────────────────────────────────────────────
  const matchStage = {};

  if (startDate || endDate) {
    matchStage.invoiceDate = {};
    if (startDate) matchStage.invoiceDate.$gte = new Date(startDate);
    if (endDate) matchStage.invoiceDate.$lte = new Date(endDate);
  }

  // ─── Build item match after $unwind ────────────────────────────────
  const itemMatch = {};
  if (sku) {
    itemMatch['items.sku'] = { $regex: sku, $options: 'i' };
  }

  // ─── Aggregation Pipeline ─────────────────────────────────────────
  const pipeline = [];

  // 1. Filter invoices by date range (if provided)
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  // 2. Unwind items array
  pipeline.push({ $unwind: '$items' });

  // 3. Filter by SKU (if provided)
  if (Object.keys(itemMatch).length > 0) {
    pipeline.push({ $match: itemMatch });
  }

  // 4. Lookup vendor details
  pipeline.push({
    $lookup: {
      from: 'vendors',
      localField: 'vendorId',
      foreignField: 'vendorId',
      as: 'vendorInfo',
    },
  });
  pipeline.push({
    $addFields: {
      vendorName: { $arrayElemAt: ['$vendorInfo.name', 0] },
    },
  });

  // 5. Group by SKU + Vendor to get latest price per vendor
  pipeline.push({
    $sort: { invoiceDate: -1 },
  });

  pipeline.push({
    $group: {
      _id: { sku: '$items.sku', vendorId: '$vendorId' },
      productName: { $first: '$items.productName' },
      vendorName: { $first: '$vendorName' },
      latestUnitPrice: { $first: '$items.unitPrice' },
      latestSoldPrice: { $first: '$items.soldPrice' },
      lastInvoiceDate: { $first: '$invoiceDate' },
      allUnitPrices: { $push: '$items.unitPrice' },
      allSoldPrices: { $push: '$items.soldPrice' },
      invoiceCount: { $sum: 1 },
    },
  });

  // 6. Group by SKU to aggregate across all vendors
  pipeline.push({
    $group: {
      _id: '$_id.sku',
      productName: { $first: '$productName' },
      vendorBreakdown: {
        $push: {
          vendorId: '$_id.vendorId',
          vendorName: '$vendorName',
          latestPrice: '$latestSoldPrice',
          latestUnitPrice: '$latestUnitPrice',
          lastInvoiceDate: '$lastInvoiceDate',
          invoiceCount: '$invoiceCount',
        },
      },
      allSoldPrices: { $push: '$allSoldPrices' },
      allUnitPrices: { $push: '$allUnitPrices' },
      vendorCount: { $sum: 1 },
    },
  });

  // 7. Compute price summary statistics
  pipeline.push({
    $addFields: {
      // Flatten nested arrays of prices
      flatSoldPrices: {
        $reduce: {
          input: '$allSoldPrices',
          initialValue: [],
          in: { $concatArrays: ['$$value', '$$this'] },
        },
      },
      flatUnitPrices: {
        $reduce: {
          input: '$allUnitPrices',
          initialValue: [],
          in: { $concatArrays: ['$$value', '$$this'] },
        },
      },
    },
  });

  pipeline.push({
    $addFields: {
      priceSummary: {
        lowest: { $min: '$flatSoldPrices' },
        highest: { $max: '$flatSoldPrices' },
        average: { $round: [{ $avg: '$flatSoldPrices' }, 2] },
        unitPriceLowest: { $min: '$flatUnitPrices' },
        unitPriceHighest: { $max: '$flatUnitPrices' },
        unitPriceAverage: { $round: [{ $avg: '$flatUnitPrices' }, 2] },
      },
    },
  });

  // 8. Clean up output
  pipeline.push({
    $project: {
      _id: 0,
      sku: '$_id',
      productName: 1,
      vendorCount: 1,
      priceSummary: 1,
      vendorBreakdown: 1,
    },
  });

  // 9. Sort by SKU
  pipeline.push({ $sort: { sku: 1 } });

  // ─── Pagination using $facet ──────────────────────────────────────
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  pipeline.push({
    $facet: {
      metadata: [{ $count: 'totalResults' }],
      results: [{ $skip: skip }, { $limit: parseInt(limit, 10) }],
    },
  });

  const [result] = await Invoice.aggregate(pipeline);

  const totalResults = result.metadata[0]?.totalResults || 0;
  const totalPages = Math.ceil(totalResults / parseInt(limit, 10));

  return {
    results: result.results,
    pagination: {
      currentPage: parseInt(page, 10),
      totalPages,
      totalResults,
      limit: parseInt(limit, 10),
    },
  };
}

export default { getPriceComparison };
