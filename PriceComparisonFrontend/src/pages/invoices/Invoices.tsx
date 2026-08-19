import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, DatePicker, Input, Button, Space, Tag, Tooltip, Pagination } from 'antd';
import { SearchOutlined, FileExcelOutlined } from '@ant-design/icons';
import { getInvoices, type Invoice } from '../../api/invoiceApi';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  
  // Pagination & Filters state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      // Only search if 3+ chars or cleared
      if (searchTerm.length >= 3 || searchTerm === '') {
        setDebouncedSearch(searchTerm);
        setCurrentPage(1); // Reset to page 1 on new search
      }
    }, 800); // 0.8s delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchInvoices = async (page = 1, limit = 10, serialNumber = '', dates: [string, string] | null = null) => {
    setLoading(true);
    try {
      const response = await getInvoices({
        page,
        limit,
        serialNumber: serialNumber || undefined,
        startDate: dates ? dates[0] : undefined,
        endDate: dates ? dates[1] : undefined
      });
      if (response.success) {
        setInvoices(response.data.invoices);
        setTotal(response.data.pagination.totalResults);
      }
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch all records matching the current filter by setting a very high limit
      const response = await getInvoices({
        page: 1,
        limit: 100000, 
        serialNumber: debouncedSearch || undefined,
        startDate: dateRange ? dateRange[0] : undefined,
        endDate: dateRange ? dateRange[1] : undefined
      });

      if (response.success) {
        const allInvoices = response.data.invoices;
        
        // Define CSV Headers
        const headers = ['Invoice Number', 'Date', 'Vendor ID', 'Company Name', 'Total Amount', 'Source File', 'Ingested At'];
        
        // Map data to CSV rows
        const csvRows = allInvoices.map(inv => [
          inv.serialNumber || '',
          inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : 'N/A',
          inv.vendorId || '',
          `"${(inv.companyName || '').replace(/"/g, '""')}"`, // escape quotes for CSV
          inv.totalAmount || 0,
          inv.rawFileName || '',
          inv.ingestedAt ? new Date(inv.ingestedAt).toLocaleString() : ''
        ]);

        // Combine headers and rows
        const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        
        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `invoices_export_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Export failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(currentPage, pageSize, debouncedSearch, dateRange);
  }, [currentPage, pageSize, dateRange, debouncedSearch]);

  const handleDateChange = (dates: any, dateStrings: [string, string]) => {
    if (dates) {
      setDateRange(dateStrings);
    } else {
      setDateRange(null);
    }
    setCurrentPage(1);
  };

  const columns = [
    {
      title: 'Invoice Number',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Date',
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Vendor ID',
      dataIndex: 'vendorId',
      key: 'vendorId',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Company Name',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (text: string) => text || 'Unknown',
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => `$${(val || 0).toFixed(2)}`,
    },
    {
      title: 'Source File',
      dataIndex: 'rawFileName',
      key: 'rawFileName',
      render: (text: string) => (
        <Tooltip title={text}>
          <Space>
            <FileExcelOutlined style={{ color: '#52c41a' }} />
            {text.length > 20 ? text.substring(0, 20) + '...' : text}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Ingested At',
      dataIndex: 'ingestedAt',
      key: 'ingestedAt',
      render: (date: string) => new Date(date).toLocaleString(),
    }
  ];

  // Expanded rows state
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  // Automatically expand all rows if searching
  useEffect(() => {
    if (debouncedSearch && invoices.length > 0) {
      setExpandedRowKeys(invoices.map(inv => inv._id || inv.serialNumber));
    } else {
      setExpandedRowKeys([]);
    }
  }, [invoices, debouncedSearch]);

  // Expandable row for Invoice Items
  const expandedRowRender = (record: Invoice) => {
    const itemColumns = [
      { title: 'SKU', dataIndex: 'sku', key: 'sku' },
      { title: 'Product Name', dataIndex: 'productName', key: 'productName' },
      { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
      { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', render: (val: number) => `$${val.toFixed(2)}` },
      { title: 'Line Total', dataIndex: 'lineTotal', key: 'lineTotal', render: (val: number) => `$${val.toFixed(2)}` },
    ];

    // Highlight only the specific items that match the search
    let displayItems = record.items || [];
    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      const matchedItems = displayItems.filter(item => 
        (item.sku && item.sku.toLowerCase().includes(lowerSearch)) ||
        (item.productName && item.productName.toLowerCase().includes(lowerSearch))
      );
      // If items matched, only show those items. 
      // If none matched, it means the search matched the Invoice Number itself, so show all items.
      if (matchedItems.length > 0) {
        displayItems = matchedItems;
      }
    }

    return <Table columns={itemColumns} dataSource={displayItems} pagination={false} rowKey="sku" size="small" />;
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Invoice Records</Title>
          <Typography.Text type="secondary">View and filter all processed vendor invoices.</Typography.Text>
        </div>
      </div>

      <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Input
              placeholder="Search Invoice, SKU, or Product (min 3 chars)"
              allowClear
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 350 }}
            />
            <RangePicker onChange={handleDateChange} />
          </div>
          <Button type="primary" onClick={handleExport} icon={<FileExcelOutlined />}>Export CSV</Button>
        </div>

        <Table
          columns={columns}
          dataSource={invoices}
          rowKey={(record) => record._id || record.serialNumber}
          loading={loading}
          expandable={{ 
            expandedRowRender,
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys)
          }}
          scroll={{ x: 1000 }}
          pagination={false} // Disabled built-in pagination to use custom
          style={{ marginBottom: 24 }}
        />

        {/* Custom Pagination Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
          <Typography.Text type="secondary">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} entries
          </Typography.Text>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            showQuickJumper
            pageSizeOptions={['10', '20', '50', '100', '200', '500']}
            onChange={(page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            }}
          />
        </div>
      </Card>
    </div>
  );
};

export default Invoices;
