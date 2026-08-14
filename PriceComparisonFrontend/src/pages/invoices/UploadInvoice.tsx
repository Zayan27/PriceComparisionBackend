import React, { useState } from 'react';
import { Card, Typography, Upload, Button, message, Steps, Divider, Alert, Statistic, Row, Col } from 'antd';
import { InboxOutlined, CheckCircleOutlined, SyncOutlined, DatabaseOutlined, UploadOutlined } from '@ant-design/icons';
import { ingestDirectory } from '../../api/invoiceApi';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const UploadInvoice: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleIngest = async () => {
    setLoading(true);
    setCurrentStep(1);
    try {
      // Properly hit the POST API to trigger batch ingestion
      const response = await ingestDirectory();
      
      if (response.success) {
        setResult(response.data);
        setCurrentStep(2);
        message.success('Backend successfully processed invoices!');
      } else {
        message.error('Ingestion failed');
        setCurrentStep(0);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error triggering backend ingestion');
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Import Invoices</Title>
        <Text type="secondary">Process Excel invoices using the backend ingestion service.</Text>
      </div>

      <Card>
        <Steps
          current={currentStep}
          items={[
            { title: 'Upload & Trigger', icon: <UploadOutlined /> },
            { title: 'Processing Data', icon: <SyncOutlined spin={loading} /> },
            { title: 'Completed', icon: <CheckCircleOutlined /> },
          ]}
          style={{ marginBottom: 40 }}
        />

        {currentStep === 0 && (
          <div>
            <Alert
              title="Backend Architecture Note"
              description="Your backend currently supports server-side directory batch ingestion rather than single file uploads via the browser. Clicking the button below will trigger the backend's POST /api/invoices/ingest-directory API."
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
            
            <Dragger
              name="file"
              multiple={false}
              beforeUpload={() => {
                message.info('File selected. Click "Trigger Backend Processing" to ingest.');
                return false; // Prevent default upload behavior
              }}
              style={{ padding: 40 }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#1890ff', fontSize: 48 }} />
              </p>
              <Title level={4}>Click or drag Excel invoice file to this area</Title>
              <Text type="secondary">
                Support for a single or bulk upload. Strictly prohibited from uploading company data or other banned files.
              </Text>
            </Dragger>

            <Divider />

            <div style={{ textAlign: 'center' }}>
              <Button type="primary" size="large" onClick={handleIngest} loading={loading} icon={<DatabaseOutlined />}>
                Trigger Backend Processing
              </Button>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Title level={3}>Backend is processing files...</Title>
            <Paragraph>Reading Excel files, detecting columns, and running validation rules.</Paragraph>
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
                  <Statistic title="Total Files Processed" value={result.processedFilesCount || 1} />
                </Col>
                <Col span={8}>
                  <Statistic title="Valid Records" value={result.validRecordsCount || result.totalValid || 0} styles={{ content: { color: '#3f8600' } }} />
                </Col>
                <Col span={8}>
                  <Statistic title="Errors / Duplicates" value={result.invalidRecordsCount || result.errors?.length || 0} styles={{ content: { color: '#cf1322' } }} />
                </Col>
              </Row>
            </Card>

            <Divider />
            <Button type="primary" size="large" onClick={() => window.location.href = '/invoices'}>
              View Invoice Data
            </Button>
            <Button size="large" style={{ marginLeft: 16 }} onClick={() => setCurrentStep(0)}>
              Process Another Batch
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UploadInvoice;
