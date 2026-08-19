import React, { useState, useEffect } from 'react';
import { Card, Typography, Upload, Button, message, Steps, Divider, Select, Statistic, Row, Col, Alert } from 'antd';
import { InboxOutlined, CheckCircleOutlined, SyncOutlined, UploadOutlined, ShopOutlined } from '@ant-design/icons';
import { uploadInvoiceFile } from '../../api/invoiceApi';
import { getVendors, type Vendor } from '../../api/vendorApi';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const UploadInvoice: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Vendor state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string | undefined>(undefined);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  // Fetch vendors on mount
  useEffect(() => {
    const fetchVendors = async () => {
      setVendorsLoading(true);
      try {
        const response = await getVendors();
        if (response.success && response.data) {
          setVendors(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch vendors', error);
        message.error('Failed to load vendors. Please refresh.');
      } finally {
        setVendorsLoading(false);
      }
    };
    fetchVendors();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      message.warning('Please select a file first.');
      return;
    }
    if (!selectedVendor) {
      message.warning('Please select a vendor before uploading.');
      return;
    }

    setLoading(true);
    setCurrentStep(1);
    try {
      const response = await uploadInvoiceFile(selectedFile, selectedVendor);
      
      if (response.success) {
        setResult(response.data);
        setCurrentStep(2);
        message.success('Invoice uploaded and processed successfully!');
      } else {
        message.error(response.message || 'Upload failed');
        setCurrentStep(0);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error uploading file');
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  const selectedVendorName = vendors.find(v => v.id === selectedVendor)?.name;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Import Invoices</Title>
        <Text type="secondary">Select a vendor, then upload an Excel or CSV invoice for processing.</Text>
      </div>

      <Card>
        <Steps
          current={currentStep}
          items={[
            { title: 'Upload', icon: <UploadOutlined /> },
            { title: 'Processing Data', icon: <SyncOutlined spin={loading} /> },
            { title: 'Completed', icon: <CheckCircleOutlined /> },
          ]}
          style={{ marginBottom: 40 }}
        />

        {currentStep === 0 && (
          <div>
            {/* ── Vendor Selector ────────────────────────────── */}
            <Card
              variant="borderless"
              style={{
                background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)',
                border: '1px solid #91caff',
                borderRadius: 12,
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <ShopOutlined style={{ fontSize: 22, color: '#1890ff' }} />
                <div>
                  <Title level={5} style={{ margin: 0 }}>Select Vendor</Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Choose which vendor this invoice belongs to before uploading.
                  </Text>
                </div>
              </div>
              <Select
                placeholder="Choose a vendor..."
                value={selectedVendor}
                onChange={(value) => setSelectedVendor(value)}
                loading={vendorsLoading}
                size="large"
                style={{ width: '100%' }}
                options={vendors.map((v) => ({
                  value: v.id,
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShopOutlined style={{ color: '#1890ff' }} />
                      <span style={{ fontWeight: 500 }}>{v.name}</span>
                      {v.invoices > 0 && (
                        <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 'auto' }}>
                          {v.invoices} invoices
                        </span>
                      )}
                    </div>
                  ),
                }))}
              />
            </Card>

            {!selectedVendor && (
              <Alert
                message="Vendor Required"
                description="You must select a vendor above before uploading an invoice file."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            {/* ── File Upload Area ──────────────────────────── */}
            <Dragger
              name="file"
              multiple={false}
              disabled={!selectedVendor}
              beforeUpload={(file) => {
                setSelectedFile(file);
                message.info(`${file.name} selected for ${selectedVendorName || 'vendor'}. Click "Upload & Process" to ingest.`);
                return false; // Prevent default upload behavior
              }}
              onRemove={() => {
                setSelectedFile(null);
              }}
              fileList={selectedFile ? [selectedFile as any] : []}
              style={{ padding: 40, opacity: selectedVendor ? 1 : 0.5 }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#1890ff', fontSize: 48 }} />
              </p>
              <Title level={4}>Click or drag Excel/CSV invoice file to this area</Title>
              <Text type="secondary">
                {selectedVendor
                  ? `Upload invoice for ${selectedVendorName}.`
                  : 'Please select a vendor first.'}
              </Text>
            </Dragger>

            <Divider />

            <div style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                size="large"
                onClick={handleUpload}
                loading={loading}
                icon={<UploadOutlined />}
                disabled={!selectedFile || !selectedVendor}
              >
                Upload & Process
              </Button>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Title level={3}>Backend is processing file...</Title>
            <Paragraph>Reading file, detecting columns, and running validation rules.</Paragraph>
            <Button type="primary" loading>Processing...</Button>
          </div>
        )}

        {currentStep === 2 && result && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
            <Title level={2}>Ingestion Complete!</Title>
            
            <Card style={{ background: '#f6ffed', borderColor: '#b7eb8f', maxWidth: 600, margin: '0 auto', textAlign: 'left' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="Total Files Processed" value={result.totalFiles || 1} />
                </Col>
                <Col span={8}>
                  <Statistic title="Ingested" value={result.ingested || 0} styles={{ content: { color: '#3f8600' } }} />
                </Col>
                <Col span={8}>
                  <Statistic title="Skipped / Errors" value={(result.skipped || 0) + (result.errors?.length || 0)} styles={{ content: { color: '#cf1322' } }} />
                </Col>
              </Row>
            </Card>

            <Divider />
            <Button type="primary" size="large" onClick={() => window.location.href = '/invoices'}>
              View Invoice Data
            </Button>
            <Button size="large" style={{ marginLeft: 16 }} onClick={() => { setCurrentStep(0); setSelectedFile(null); setResult(null); }}>
              Upload Another Invoice
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UploadInvoice;
