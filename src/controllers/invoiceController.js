import Invoice from '../models/Invoice.js';

/**
 * GET /api/invoices
 * Paginated invoice listing with filters.
 *
 * Query params: vendor, startDate, endDate, serialNumber, page, limit
 */
export const listInvoices = async (req, res, next) => {
  try {
    const {
      vendor,
      startDate,
      endDate,
      serialNumber,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (vendor) {
      filter.vendorId = vendor;
    }

    if (serialNumber) {
      filter.serialNumber = { $regex: serialNumber, $options: 'i' };
    }

    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [invoices, totalCount] = await Promise.all([
      Invoice.find(filter)
        .sort({ invoiceDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalResults: totalCount,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export default { listInvoices };
