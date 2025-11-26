import { DEFAULT_CHUNK_SIZE } from '@/constants'
import { BifoldLogger } from '@bifold/core'
import { Buffer } from 'buffer'
import RNFS from 'react-native-fs'

/**
 * Reads a file in chunks with optional chunk processing callback
 * @param filePath - Path to the file to read
 * @param logger - Optional logger for debugging
 * @param chunkSize - Size of each chunk in bytes (default: 1MB)
 * @param onChunk - Optional function that runs after each chunk is read (receives binary Buffer)
 * @returns Promise<Buffer> - Buffer containing the complete file data
 */
const readFileInChunks = async (
  filePath: string,
  logger: BifoldLogger,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  onChunk?: (chunkBuffer: Buffer, progress: number) => void | Promise<void>
): Promise<Buffer> => {
  try {
    const stat = await RNFS.stat(filePath)
    const fileSize = stat.size

    if (fileSize === 0) {
      logger.warn(`File is empty: ${filePath}`)
      return Buffer.alloc(0)
    }

    logger.debug(`Starting reading file at: ${filePath}`)
    const chunks: Buffer[] = []
    let offset = 0

    do {
      const length = Math.min(chunkSize, fileSize - offset)

      // Read chunk as base64 (safe for binary data) then convert to Buffer
      const chunkBase64 = await RNFS.read(filePath, length, offset, 'base64')
      const chunkBuffer = Buffer.from(chunkBase64, 'base64')

      // Call chunk callback if provided
      if (onChunk) {
        const progress = ((offset + length) / fileSize) * 100
        await onChunk(chunkBuffer, progress)
      }

      chunks.push(chunkBuffer)
      offset += length
      logger.debug(`Read chunk: ${offset}/${fileSize} bytes`)
    } while (offset < fileSize)

    // Combine all chunks
    const fullBuffer = Buffer.concat(chunks)

    logger.debug(`File has been read into memory`)

    return fullBuffer
  } catch (error: any) {
    logger.error('Error reading file', {
      filePath,
      chunkSize,
      errorMessage: error?.message || String(error),
    })
    throw error
  }
}

export default readFileInChunks
