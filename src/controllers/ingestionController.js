import { ingestDirectory } from '../services/ingestionService.js';
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
    const resolvedPath = path.resolve(dirPath);

    const result = await ingestDirectory(resolvedPath);

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
 * Handle single file upload and trigger ingestion
 */
export const uploadInvoice = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const resolvedPath = path.resolve(env.invoicesDir);
    const result = await ingestDirectory(resolvedPath);

    res.status(200).json({
      success: true,
      message: 'File uploaded and processed.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default { triggerIngestion, uploadInvoice, upload };
