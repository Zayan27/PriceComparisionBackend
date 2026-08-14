import dotenv from 'dotenv';
dotenv.config();

const env = {
  port: parseInt(process.env.PORT, 10) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/price-comparison',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  invoicesDir: process.env.INVOICES_DIR || './VendorsInvoices',
};

export default env;
