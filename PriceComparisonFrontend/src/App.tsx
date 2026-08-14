import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import AppShell from './components/layout/AppShell';
import AuthGuard from './components/layout/AuthGuard';
import Login from './pages/auth/Login';

// Pages
import Dashboard from './pages/dashboard/Dashboard';
import Invoices from './pages/invoices/Invoices';
import UploadInvoice from './pages/invoices/UploadInvoice';
import PriceComparison from './pages/comparison/PriceComparison';
import Analysis from './pages/analysis/Analysis';
import Vendors from './pages/vendors/Vendors';
import Logs from './pages/logs/Logs';

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/"
            element={
              <AuthGuard>
                <AppShell />
              </AuthGuard>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="upload" element={<UploadInvoice />} />
            <Route path="comparison" element={<PriceComparison />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="logs" element={<Logs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
