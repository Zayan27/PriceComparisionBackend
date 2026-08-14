import { readdir } from 'fs/promises';
import path from 'path';
import Invoice from '../models/Invoice.js';
import { parseInvoiceFile } from './fileParser.js';
import { identifyVendor, ensureVendorsSeeded } from './vendorIdentifier.js';
import { getFileMetadata } from '../utils/fileStats.js';
import logger from '../utils/logger.js';

const SUPPORTED_EXTENSIONS = new Set(['.csv', '.xls', '.xlsx', '.json']);

/**
 * Ingest all invoice files from a directory.
 *
 * Process:
 * 1. Ensure vendor records exist in DB
 * 2. Scan directory for supported file types
 * 3. For each file: read metadata, parse contents, identify vendor
 * 4. Upsert into MongoDB (skip duplicates for idempotency)
 *
 * @param {string} dirPath - Path to the invoices directory
 * @returns {Promise<{ totalFiles: number, ingested: number, skipped: number, errors: Array<{ file: string, error: string }> }>}
 */
export async function ingestDirectory(dirPath) {
  const resolvedDir = path.resolve(dirPath);
  logger.info(`Starting ingestion from: ${resolvedDir}`);

  // Ensure vendors are seeded first
  await ensureVendorsSeeded();

  // Read directory contents
  const allFiles = await readdir(resolvedDir);
  const invoiceFiles = allFiles.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
  });

  logger.info(`Found ${invoiceFiles.length} invoice files out of ${allFiles.length} total files`);

  const results = {
    totalFiles: invoiceFiles.length,
    ingested: 0,
    skipped: 0,
    errors: [],
  };

  for (const fileName of invoiceFiles) {
    const filePath = path.join(resolvedDir, fileName);

    try {
      // Extract serial number from filename: Invoice-XXXXX.ext or invoice-XXXXX.ext
      const fileSerial = extractSerialFromFilename(fileName);

      // Get file system metadata
      const fileMeta = await getFileMetadata(filePath);

      // Parse the file content
      const parsed = await parseInvoiceFile(filePath);

      // Use serial from parsed content, fallback to filename
      const serialNumber = parsed.serialNumber || fileSerial;

      if (!serialNumber) {
        results.errors.push({ file: fileName, error: 'Could not determine serial number' });
        continue;
      }

      // Identify vendor from serial number
      const vendor = identifyVendor(serialNumber);
      if (!vendor) {
        logger.warn(`No vendor match for serial ${serialNumber} in file ${fileName}`);
      }

      const vendorId = vendor ? vendor.vendorKey : 'unknown';

      // Calculate totals
      const totalAmount = parsed.items.reduce((sum, item) => sum + item.lineTotal, 0);
      const totalTax = parsed.items.reduce((sum, item) => sum + item.tax, 0);

      // Determine invoice date: prefer parsed date, fallback to file creation date
      const invoiceDate = parsed.orderDate || fileMeta.createdAt;

      // Check for existing invoice (idempotent)
      const existing = await Invoice.findOne({
        serialNumber: String(serialNumber),
        rawFileName: fileName,
      });

      if (existing) {
        logger.debug(`Skipping duplicate: ${fileName} (serial: ${serialNumber})`);
        results.skipped++;
        continue;
      }

      // Create invoice record
      await Invoice.create({
        serialNumber: String(serialNumber),
        vendorId,
        rawFileName: fileName,
        fileMetadata: {
          createdAt: fileMeta.createdAt,
          modifiedAt: fileMeta.modifiedAt,
          size: fileMeta.size,
        },
        invoiceDate,
        customerName: parsed.customerName || '',
        companyName: parsed.companyName || '',
        items: parsed.items,
        totalAmount,
        totalTax,
        ingestedAt: new Date(),
      });

      logger.info(`Ingested: ${fileName} → Vendor: ${vendorId}, Serial: ${serialNumber}, Items: ${parsed.items.length}`);
      results.ingested++;
    } catch (error) {
      logger.error(`Failed to ingest ${fileName}:`, error.message);
      results.errors.push({ file: fileName, error: error.message });
    }
  }

  logger.info(
    `Ingestion complete: ${results.ingested} ingested, ${results.skipped} skipped, ${results.errors.length} errors`
  );

  return results;
}

/**
 * Extract serial number from filename pattern: Invoice-XXXXX.ext or invoice-XXXXX.ext
 */
function extractSerialFromFilename(fileName) {
  const match = fileName.match(/[Ii]nvoice[- _]?(\d+)/);
  return match ? match[1] : '';
}

export default { ingestDirectory };
