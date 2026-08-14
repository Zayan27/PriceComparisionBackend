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
