import apiClient from './axios';

export interface VendorBreakdown {
  vendorId: string;
  vendorName: string;
  latestPrice: number;
  latestUnitPrice: number;
  lastInvoiceDate: string;
  invoiceCount: number;
}

export interface PriceSummary {
  lowest: number;
  highest: number;
  average: number;
  unitPriceLowest: number;
  unitPriceHighest: number;
  unitPriceAverage: number;
}

export interface PriceComparisonItem {
  sku: string;
  productName: string;
  vendorCount: number;
  priceSummary: PriceSummary;
  vendorBreakdown: VendorBreakdown[];
}

export interface PriceComparisonResponse {
  success: boolean;
  data: {
    results: PriceComparisonItem[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalResults: number;
      limit: number;
    };
  };
}

export const getPriceComparison = async (params: { sku?: string, startDate?: string, endDate?: string, page?: number, limit?: number }): Promise<PriceComparisonResponse> => {
  const response = await apiClient.get<PriceComparisonResponse>('/analytics/price-comparison', { params });
  return response.data;
};
