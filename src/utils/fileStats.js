import { stat } from 'fs/promises';

/**
 * Extract file system metadata for a given file path.
 * @param {string} filePath - Absolute or relative path to the file
 * @returns {{ createdAt: Date, modifiedAt: Date, size: number }}
 */
export async function getFileMetadata(filePath) {
  const stats = await stat(filePath);
  return {
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
    size: stats.size,
  };
}

export default getFileMetadata;
