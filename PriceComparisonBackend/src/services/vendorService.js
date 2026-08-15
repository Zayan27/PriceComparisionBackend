import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';

/**
 * Get aggregated list of vendors.
 */
export async function getVendors() {
  const vendorsData = await Invoice.aggregate([
    { $unwind: "$items" },
    { $group: {
        _id: "$vendorId",
        totalInvoices: { $addToSet: "$_id" },
        items: { $sum: "$items.quantity" },
        totalValue: { $sum: { $multiply: ["$items.soldPrice", "$items.quantity"] } }
      }
    },
    { $project: {
        vendorId: "$_id",
        invoices: { $size: "$totalInvoices" },
        items: 1,
        totalValue: 1,
        _id: 0
      }
    }
  ]);

  const allVendors = await Vendor.find().lean();
  
  // Merge data
  const result = allVendors.map(v => {
    const agg = vendorsData.find(d => d.vendorId === v.vendorId) || { invoices: 0, items: 0, totalValue: 0 };
    return {
      id: v.vendorId,
      name: v.name,
      invoices: agg.invoices,
      items: agg.items,
      totalValue: agg.totalValue,
      description: v.description || '',
      savings: 0 // Mock savings for now
    };
  });

  return result;
}

/**
 * Get catalog of products supplied by a specific vendor.
 */
export async function getVendorProducts(vendorId, page = 1, limit = 50) {
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  
  const pipeline = [
    { $match: { vendorId: vendorId } },
    { $unwind: "$items" },
    { $sort: { invoiceDate: -1 } },
    { $group: {
        _id: "$items.sku",
        productName: { $first: "$items.productName" },
        unitPrice: { $first: "$items.unitPrice" },
        soldPrice: { $first: "$items.soldPrice" },
        lastInvoiceDate: { $first: "$invoiceDate" },
        purchaseCount: { $sum: "$items.quantity" }
      }
    },
    { $project: {
        _id: 0,
        sku: "$_id",
        productName: 1,
        unitPrice: 1,
        soldPrice: 1,
        lastInvoiceDate: 1,
        purchaseCount: 1
      }
    },
    { $sort: { sku: 1 } },
    {
      $facet: {
        metadata: [{ $count: "totalResults" }],
        results: [{ $skip: skip }, { $limit: parseInt(limit, 10) }]
      }
    }
  ];

  const [result] = await Invoice.aggregate(pipeline);
  
  const totalResults = result.metadata[0]?.totalResults || 0;
  const totalPages = Math.ceil(totalResults / parseInt(limit, 10));

  return {
    products: result.results,
    pagination: {
      currentPage: parseInt(page, 10),
      totalPages,
      totalResults,
      limit: parseInt(limit, 10),
    }
  };
}

export default { getVendors, getVendorProducts };
