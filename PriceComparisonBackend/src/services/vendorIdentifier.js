import VENDOR_RULES from '../config/vendorRules.js';
import Vendor from '../models/Vendor.js';
import logger from '../utils/logger.js';

/**
 * @deprecated Serial-range heuristic identification is deprecated.
 * Vendor is now explicitly selected during invoice upload.
 * Always returns null.
 *
 * @param {string|number} serialNumber
 * @returns {null}
 */
export function identifyVendor(serialNumber) {
  logger.warn(
    `identifyVendor() is deprecated. Called with serial: ${serialNumber}. Returning null.`
  );
  return null;
}

/**
 * Return the list of configured vendor keys and names.
 *
 * @returns {Array<{ vendorKey: string, name: string, description: string }>}
 */
export function getConfiguredVendors() {
  return VENDOR_RULES.map((rule) => ({
    vendorKey: rule.vendorKey,
    name: rule.name,
    description: rule.description || '',
  }));
}

/**
 * Validate that a vendorId is one of the configured vendors.
 *
 * @param {string} vendorId
 * @returns {boolean}
 */
export function isValidVendor(vendorId) {
  return VENDOR_RULES.some((rule) => rule.vendorKey === vendorId);
}

/**
 * Ensure all vendors defined in VENDOR_RULES exist in the database.
 * Also removes any stale vendor records NOT in the current config.
 * Creates missing vendors if needed (idempotent and self-healing).
 */
export async function ensureVendorsSeeded() {
  let created = 0;
  let existing = 0;
  let removed = 0;

  // 1. Remove stale vendors not in current config
  const configuredKeys = new Set(VENDOR_RULES.map((r) => r.vendorKey));
  const allVendors = await Vendor.find().lean();
  const staleVendors = allVendors.filter((v) => !configuredKeys.has(v.vendorId));

  if (staleVendors.length > 0) {
    const staleIds = staleVendors.map((v) => v.vendorId);
    await Vendor.deleteMany({ vendorId: { $in: staleIds } });
    removed = staleVendors.length;
    logger.info(`Removed ${removed} stale vendor(s): ${staleVendors.map((v) => v.name).join(', ')}`);
  }

  // 2. Create missing vendors
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
      logger.info(`Created vendor: ${rule.name} (${rule.vendorKey})`);
    } else {
      existing++;
    }
  }

  logger.info(`Vendor seeding complete: ${created} created, ${existing} already existed, ${removed} stale removed`);
  return { created, existing, removed };
}

export default { identifyVendor, ensureVendorsSeeded, getConfiguredVendors, isValidVendor };
