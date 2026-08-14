import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Alert, Tag, Button, Spin } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { getVendors, type Vendor } from '../../api/vendorApi';

const { Title } = Typography;

const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);

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

  const columns = [
    { title: 'Vendor Name', dataIndex: 'name', key: 'name', render: (text: string) => <strong>{text}</strong> },
    { title: 'Total Invoices', dataIndex: 'invoices', key: 'invoices' },
    { title: 'Total Items Supplied', dataIndex: 'items', key: 'items' },
    { title: 'Total Spend', dataIndex: 'totalValue', key: 'totalValue', render: (val: number) => `$${(val || 0).toLocaleString()}` },
    { 
      title: 'Action', 
      key: 'action', 
      render: () => <Button type="link" icon={<EyeOutlined />}>View Details</Button> 
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Vendor Management</Title>
        <Typography.Text type="secondary">Track vendor performance and historical spend metrics.</Typography.Text>
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
    </div>
  );
};

export default Vendors;
