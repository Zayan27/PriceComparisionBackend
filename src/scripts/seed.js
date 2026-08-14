import { configureGoogleDNS } from '../config/dns.js';
configureGoogleDNS();

import mongoose from 'mongoose';
import env from '../config/env.js';
import User from '../models/User.js';
import { ensureVendorsSeeded } from '../services/vendorIdentifier.js';
import logger from '../utils/logger.js';

/**
 * Seed script: creates vendor records and a default admin user.
 *
 * Usage: npm run seed
 */
async function seed() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(env.mongoUri);
    logger.info('Connected.');

    // ─── Seed Vendors ───────────────────────────────────────────────
    logger.info('Seeding vendors...');
    const vendorResult = await ensureVendorsSeeded();
    logger.info('Vendor seeding result:', vendorResult);

    // ─── Seed Admin User ────────────────────────────────────────────
    logger.info('Seeding admin user...');
    const adminEmail = 'admin@admin.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      logger.info('Admin user already exists, skipping.');
    } else {
      await User.create({
        username: 'admin',
        email: adminEmail,
        passwordHash: 'admin123', // will be hashed by pre-save hook
        role: 'admin',
      });
      logger.info('Admin user created: admin@admin.com / admin123');
    }

    logger.info('Seed completed successfully!');
  } catch (error) {
    logger.error('Seed failed:', error.message);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB.');
    process.exit(0);
  }
}

seed();
