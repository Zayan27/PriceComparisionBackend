import apiClient from './axios';

export interface InvoiceItem {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  soldPrice: number;
  lineTotal: number;
  tax: number;
}

export interface Invoice {
  _id: string;
  serialNumber: string;
  vendorId: string;
  rawFileName: string;
  invoiceDate: string;
  customerName: string;
  companyName: string;
  items: InvoiceItem[];
  totalAmount: number;
  totalTax: number;
  ingestedAt: string;
  createdAt: string;
}

export interface InvoicesResponse {
  success: boolean;
  data: {
    invoices: Invoice[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalResults: number;
      limit: number;
    };
  };
}

export const getInvoices = async (params: any): Promise<InvoicesResponse> => {
  const response = await apiClient.get<InvoicesResponse>('/invoices', { params });
  return response.data;
};

// Hit the POST API for ingestion
export const ingestDirectory = async (directory?: string): Promise<any> => {
  const response = await apiClient.post('/invoices/ingest-directory', { directory });
  return response.data;
};
