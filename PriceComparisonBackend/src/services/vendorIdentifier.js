import VENDOR_RULES from '../config/vendorRules.js';
import Vendor from '../models/Vendor.js';
import logger from '../utils/logger.js';

/**
 * Identify which vendor a serial number belongs to.
 *
 * @param {string|number} serialNumber
 * @returns {{ vendorKey: string, name: string } | null}
 */
export function identifyVendor(serialNumber) {
  const serial = String(serialNumber).trim();

  for (const rule of VENDOR_RULES) {
    if (rule.match(serial)) {
      return {
        vendorKey: rule.vendorKey,
        name: rule.name,
      };
    }
  }

  return null;
}

/**
 * Ensure all vendors defined in VENDOR_RULES exist in the database.
 * Creates them if missing (idempotent).
 */
export async function ensureVendorsSeeded() {
  let created = 0;
  let existing = 0;

  for (const rule of VENDOR_RULES) {
    const exists = await Vendor.findOne({ vendorId: rule.vendorKey });
    if (!exists) {
      await Vendor.create({
        vendorId: rule.vendorKey,
        name: rule.name,
        description: rule.description || '',
        serialPatterns: rule.serialPatterns || [],
      });
      created++;
      logger.info(`Created vendor: ${rule.name} (${rule.vendorKey})`);
    } else {
      existing++;
    }
  }

  logger.info(`Vendor seeding complete: ${created} created, ${existing} already existed`);
  return { created, existing };
}

export default { identifyVendor, ensureVendorsSeeded };
