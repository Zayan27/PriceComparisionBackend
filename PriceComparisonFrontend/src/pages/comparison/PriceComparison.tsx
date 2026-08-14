import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Input, Button, Tag, Space, Drawer, Row, Col, Statistic, List, Avatar, DatePicker, Select } from 'antd';
import { SearchOutlined, FallOutlined, RiseOutlined, ShopOutlined, TrophyOutlined, BarChartOutlined, FilterOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { getPriceComparison, type PriceComparisonItem } from '../../api/comparisonApi';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const PriceComparison: React.FC = () => {
  const [data, setData] = useState<PriceComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');
  
  // Date filter state
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [minQuotes, setMinQuotes] = useState<number | undefined>(undefined);

  // Pagination state
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PriceComparisonItem | null>(null);

  const fetchComparison = async (page = 1, limit = 10, sku?: string, dates?: [string, string] | null, quotes?: number) => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (sku) params.sku = sku;
      if (dates) {
        params.startDate = dates[0];
        params.endDate = dates[1];
      }
      if (quotes) {
        params.minQuotes = quotes;
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
  };

  useEffect(() => {
    fetchComparison(currentPage, pageSize, skuSearch, dateRange, minQuotes);
  }, [currentPage, pageSize]);

  const handleSearch = (value: string) => {
    setSkuSearch(value);
    setCurrentPage(1);
    fetchComparison(1, pageSize, value, dateRange, minQuotes);
  };

  const handleDateChange = (dates: any, dateStrings: [string, string]) => {
    const range = dates ? dateStrings : null;
    setDateRange(range);
    setCurrentPage(1);
    fetchComparison(1, pageSize, skuSearch, range, minQuotes);
  };

  const handleQuotesChange = (value: number | undefined) => {
    setMinQuotes(value);
    setCurrentPage(1);
    fetchComparison(1, pageSize, skuSearch, dateRange, value);
  };

  const handleCompareClick = (record: PriceComparisonItem) => {
    setSelectedProduct(record);
    setDrawerVisible(true);
  };

  const columns = [
    {
      title: 'Product (SKU)',
      dataIndex: 'sku',
      key: 'sku',
      render: (text: string, record: PriceComparisonItem) => (
        <div>
          <strong style={{ fontSize: '15px' }}>{record.productName || 'Unknown Product'}</strong>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{text}</Text>
        </div>
      ),
    },
    {
      title: 'Vendors',
      dataIndex: 'vendorCount',
      key: 'vendorCount',
      render: (val: number) => <Tag color="blue">{val} Quotes</Tag>
    },
    {
      title: 'Best Price',
      key: 'lowestPrice',
      render: (_: any, record: PriceComparisonItem) => (
        <span style={{ color: '#52c41a', fontWeight: 600, fontSize: '15px' }}>
          ${record.priceSummary?.lowest?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      title: 'Highest Price',
      key: 'highestPrice',
      render: (_: any, record: PriceComparisonItem) => (
        <span style={{ color: '#cf1322' }}>
          ${record.priceSummary?.highest?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      title: 'Variance',
      key: 'variance',
      render: (_: any, record: PriceComparisonItem) => {
        const lowest = record.priceSummary?.lowest || 0;
        const highest = record.priceSummary?.highest || 0;
        const variance = highest - lowest;
        return `$${variance.toFixed(2)}`;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: PriceComparisonItem) => (
        <Button 
          type="primary" 
          icon={<BarChartOutlined />} 
          onClick={() => handleCompareClick(record)}
        >
          Compare
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Vendor Price Comparison</Title>
        <Typography.Text type="secondary">Identify the most cost-effective vendors for every product with date filters.</Typography.Text>
      </div>

      <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <Input.Search
            placeholder="Search by SKU"
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Space>
            <FilterOutlined style={{ color: '#bfbfbf' }} />
            <RangePicker onChange={handleDateChange} placeholder={['Start Date', 'End Date']} />
            <Select 
              placeholder="Min Quotes" 
              allowClear 
              style={{ width: 150 }}
              onChange={handleQuotesChange}
            >
              <Option value={1}>1+ Quotes</Option>
              <Option value={2}>2+ Quotes</Option>
              <Option value={3}>3+ Quotes</Option>
              <Option value={5}>5+ Quotes</Option>
            </Select>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="sku"
          loading={loading}
          pagination={{ 
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            }
          }}
        />
      </Card>

      {/* Vendor Comparison Drawer */}
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
                <Statistic title="Variance" value={(selectedProduct.priceSummary?.highest || 0) - (selectedProduct.priceSummary?.lowest || 0)} precision={2} prefix="$" />
              </Col>
            </Row>

            <Card variant="borderless" style={{ background: '#f5f5f5', marginBottom: 24 }}>
              <Title level={5} style={{ marginTop: 0 }}>Visual Price Comparison</Title>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedProduct.vendorBreakdown || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="vendorName" tick={{ fontSize: 12 }} />
                    <YAxis prefix="$" />
                    <RechartsTooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
                    <Bar dataKey="latestPrice" name="Price" radius={[4, 4, 0, 0]}>
                      {(selectedProduct.vendorBreakdown || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.latestPrice === selectedProduct.priceSummary.lowest ? '#52c41a' : '#1890ff'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Title level={5}>Vendor Quotes ({selectedProduct.vendorCount || 0})</Title>
            <List
              itemLayout="horizontal"
              dataSource={[...(selectedProduct.vendorBreakdown || [])].sort((a, b) => a.latestPrice - b.latestPrice)}
              renderItem={vendor => {
                const isBestPrice = vendor.latestPrice === selectedProduct.priceSummary?.lowest;
                return (
                  <List.Item
                    style={{ 
                      background: isBestPrice ? '#f6ffed' : 'white', 
                      border: isBestPrice ? '1px solid #b7eb8f' : '1px solid #f0f0f0',
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 12
                    }}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<ShopOutlined />} style={{ backgroundColor: isBestPrice ? '#52c41a' : '#bfbfbf' }} />}
                      title={
                        <Space>
                          <strong>{vendor.vendorName || vendor.vendorId}</strong>
                          {isBestPrice && <Tag color="success">Best Deal</Tag>}
                        </Space>
                      }
                      description={`Last Invoice Date: ${new Date(vendor.lastInvoiceDate).toLocaleDateString()}`}
                    />
                    <div style={{ textAlign: 'right' }}>
                      <Title level={4} style={{ margin: 0, color: isBestPrice ? '#52c41a' : 'inherit' }}>
                        ${vendor.latestPrice?.toFixed(2)}
                      </Title>
                      <Text type="secondary">per unit</Text>
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
