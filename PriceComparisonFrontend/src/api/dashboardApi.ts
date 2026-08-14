import apiClient from './axios';

export interface DashboardData {
  metrics: {
    totalInvoices: number;
    totalValue: number;
    totalItems: number;
    totalVendors: number;
    averageItemPrice: number;
    lowestPriceDetected: number;
    highestPriceDetected: number;
    potentialSavings: number;
  };
  invoiceTrend: { name: string; value: number }[];
  vendorDistribution: { name: string; value: number }[];
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

export const getDashboardData = async (): Promise<DashboardData> => {
  const response = await apiClient.get<DashboardResponse>('/analytics/dashboard');
  return response.data.data;
};
