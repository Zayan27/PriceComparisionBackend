import { ingestDirectory } from '../services/ingestionService.js';
import env from '../config/env.js';
import path from 'path';

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

export default { triggerIngestion };
