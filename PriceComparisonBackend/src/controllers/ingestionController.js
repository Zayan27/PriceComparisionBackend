import { ingestDirectory, ingestSingleFile } from '../services/ingestionService.js';
import { isValidVendor, getConfiguredVendors } from '../services/vendorIdentifier.js';
import env from '../config/env.js';
import path from 'path';
import multer from 'multer';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.invoicesDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

export const upload = multer({ storage });

/**
 * POST /api/invoices/ingest-directory
 * Trigger batch ingestion of all invoice files from the configured directory.
 */
export const triggerIngestion = async (req, res, next) => {
  try {
    const dirPath = req.body.directory || env.invoicesDir;
    const vendorId = req.body.vendorId;
    const resolvedPath = path.resolve(dirPath);

    // Validate vendorId if provided
    if (vendorId && !isValidVendor(vendorId)) {
      const configured = getConfiguredVendors().map((v) => `${v.name} (${v.vendorKey})`).join(', ');
      return res.status(400).json({
        success: false,
        message: `Invalid vendorId "${vendorId}". Configured vendors: ${configured}`,
      });
    }

    const result = await ingestDirectory(resolvedPath, vendorId);

    res.status(200).json({
      success: true,
      message: 'Ingestion completed.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/invoices/upload
 * Handle single file upload and trigger ingestion.
 * Requires vendorId in the request body.
 */
export const uploadInvoice = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const vendorId = req.body.vendorId;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'vendorId is required. Please select a vendor before uploading.',
      });
    }

    if (!isValidVendor(vendorId)) {
      const configured = getConfiguredVendors().map((v) => `${v.name} (${v.vendorKey})`).join(', ');
      return res.status(400).json({
        success: false,
        message: `Invalid vendorId "${vendorId}". Configured vendors: ${configured}`,
      });
    }

    const filePath = path.resolve(env.invoicesDir, req.file.originalname);
    const result = await ingestSingleFile(filePath, vendorId);

    if (result.error) {
      return res.status(500).json({
        success: false,
        message: `File processing failed: ${result.error}`,
      });
    }

    res.status(200).json({
      success: true,
      message: result.skipped ? 'File already processed (duplicate).' : 'File uploaded and processed.',
      data: {
        totalFiles: 1,
        ingested: result.ingested ? 1 : 0,
        skipped: result.skipped ? 1 : 0,
        errors: result.error ? [{ file: req.file.originalname, error: result.error }] : [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export default { triggerIngestion, uploadInvoice, upload };
