import { DEFAULT_SELFIE_VIDEO_FILENAME, VIDEO_MP4_MIME_TYPE } from '@/constants'
import readFileInChunks from '@/utils/read-file'
import { BifoldLogger } from '@bifold/core'
import { Platform } from 'react-native'
import { hashBase64, PhotoMetadata, remuxVideoToMp4, saveEvidencePhoto } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'
import { VerificationPrompt, VerificationVideoUploadPayload } from '../api/hooks/useEvidenceApi'
import { isPlausibleCaptureDateSeconds } from './capture-date'

/**
 * Returns a path to the recorded selfie video as a real MP4, which is all IAS accepts.
 * On iOS, VisionCamera v5 records QuickTime, so the recording is remuxed (the original is deleted).
 * @throws If the iOS remux fails
 */
export const toMp4VideoPath = async (recordedPath: string): Promise<string> => {
  if (Platform.OS !== 'ios') {
    return recordedPath
  }
  return remuxVideoToMp4(recordedPath)
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
  const [fileInfo, jpegBytes] = await Promise.all([getFileInfo(filePath), readFileInChunks(filePath, logger)])
  const jpegBase64 = jpegBytes.toString('base64')
  const photoSHA = await hashBase64(jpegBase64)

  const permanentFilename = `evidence_${Date.now()}_${fileInfo.filename}`
  let permanentPath: string
  try {
    permanentPath = await saveEvidencePhoto(jpegBase64, permanentFilename)
    logger.info(`Evidence photo saved to permanent storage: ${permanentPath}`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    logger.warn(`Failed to save evidence photo to permanent storage, using temp path: ${errMsg}`)
    permanentPath = filePath
  }

  // Android's File.lastModified() can return 0 on failure, which getFileInfo() would otherwise
  // pass through as an implausible 1970 capture date (#4338).
  const capturedTimestamp = Math.floor(fileInfo.timestamp)
  let date = capturedTimestamp
  if (!isPlausibleCaptureDateSeconds(capturedTimestamp)) {
    logger.warn('Implausible photo capture timestamp, substituting current time', { filePath, capturedTimestamp })
    date = Math.floor(Date.now() / 1000)
  }

  const photoMetadata: PhotoMetadata = {
    content_length: jpegBytes.byteLength,
    content_type: 'image/jpeg',
    date,
    label: 'front',
    filename: fileInfo.filename,
    sha256: photoSHA,
    file_path: permanentPath,
  }
  return photoMetadata
}

/**
 * Generates metadata for a video file to be used in verification uploads.
 *
 * Android's File.lastModified() can return 0 on failure, which would otherwise produce an
 * implausible 1970 capture date (#4338); when that happens, the current time is substituted.
 *
 * @param {Buffer} buffer - The video file buffer.
 * @param {number} duration - The duration of the video in seconds.
 * @param {VerificationPrompt[]} prompts - The list of verification prompts associated with the video.
 * @param {number} mtime - The modification time of the video file in milliseconds since epoch.
 * @param {BifoldLogger} logger - The logger instance used to record a substitution.
 * @returns {*} {Promise<VerificationVideoUploadPayload>} - The generated video metadata.
 */
export const getVideoMetadata = async (
  buffer: Buffer,
  duration: number,
  prompts: VerificationPrompt[],
  mtime: number,
  logger: BifoldLogger
): Promise<VerificationVideoUploadPayload> => {
  const capturedTimestamp = Math.floor(mtime / 1000)
  let date = capturedTimestamp
  if (!isPlausibleCaptureDateSeconds(capturedTimestamp)) {
    logger.warn('Implausible video mtime, substituting current time', { mtime })
    date = Math.floor(Date.now() / 1000)
  }

  return {
    content_type: VIDEO_MP4_MIME_TYPE,
    content_length: buffer.byteLength,
    date,
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
    logger.error(`Error removing file at path '${path}'`, error as Error)
  }
}

/**
 * Checks if the file system has at least the specified minimum free storage in megabytes.
 * @param minMb The minimum free storage in megabytes to check for.
 * @param logger The logger instance for logging messages.
 * @returns A promise that resolves to an object containing a boolean indicating
 *          if there is enough free storage and the amount of free storage in megabytes.
 */
export const checkFileSystemFreeStorage = async (
  minMb: number,
  logger: BifoldLogger
): Promise<{
  hasFreeStorage: boolean
  freeStorageMb: number
  totalStorageMb: number
}> => {
  const _bytesToMegabytes = (bytes: number): number => Math.floor(bytes / (1024 * 1024))

  try {
    const { freeSpace, totalSpace } = await RNFS.getFSInfo()
    const freeSpaceMb = _bytesToMegabytes(freeSpace)
    logger.debug(`[FileSystem] Free space: ${freeSpaceMb} MB, Minimum required: ${minMb} MB`)
    return {
      hasFreeStorage: freeSpaceMb >= minMb,
      freeStorageMb: freeSpaceMb,
      totalStorageMb: _bytesToMegabytes(totalSpace),
    }
  } catch (error) {
    logger.error('Error checking file system space', error as Error)
    return {
      hasFreeStorage: true, // Fail open: assume enough space if we can't check
      freeStorageMb: -1, // Indicate unknown free space
      totalStorageMb: -1, // Indicate unknown total space
    }
  }
}
