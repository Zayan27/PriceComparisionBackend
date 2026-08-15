import { configureGoogleDNS } from './config/dns.js';
configureGoogleDNS();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import env from './config/env.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import ingestionRoutes from './routes/ingestionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';

const app = express();

// ─── Security & Parsing Middleware ──────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logging (dev) ──────────────────────────────────────────
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Price Comparison API is running',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/invoices', ingestionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/vendors', vendorRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ───────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────
const start = async () => {
  await connectDB();

  app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`Health check: http://localhost:${env.port}/api/health`);
  });
};

start().catch((err) => {
  logger.error('Failed to start server:', err.message);
  process.exit(1);
});

export default app;
