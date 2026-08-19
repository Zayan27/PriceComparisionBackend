import { configureGoogleDNS } from '../config/dns.js';
configureGoogleDNS();

import mongoose from 'mongoose';
import env from '../config/env.js';
import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';
import VENDOR_RULES from '../config/vendorRules.js';
import logger from '../utils/logger.js';

/**
 * Database Reset & Migration Script
 *
 * This script:
 * 1. Drops ALL existing vendor records (clears stale Vendor A-E data)
 * 2. Drops ALL existing invoice records (clears stale data linked to old vendors)
 * 3. Seeds the 4 new vendors: SS Distro, FLW TX, RAVE, TouchTell
 * 4. Preserves user accounts (admin login still works)
 *
 * Usage: npm run reset
 */
async function reset() {
  try {
    logger.info('═══════════════════════════════════════════════');
    logger.info('  DATABASE RESET & VENDOR MIGRATION');
    logger.info('═══════════════════════════════════════════════');
    logger.info('');

    logger.info('Connecting to MongoDB...');
    await mongoose.connect(env.mongoUri);
    logger.info(`Connected to: ${env.mongoUri.replace(/\/\/.*@/, '//***@')}`);

    // ─── Step 1: Drop ALL invoices ─────────────────────────────────
    logger.info('');
    logger.info('Step 1: Clearing all invoices...');
    const invoiceCount = await Invoice.countDocuments();
    const invoiceResult = await Invoice.deleteMany({});
    logger.info(`  Deleted ${invoiceResult.deletedCount} invoices (was: ${invoiceCount})`);

    // ─── Step 2: Drop ALL vendors ──────────────────────────────────
    logger.info('');
    logger.info('Step 2: Clearing all vendor records (removing Vendor A-E legacy data)...');
    const vendorCount = await Vendor.countDocuments();
    const existingVendors = await Vendor.find().lean();
    logger.info(`  Found ${vendorCount} existing vendors:`);
    existingVendors.forEach((v) => {
      logger.info(`    - ${v.name} (${v.vendorId})`);
    });
    const vendorResult = await Vendor.deleteMany({});
    logger.info(`  Deleted ${vendorResult.deletedCount} vendor records`);

    // ─── Step 3: Seed 4 new vendors ────────────────────────────────
    logger.info('');
    logger.info('Step 3: Seeding 4 new vendors...');
    for (const rule of VENDOR_RULES) {
      await Vendor.create({
        vendorId: rule.vendorKey,
        name: rule.name,
        description: rule.description || '',
        serialPatterns: [],
      });
      logger.info(`  ✓ Created: ${rule.name} (${rule.vendorKey})`);
    }

    // ─── Step 4: Verify ────────────────────────────────────────────
    logger.info('');
    logger.info('Step 4: Verification...');
    const newVendors = await Vendor.find().lean();
    const newInvoices = await Invoice.countDocuments();
    const userCount = await User.countDocuments();
    logger.info(`  Vendors in DB: ${newVendors.length}`);
    newVendors.forEach((v) => {
      logger.info(`    ✓ ${v.name} (${v.vendorId})`);
    });
    logger.info(`  Invoices in DB: ${newInvoices}`);
    logger.info(`  Users preserved: ${userCount}`);

    // ─── Done ──────────────────────────────────────────────────────
    logger.info('');
    logger.info('═══════════════════════════════════════════════');
    logger.info('  RESET COMPLETE — System ready for fresh data');
    logger.info('═══════════════════════════════════════════════');
    logger.info('');
    logger.info('Next steps:');
    logger.info('  1. Log in to the app (admin@admin.com / admin123)');
    logger.info('  2. Go to Upload Invoice → Select one of the 4 vendors');
    logger.info('  3. Upload an invoice CSV/Excel file');
    logger.info('  4. View the Price Comparison matrix');

  } catch (error) {
    logger.error('Reset failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB.');
    process.exit(0);
  }
}

reset();
