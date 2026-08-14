import React, { useEffect, useState, useMemo } from 'react';
import { Card, Typography, Row, Col, DatePicker, Select, Space, Spin } from 'antd';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { getPriceComparison, type PriceComparisonItem } from '../../api/comparisonApi';
import { getInvoices, type Invoice } from '../../api/invoiceApi';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96'];

const Analysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [productsData, setProductsData] = useState<PriceComparisonItem[]>([]);
  const [invoicesData, setInvoicesData] = useState<Invoice[]>([]);
  
  // Filters
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [selectedProductSku, setSelectedProductSku] = useState<string | null>(null);

  const fetchData = async (dates?: [string, string] | null) => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (dates) {
        params.startDate = dates[0];
        params.endDate = dates[1];
      }
      
      // Fetch aggregations
      const compRes = await getPriceComparison(params);
      if (compRes.success && compRes.data) {
        setProductsData(compRes.data.results || []);
        if (compRes.data.results.length > 0 && !selectedProductSku) {
          setSelectedProductSku(compRes.data.results[0].sku);
        }
      }

      // Fetch raw invoices for timeline
      const invRes = await getInvoices({ limit: 1000, ...(dates && { startDate: dates[0], endDate: dates[1] }) });
      if (invRes.success) {
        setInvoicesData(invRes.data.invoices || []);
      }

    } catch (error) {
      console.error("Failed to fetch analytics data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange]);

  const handleDateChange = (dates: any, dateStrings: [string, string]) => {
    setDateRange(dates ? dateStrings : null);
  };

  // --- Derived Data for Charts ---

  // 1. Variance Bar Chart Data (Top 10 by Variance)
  const varianceData = useMemo(() => {
    return productsData
      .map(p => ({
        product: p.productName || p.sku,
        lowest: p.priceSummary.lowest || 0,
        variance: (p.priceSummary.highest || 0) - (p.priceSummary.lowest || 0)
      }))
      .filter(d => d.variance > 0)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 10);
  }, [productsData]);

  // 2. Vendor Spend Pie Chart Data
  const pieData = useMemo(() => {
    const spendMap: Record<string, number> = {};
    invoicesData.forEach(inv => {
      const v = inv.vendorId || 'Unknown';
      spendMap[v] = (spendMap[v] || 0) + (inv.totalAmount || 0);
    });
    return Object.entries(spendMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [invoicesData]);

  // 3. Line Chart Data (Price over time for selected product)
  const lineData = useMemo(() => {
    if (!selectedProductSku || invoicesData.length === 0) return [];
    
    // Group item prices by Month and Vendor
    const timelineMap: Record<string, any> = {};
    const vendorsSet = new Set<string>();

    invoicesData.forEach(inv => {
      if (!inv.invoiceDate || !inv.items) return;
      const dateStr = new Date(inv.invoiceDate).toISOString().slice(0, 7); // YYYY-MM
      
      inv.items.forEach(item => {
        if (item.sku === selectedProductSku) {
          const v = inv.vendorId || 'Unknown';
          vendorsSet.add(v);
          
          if (!timelineMap[dateStr]) timelineMap[dateStr] = { date: dateStr };
          
          // Average if multiple in same month
          if (timelineMap[dateStr][v]) {
            timelineMap[dateStr][v] = (timelineMap[dateStr][v] + item.unitPrice) / 2;
          } else {
            timelineMap[dateStr][v] = item.unitPrice;
          }
        }
      });
    });

    return Object.values(timelineMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [selectedProductSku, invoicesData]);

  // Get dynamic vendor keys for the Line chart
  const activeVendors = useMemo(() => {
    if (lineData.length === 0) return [];
    const keys = new Set<string>();
    lineData.forEach(d => Object.keys(d).forEach(k => k !== 'date' && keys.add(k)));
    return Array.from(keys);
  }, [lineData]);


  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Advanced Analysis</Title>
          <Typography.Text type="secondary">Deep dive into price variances, historical trends, and spend distribution.</Typography.Text>
        </div>
        <Space>
          <RangePicker onChange={handleDateChange} />
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={16}>
              <Card variant="borderless" title="Product Price Trend (Vendor Comparison)" style={{ borderRadius: 8, height: '100%' }}>
                <div style={{ marginBottom: 16 }}>
                  <Select 
                    value={selectedProductSku} 
                    onChange={setSelectedProductSku} 
                    style={{ width: 300 }}
                    showSearch
                    optionFilterProp="children"
                  >
                    {productsData.map(p => (
                      <Option key={p.sku} value={p.sku}>{p.productName || p.sku}</Option>
                    ))}
                  </Select>
                </div>
                <div style={{ height: 300 }}>
                  {lineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis prefix="$" />
                        <RechartsTooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                        <Legend />
                        {activeVendors.map((vendor, i) => (
                          <Line key={vendor} type="monotone" dataKey={vendor} stroke={COLORS[i % COLORS.length]} strokeWidth={2} activeDot={{ r: 8 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#bfbfbf' }}>
                      No timeline data available for this product in the selected date range.
                    </div>
                  )}
                </div>
              </Card>
            </Col>
            
            <Col xs={24} lg={8}>
              <Card variant="borderless" title="Total Spend by Vendor" style={{ borderRadius: 8, height: '100%' }}>
                <div style={{ height: 300 }}>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#bfbfbf' }}>
                      No spend data available.
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card variant="borderless" title="Top Products by Price Variance (Savings Opportunities)" style={{ borderRadius: 8 }}>
                <div style={{ height: 350 }}>
                  {varianceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={varianceData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" prefix="$" />
                        <YAxis dataKey="product" type="category" width={150} tick={{ fontSize: 12 }} />
                        <RechartsTooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="lowest" stackId="a" fill="#52c41a" name="Lowest Price" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="variance" stackId="a" fill="#faad14" name="Price Variance (Potential Savings)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#bfbfbf' }}>
                      No variance data available.
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Analysis;
