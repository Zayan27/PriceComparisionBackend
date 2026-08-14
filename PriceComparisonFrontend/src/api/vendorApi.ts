import apiClient from './axios';

export interface Vendor {
  id: string;
  name: string;
  invoices: number;
  items: number;
  totalValue: number;
  savings: number;
  description: string;
}

export interface VendorsResponse {
  success: boolean;
  data: Vendor[];
}

export const getVendors = async (): Promise<VendorsResponse> => {
  const response = await apiClient.get<VendorsResponse>('/vendors');
  return response.data;
};

export interface VendorProduct {
  sku: string;
  productName: string;
  unitPrice: number;
  soldPrice: number;
  lastInvoiceDate: string;
  purchaseCount: number;
}

export interface VendorProductsResponse {
  success: boolean;
  data: {
    products: VendorProduct[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalResults: number;
      limit: number;
    }
  };
}

export const getVendorProducts = async (vendorId: string, page = 1, limit = 50): Promise<VendorProductsResponse> => {
  const response = await apiClient.get<VendorProductsResponse>(`/vendors/${vendorId}/products`, {
    params: { page, limit }
  });
  return response.data;
};
