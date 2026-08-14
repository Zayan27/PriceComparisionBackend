import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, DatePicker, Input, Button, Space, Tag, Tooltip } from 'antd';
import { SearchOutlined, FileExcelOutlined, EyeOutlined } from '@ant-design/icons';
import { getInvoices, type Invoice, type InvoiceItem } from '../../api/invoiceApi';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  
  // Pagination & Filters state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchSerial, setSearchSerial] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

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

  useEffect(() => {
    fetchInvoices(currentPage, pageSize, searchSerial, dateRange);
  }, [currentPage, pageSize, dateRange]);

  const handleSearch = (value: string) => {
    setSearchSerial(value);
    setCurrentPage(1); // reset to page 1 on search
  };

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

  // Expandable row for Invoice Items
  const expandedRowRender = (record: Invoice) => {
    const itemColumns = [
      { title: 'SKU', dataIndex: 'sku', key: 'sku' },
      { title: 'Product Name', dataIndex: 'productName', key: 'productName' },
      { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
      { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', render: (val: number) => `$${val.toFixed(2)}` },
      { title: 'Line Total', dataIndex: 'lineTotal', key: 'lineTotal', render: (val: number) => `$${val.toFixed(2)}` },
    ];
    return <Table columns={itemColumns} dataSource={record.items || []} pagination={false} rowKey="sku" size="small" />;
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
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Input.Search
            placeholder="Search by Invoice Number"
            allowClear
            onSearch={handleSearch}
            style={{ width: 250 }}
          />
          <RangePicker onChange={handleDateChange} />
          <Button type="default" icon={<SearchOutlined />}>Advanced Filters</Button>
        </div>

        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="_id"
          loading={loading}
          expandable={{ expandedRowRender }}
          scroll={{ x: 1000 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>
    </div>
  );
};

export default Invoices;
