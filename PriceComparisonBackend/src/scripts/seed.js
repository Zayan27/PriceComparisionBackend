import { configureGoogleDNS } from '../config/dns.js';
configureGoogleDNS();

import mongoose from 'mongoose';
import env from '../config/env.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import VENDOR_RULES from '../config/vendorRules.js';
import logger from '../utils/logger.js';

/**
 * Seed script: purges stale vendors, seeds the 4 configured vendors,
 * and creates a default admin user.
 *
 * Usage: npm run seed
 */
async function seed() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(env.mongoUri);
    logger.info('Connected.');

    // ─── Purge legacy vendors & seed new ones ─────────────────────
    logger.info('Cleaning old vendor records...');
    const oldVendors = await Vendor.find().lean();
    const legacyKeys = new Set(VENDOR_RULES.map((r) => r.vendorKey));

    // Delete any vendor NOT in the current config (stale Vendor A-E, etc.)
    const staleVendors = oldVendors.filter((v) => !legacyKeys.has(v.vendorId));
    if (staleVendors.length > 0) {
      const staleIds = staleVendors.map((v) => v.vendorId);
      await Vendor.deleteMany({ vendorId: { $in: staleIds } });
      logger.info(`Removed ${staleVendors.length} stale vendor(s): ${staleVendors.map((v) => v.name).join(', ')}`);
    } else {
      logger.info('No stale vendors found.');
    }

    // Seed configured vendors
    logger.info('Seeding vendors...');
    let created = 0;
    let existing = 0;
    for (const rule of VENDOR_RULES) {
      const exists = await Vendor.findOne({ vendorId: rule.vendorKey });
      if (!exists) {
        await Vendor.create({
          vendorId: rule.vendorKey,
          name: rule.name,
          description: rule.description || '',
          serialPatterns: [],
        });
        created++;
        logger.info(`  ✓ Created vendor: ${rule.name} (${rule.vendorKey})`);
      } else {
        existing++;
        logger.info(`  · Already exists: ${rule.name} (${rule.vendorKey})`);
      }
    }
    logger.info(`Vendor seeding: ${created} created, ${existing} already existed`);

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
