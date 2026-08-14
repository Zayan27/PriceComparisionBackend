import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Tag, Button, Drawer, Space } from 'antd';
import { EyeOutlined, ShopOutlined } from '@ant-design/icons';
import { getVendors, getVendorProducts, type Vendor, type VendorProduct } from '../../api/vendorApi';

const { Title, Text } = Typography;

const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);

  // Drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorProducts, setVendorProducts] = useState<VendorProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await getVendors();
      if (response.success) {
        setVendors(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendors', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleViewDetails = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDrawerVisible(true);
    setProductsLoading(true);
    try {
      const response = await getVendorProducts(vendor.id, 1, 100);
      if (response.success && response.data) {
        setVendorProducts(response.data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendor products', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const columns = [
    { title: 'Vendor Name', dataIndex: 'name', key: 'name', render: (text: string) => <strong>{text}</strong> },
    { title: 'Total Invoices', dataIndex: 'invoices', key: 'invoices' },
    { title: 'Total Items Supplied', dataIndex: 'items', key: 'items' },
    { title: 'Total Spend', dataIndex: 'totalValue', key: 'totalValue', render: (val: number) => `$${(val || 0).toLocaleString()}` },
    { 
      title: 'Action', 
      key: 'action', 
      render: (_: any, record: Vendor) => (
        <Button type="primary" ghost icon={<EyeOutlined />} onClick={() => handleViewDetails(record)}>
          View Catalog
        </Button> 
      )
    }
  ];

  const productColumns = [
    {
      title: 'Product (SKU)',
      dataIndex: 'sku',
      key: 'sku',
      render: (text: string, record: VendorProduct) => (
        <div>
          <strong style={{ fontSize: '14px' }}>{record.productName || 'Unknown Product'}</strong>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{text}</Text>
        </div>
      )
    },
    {
      title: 'Latest Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (val: number) => <span style={{ color: '#1890ff', fontWeight: 500 }}>${val.toFixed(2)}</span>
    },
    {
      title: 'Total Purchased',
      dataIndex: 'purchaseCount',
      key: 'purchaseCount',
    },
    {
      title: 'Last Invoice Date',
      dataIndex: 'lastInvoiceDate',
      key: 'lastInvoiceDate',
      render: (val: string) => new Date(val).toLocaleDateString()
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Vendor Management</Title>
        <Typography.Text type="secondary">Track vendor performance and review specific product catalogs.</Typography.Text>
      </div>

      <Card variant="borderless" style={{ borderRadius: 8 }}>
        <Table 
          columns={columns} 
          dataSource={vendors} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      <Drawer
        title={
          <Space>
            <ShopOutlined style={{ color: '#722ed1', fontSize: 20 }} />
            <span>{selectedVendor?.name} - Catalog & Deals</span>
          </Space>
        }
        size="large"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedVendor && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <Title level={4} style={{ margin: 0 }}>Products Supplied ({vendorProducts.length})</Title>
              <Text type="secondary">The most recent pricing deals parsed from this vendor's invoices.</Text>
            </div>

            <Table
              columns={productColumns}
              dataSource={vendorProducts}
              rowKey="sku"
              loading={productsLoading}
              pagination={{ pageSize: 10 }}
              size="middle"
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Vendors;
