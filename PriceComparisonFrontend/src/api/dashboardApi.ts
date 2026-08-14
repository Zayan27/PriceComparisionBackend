// Placeholder API service for Dashboard aggregations
// Since the backend does not currently provide a dashboard endpoint,
// we are defining the expected interface here for a clean future integration.

export interface DashboardMetrics {
  totalInvoices: number;
  totalValue: number;
  totalItems: number;
  totalVendors: number;
  averageItemPrice: number;
  lowestPriceDetected: number;
  highestPriceDetected: number;
  potentialSavings: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  secondaryValue?: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  invoiceTrend: ChartDataPoint[];
  vendorDistribution: ChartDataPoint[];
  priceMovement: ChartDataPoint[];
}

export const getDashboardData = async (): Promise<DashboardData> => {
  // Simulating a backend API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        metrics: {
          totalInvoices: 1432,
          totalValue: 2450000,
          totalItems: 8540,
          totalVendors: 24,
          averageItemPrice: 285.50,
          lowestPriceDetected: 12.00,
          highestPriceDetected: 4500.00,
          potentialSavings: 125000,
        },
        invoiceTrend: [
          { name: 'Jan', value: 120 },
          { name: 'Feb', value: 150 },
          { name: 'Mar', value: 180 },
          { name: 'Apr', value: 140 },
          { name: 'May', value: 210 },
          { name: 'Jun', value: 250 },
        ],
        vendorDistribution: [
          { name: 'TechCorp', value: 45 },
          { name: 'OfficePlus', value: 30 },
          { name: 'GlobalSupplies', value: 15 },
          { name: 'Other', value: 10 },
        ],
        priceMovement: [
          { name: 'Week 1', value: 100, secondaryValue: 105 },
          { name: 'Week 2', value: 105, secondaryValue: 102 },
          { name: 'Week 3', value: 98, secondaryValue: 110 },
          { name: 'Week 4', value: 115, secondaryValue: 115 },
        ]
      });
    }, 800);
  });
};
