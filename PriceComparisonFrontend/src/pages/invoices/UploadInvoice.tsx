import React, { useState } from 'react';
import { Card, Typography, Upload, Button, message, Steps, Divider, Alert, Statistic, Row, Col } from 'antd';
import { InboxOutlined, CheckCircleOutlined, SyncOutlined, UploadOutlined } from '@ant-design/icons';
import { uploadInvoiceFile } from '../../api/invoiceApi';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const UploadInvoice: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!selectedFile) {
      message.warning('Please select a file first.');
      return;
    }

    setLoading(true);
    setCurrentStep(1);
    try {
      const response = await uploadInvoiceFile(selectedFile);
      
      if (response.success) {
        setResult(response.data);
        setCurrentStep(2);
        message.success('Invoice uploaded and processed successfully!');
      } else {
        message.error('Upload failed');
        setCurrentStep(0);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error uploading file');
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Import Invoices</Title>
        <Text type="secondary">Upload Excel or CSV invoices to the backend for processing.</Text>
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
            <Dragger
              name="file"
              multiple={false}
              beforeUpload={(file) => {
                setSelectedFile(file);
                message.info(`${file.name} selected. Click "Upload & Process" to ingest.`);
                return false; // Prevent default upload behavior
              }}
              onRemove={() => {
                setSelectedFile(null);
              }}
              fileList={selectedFile ? [selectedFile as any] : []}
              style={{ padding: 40 }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#1890ff', fontSize: 48 }} />
              </p>
              <Title level={4}>Click or drag Excel/CSV invoice file to this area</Title>
              <Text type="secondary">
                Upload a single invoice file for ingestion.
              </Text>
            </Dragger>

            <Divider />

            <div style={{ textAlign: 'center' }}>
              <Button type="primary" size="large" onClick={handleUpload} loading={loading} icon={<UploadOutlined />} disabled={!selectedFile}>
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
