import React, { useEffect, useState, useCallback } from 'react';
import { Table, Card, Typography, Input, Button, Tag, Space, Drawer, Row, Col, Statistic, List, Avatar, DatePicker, Select, Tooltip, message } from 'antd';
import { SearchOutlined, ShopOutlined, TrophyOutlined, BarChartOutlined, FilterOutlined, FileExcelOutlined, FilePdfOutlined, DownloadOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { getPriceComparison, type PriceComparisonItem } from '../../api/comparisonApi';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

/** The 4 configured vendors — column order in the matrix */
const VENDORS = [
  { key: 'ss_distro', name: 'SS Distro', color: '#1890ff' },
  { key: 'flw_tx', name: 'FLW TX', color: '#52c41a' },
  { key: 'rave', name: 'RAVE', color: '#faad14' },
  { key: 'touchtell', name: 'TouchTell', color: '#722ed1' },
];

/** Escape regex metacharacters so they can't break server-side queries */
function sanitizeSearch(value: string): string {
  // Strip or escape problematic characters for safety
  return value.replace(/[.*+?^${}()|[\]\\]/g, '');
}

/** Get vendor price from breakdown */
function getVendorPrice(item: PriceComparisonItem, vendorKey: string): number | null {
  const entry = item.vendorBreakdown?.find((v) => v.vendorId === vendorKey);
  return entry ? (entry.latestUnitPrice ?? entry.latestPrice ?? null) : null;
}

const PriceComparison: React.FC = () => {
  const [data, setData] = useState<PriceComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // Date filter state
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // Pagination state
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  
  // Drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PriceComparisonItem | null>(null);

  const fetchComparison = useCallback(async (page = 1, limit = 15, search?: string, dates?: [string, string] | null) => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (search) {
        // Sanitize to avoid regex injection — use the unified 'search' param
        params.search = sanitizeSearch(search);
      }
      if (dates) {
        params.startDate = dates[0];
        params.endDate = dates[1];
      }

      const response = await getPriceComparison(params);
      if (response.success && response.data) {
        setData(response.data.results || []);
        setTotal(response.data.pagination?.totalResults || 0);
      }
    } catch (error) {
      console.error('Failed to fetch price comparison', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComparison(currentPage, pageSize, searchText, dateRange);
  }, [currentPage, pageSize, fetchComparison]);

  const handleSearch = (value: string) => {
    const sanitized = sanitizeSearch(value);
    setSearchText(sanitized);
    setCurrentPage(1);
    fetchComparison(1, pageSize, sanitized, dateRange);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    // Debounced instant search on typing
    const sanitized = sanitizeSearch(value);
    if (sanitized.length === 0) {
      setCurrentPage(1);
      fetchComparison(1, pageSize, '', dateRange);
    }
  };

  const handleDateChange = (_dates: any, dateStrings: [string, string]) => {
    const range = _dates ? dateStrings : null;
    setDateRange(range);
    setCurrentPage(1);
    fetchComparison(1, pageSize, searchText, range);
  };

  const handleCompareClick = (record: PriceComparisonItem) => {
    setSelectedProduct(record);
    setDrawerVisible(true);
  };

  const handleExportExcel = () => {
    if (data.length === 0) {
      message.warning('No data to export.');
      return;
    }
    exportToExcel(data);
    message.success('Excel file downloaded!');
  };

  const handleExportPDF = () => {
    if (!selectedProduct) return;
    exportToPDF(selectedProduct);
    message.success('PDF report downloaded!');
  };

  // ─── Table Columns: Fixed 4-Vendor Matrix ─────────────────────────
  const columns: any[] = [
    {
      title: 'Product',
      dataIndex: 'sku',
      key: 'sku',
      fixed: 'left' as const,
      width: 240,
      render: (text: string, record: PriceComparisonItem) => (
        <div>
          <strong style={{ fontSize: '14px', lineHeight: 1.3 }}>{record.productName || 'Unknown Product'}</strong>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{text}</Text>
        </div>
      ),
    },
    // Dynamically add a column for each of the 4 vendors
    ...VENDORS.map((vendor) => ({
      title: (
        <Tooltip title={vendor.name}>
          <div style={{ textAlign: 'center' }}>
            <ShopOutlined style={{ color: vendor.color, marginRight: 4 }} />
            <span style={{ fontWeight: 600 }}>{vendor.name}</span>
          </div>
        </Tooltip>
      ),
      key: vendor.key,
      width: 130,
      align: 'center' as const,
      render: (_: any, record: PriceComparisonItem) => {
        const price = getVendorPrice(record, vendor.key);
        if (price == null) {
          return <Text type="secondary" style={{ fontSize: 13 }}>—</Text>;
        }
        const isBest = price === record.priceSummary?.lowest && record.vendorCount > 1;
        return (
          <span style={{
            color: isBest ? '#52c41a' : '#262626',
            fontWeight: isBest ? 700 : 500,
            fontSize: '14px',
          }}>
            ${price.toFixed(2)}
            {isBest && (
              <TrophyOutlined style={{ color: '#faad14', marginLeft: 4, fontSize: 12 }} />
            )}
          </span>
        );
      },
    })),
    {
      title: 'Min',
      key: 'min',
      width: 90,
      align: 'center' as const,
      render: (_: any, record: PriceComparisonItem) => (
        <span style={{ color: '#52c41a', fontWeight: 600 }}>
          ${record.priceSummary?.lowest?.toFixed(2) || '—'}
        </span>
      ),
    },
    {
      title: 'Max',
      key: 'max',
      width: 90,
      align: 'center' as const,
      render: (_: any, record: PriceComparisonItem) => (
        <span style={{ color: '#cf1322', fontWeight: 600 }}>
          ${record.priceSummary?.highest?.toFixed(2) || '—'}
        </span>
      ),
    },
    {
      title: 'Avg',
      key: 'avg',
      width: 90,
      align: 'center' as const,
      render: (_: any, record: PriceComparisonItem) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          ${record.priceSummary?.average?.toFixed(2) || '—'}
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right' as const,
      width: 110,
      render: (_: any, record: PriceComparisonItem) => (
        <Button 
          type="primary" 
          icon={<BarChartOutlined />} 
          onClick={() => handleCompareClick(record)}
          size="small"
        >
          Compare
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Vendor Price Comparison</Title>
          <Text type="secondary">Compare prices across SS Distro, FLW TX, RAVE, and TouchTell for every product.</Text>
        </div>
        <Button
          type="primary"
          icon={<FileExcelOutlined />}
          onClick={handleExportExcel}
          style={{ background: '#52c41a', borderColor: '#52c41a' }}
          size="large"
        >
          Export to Excel
        </Button>
      </div>

      <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <Input.Search
            placeholder="Search by SKU or Product Name"
            allowClear
            value={searchText}
            onChange={handleSearchInputChange}
            onSearch={handleSearch}
            style={{ width: 340 }}
            enterButton={<SearchOutlined />}
          />
          <Space>
            <FilterOutlined style={{ color: '#bfbfbf' }} />
            <RangePicker onChange={handleDateChange} placeholder={['Start Date', 'End Date']} />
          </Space>
          {total > 0 && (
            <Text type="secondary" style={{ marginLeft: 'auto' }}>
              {total} product{total !== 1 ? 's' : ''} found
            </Text>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="sku"
          loading={loading}
          scroll={{ x: 1200 }}
          size="middle"
          pagination={{ 
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '25', '50'],
            showTotal: (t, range) => `${range[0]}–${range[1]} of ${t}`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            }
          }}
        />
      </Card>

      {/* ─── Vendor Comparison Drawer ──────────────────────────────── */}
      <Drawer
        title={
          <Space>
            <TrophyOutlined style={{ color: '#faad14' }} />
            <span>Detailed Vendor Analysis</span>
          </Space>
        }
        size="large"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={handleExportPDF}
            danger
          >
            Export to PDF
          </Button>
        }
      >
        {selectedProduct && (
          <div>
            <Title level={4}>{selectedProduct.productName || selectedProduct.sku}</Title>
            <Text type="secondary">SKU: {selectedProduct.sku}</Text>
            
            <Row gutter={16} style={{ marginTop: 24, marginBottom: 24 }}>
              <Col span={8}>
                <Statistic title="Best Price" value={selectedProduct.priceSummary?.lowest || 0} precision={2} prefix="$" styles={{ content: { color: '#52c41a', fontWeight: 'bold' } }} />
              </Col>
              <Col span={8}>
                <Statistic title="Highest Price" value={selectedProduct.priceSummary?.highest || 0} precision={2} prefix="$" styles={{ content: { color: '#cf1322' } }} />
              </Col>
              <Col span={8}>
                <Statistic title="Average" value={selectedProduct.priceSummary?.average || 0} precision={2} prefix="$" styles={{ content: { color: '#1890ff' } }} />
              </Col>
            </Row>

            <Card variant="borderless" style={{ background: '#f5f5f5', marginBottom: 24, borderRadius: 12 }}>
              <Title level={5} style={{ marginTop: 0 }}>Visual Price Comparison</Title>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      VENDORS.map((v) => {
                        const entry = selectedProduct.vendorBreakdown?.find((vb) => vb.vendorId === v.key);
                        return {
                          vendorName: v.name,
                          latestPrice: entry ? (entry.latestUnitPrice ?? entry.latestPrice ?? 0) : 0,
                          hasData: !!entry,
                          color: v.color,
                        };
                      })
                    }
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="vendorName" tick={{ fontSize: 12 }} />
                    <YAxis prefix="$" />
                    <RechartsTooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
                    <Bar dataKey="latestPrice" name="Price" radius={[4, 4, 0, 0]}>
                      {VENDORS.map((v, index) => {
                        const entry = selectedProduct.vendorBreakdown?.find((vb) => vb.vendorId === v.key);
                        const price = entry ? (entry.latestUnitPrice ?? entry.latestPrice ?? 0) : 0;
                        const isBest = price === selectedProduct.priceSummary?.lowest && price > 0;
                        return <Cell key={`cell-${index}`} fill={isBest ? '#52c41a' : v.color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Title level={5}>Vendor Quotes ({selectedProduct.vendorCount || 0})</Title>
            <List
              itemLayout="horizontal"
              dataSource={
                VENDORS.map((v) => {
                  const entry = selectedProduct.vendorBreakdown?.find((vb) => vb.vendorId === v.key);
                  return {
                    vendorId: v.key,
                    vendorName: v.name,
                    vendorColor: v.color,
                    latestPrice: entry?.latestPrice ?? null,
                    latestUnitPrice: entry?.latestUnitPrice ?? null,
                    lastInvoiceDate: entry?.lastInvoiceDate ?? null,
                    invoiceCount: entry?.invoiceCount ?? 0,
                    hasData: !!entry,
                  };
                })
              }
              renderItem={(vendor) => {
                const price = vendor.latestUnitPrice ?? vendor.latestPrice;
                const isBestPrice = price != null && price === selectedProduct.priceSummary?.lowest && selectedProduct.vendorCount > 1;
                
                return (
                  <List.Item
                    style={{ 
                      background: isBestPrice ? '#f6ffed' : vendor.hasData ? 'white' : '#fafafa', 
                      border: isBestPrice ? '1px solid #b7eb8f' : '1px solid #f0f0f0',
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 12,
                      opacity: vendor.hasData ? 1 : 0.7,
                    }}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<ShopOutlined />} style={{ backgroundColor: vendor.hasData ? vendor.vendorColor : '#d9d9d9' }} />}
                      title={
                        <Space>
                          <strong>{vendor.vendorName}</strong>
                          {isBestPrice && <Tag color="success">Best Deal</Tag>}
                          {!vendor.hasData && <Tag color="default">No Data</Tag>}
                        </Space>
                      }
                      description={
                        vendor.hasData && vendor.lastInvoiceDate
                          ? `Last Invoice: ${new Date(vendor.lastInvoiceDate).toLocaleDateString()} · ${vendor.invoiceCount} invoice(s)`
                          : 'No invoices from this vendor for this product'
                      }
                    />
                    <div style={{ textAlign: 'right' }}>
                      <Title level={4} style={{ margin: 0, color: !vendor.hasData ? '#d9d9d9' : isBestPrice ? '#52c41a' : 'inherit' }}>
                        {price != null ? `$${price.toFixed(2)}` : '—'}
                      </Title>
                      {vendor.hasData && <Text type="secondary">per unit</Text>}
                    </div>
                  </List.Item>
                );
              }}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PriceComparison;
