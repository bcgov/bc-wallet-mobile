import readFileInChunks from '@/utils/read-file'
import { BifoldLogger } from '@bifold/core'
import { hashBase64 } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'

export interface PhotoMetadata {
  label: string
  content_type: string
  content_length: number
  date: number
  sha256: string // hashed copy of the photo
  filename?: string
  file_path: string
}

export const getFileInfo = async (filePath: string) => {
  const stats = await RNFS.stat(filePath)
  const filename = filePath.split('/').pop() || 'selfie.png'
  return {
    filename,
    timestamp: new Date(stats.mtime).getTime() / 1000, // Convert to Unix timestamp
    size: stats.size,
  }
}

export const getPhotoMetadata = async (filePath: string, logger: BifoldLogger): Promise<PhotoMetadata> => {
  const fileInfo = await getFileInfo(filePath)
  const jpegBytes = await readFileInChunks(filePath, logger)
  const jpegBase64 = jpegBytes.toString('base64')
  const photoSHA = await hashBase64(jpegBase64)

  const photoMetadata: PhotoMetadata = {
    content_length: jpegBytes.byteLength,
    content_type: 'image/jpeg',
    date: Math.floor(fileInfo.timestamp),
    label: 'front',
    filename: fileInfo.filename,
    sha256: photoSHA,
    file_path: filePath, // Include the file path for reference
  }
  return photoMetadata
}

/**
 * Removes a file at the specified path if it exists.
 *
 * @param {string} [path] - The file path to remove.
 * @param {BifoldLogger} logger - The logger instance for logging messages.
 * @returns {*} {Promise<void>}
 */
export const removeFileSafely = async (path: string | undefined, logger: BifoldLogger): Promise<void> => {
  try {
    if (!path) {
      logger.debug('Unable to remove file with undefined path')
      return
    }

    const fileExists = await RNFS.exists(path)

    if (!fileExists) {
      logger.debug(`File at path '${path}' does not exist, skipping removal`)
      return
    }

    logger.debug(`Removing file at path: ${path}`)
    await RNFS.unlink(path)
  } catch (error) {
    logger.error('Error removing file safely', error as Error)
  }
}
