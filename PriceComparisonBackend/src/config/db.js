import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

/**
 * Connect to MongoDB with retry logic.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri, { family: 4 });
    logger.info(`MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
};

export default connectDB;
