import { DEFAULT_SELFIE_VIDEO_FILENAME, VIDEO_MP4_MIME_TYPE } from '@/constants'
import readFileInChunks from '@/utils/read-file'
import { BifoldLogger } from '@bifold/core'
import { hashBase64, PhotoMetadata } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'
import { VerificationPrompt, VerificationVideoUploadPayload } from '../api/hooks/useEvidenceApi'

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
  const [fileInfo, jpegBytes] = await Promise.all([getFileInfo(filePath), readFileInChunks(filePath, logger)])
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
 * Generates metadata for a video file to be used in verification uploads.
 *
 * @param {Buffer} buffer - The video file buffer.
 * @param {number} duration - The duration of the video in seconds.
 * @param {VerificationPrompt[]} prompts - The list of verification prompts associated with the video.
 * @param {number} mtime - The modification time of the video file in milliseconds since epoch.
 * @returns {*} {Promise<VerificationVideoUploadPayload>} - The generated video metadata.
 */
export const getVideoMetadata = async (
  buffer: Buffer,
  duration: number,
  prompts: VerificationPrompt[],
  mtime: number
): Promise<VerificationVideoUploadPayload> => {
  return {
    content_type: VIDEO_MP4_MIME_TYPE,
    content_length: buffer.byteLength,
    date: Math.floor(mtime / 1000),
    sha256: await hashBase64(buffer.toString('base64')),
    duration: duration,
    filename: DEFAULT_SELFIE_VIDEO_FILENAME,
    prompts: prompts.map(({ id }, i) => ({ id, prompted_at: i })),
  }
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
