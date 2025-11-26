import readFileInChunks from '@/utils/read-file'
import { Buffer } from 'buffer'
import RNFS from 'react-native-fs'

jest.mock('react-native-fs', () => ({
  stat: jest.fn(),
  read: jest.fn(),
}))

describe('readFileInChunks', () => {
  const mockLogger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }

  const mockFilePath = '/some/test/file.mp4'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('successful file reading', () => {
    it('should read a small file in a single chunk', async () => {
      const testData = 'test file content'
      const testBuffer = Buffer.from(testData, 'utf8')
      const base64Data = testBuffer.toString('base64')

      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: testBuffer.length,
        mtime: new Date(),
      })
      ;(RNFS.read as jest.Mock).mockResolvedValue(base64Data)

      const result = await readFileInChunks(mockFilePath, mockLogger as any)

      expect(RNFS.stat).toHaveBeenCalledWith(mockFilePath)
      expect(RNFS.read).toHaveBeenCalledWith(mockFilePath, testBuffer.length, 0, 'base64')
      expect(result.toString('utf8')).toBe(testData)
      expect(mockLogger.debug).toHaveBeenCalledWith(`Starting reading file at: ${mockFilePath}`)
    })

    it('should read a large file in multiple chunks', async () => {
      const chunkSize = 10
      const testData = 'this is a longer test file content'
      const testBuffer = Buffer.from(testData, 'utf8')
      const fileSize = testBuffer.length

      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: fileSize,
        mtime: new Date(),
      })

      // Mock RNFS.read to return chunks
      ;(RNFS.read as jest.Mock).mockImplementation((path, length, offset) => {
        const chunk = testBuffer.subarray(offset, offset + length)
        return Promise.resolve(chunk.toString('base64'))
      })

      const result = await readFileInChunks(mockFilePath, mockLogger as any, chunkSize)

      expect(result.toString('utf8')).toBe(testData)
      expect(RNFS.read).toHaveBeenCalledTimes(Math.ceil(fileSize / chunkSize))
      expect(mockLogger.debug).toHaveBeenCalledWith(`File has been read into memory`)
    })

    it('should call onChunk callback with correct progress', async () => {
      const chunkSize = 50
      const testData = Buffer.alloc(100, 'a')
      const onChunkMock = jest.fn()

      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: testData.length,
        mtime: new Date(),
      })
      ;(RNFS.read as jest.Mock).mockImplementation((path, length, offset) => {
        const chunk = testData.subarray(offset, offset + length)
        return Promise.resolve(chunk.toString('base64'))
      })

      await readFileInChunks(mockFilePath, mockLogger as any, chunkSize, onChunkMock)

      expect(onChunkMock).toHaveBeenCalledTimes(2)
      expect(onChunkMock).toHaveBeenNthCalledWith(1, expect.any(Buffer), 50)
      expect(onChunkMock).toHaveBeenNthCalledWith(2, expect.any(Buffer), 100)
    })

    it('should handle binary data correctly', async () => {
      const binaryData = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])

      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: binaryData.length,
        mtime: new Date(),
      })
      ;(RNFS.read as jest.Mock).mockResolvedValue(binaryData.toString('base64'))

      const result = await readFileInChunks(mockFilePath, mockLogger as any)

      expect(Buffer.compare(result, binaryData)).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle empty file', async () => {
      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: 0,
        mtime: new Date(),
      })

      const result = await readFileInChunks(mockFilePath, mockLogger as any)

      expect(result.length).toBe(0)
      expect(mockLogger.warn).toHaveBeenCalledWith(`File is empty: ${mockFilePath}`)
      expect(RNFS.read).not.toHaveBeenCalled()
    })

    it('should work without logger', async () => {
      const testData = 'test'
      const testBuffer = Buffer.from(testData, 'utf8')

      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: testBuffer.length,
        mtime: new Date(),
      })
      ;(RNFS.read as jest.Mock).mockResolvedValue(testBuffer.toString('base64'))

      const result = await readFileInChunks(mockFilePath, mockLogger as any)

      expect(result.toString('utf8')).toBe(testData)
    })

    it('should work without onChunk callback', async () => {
      const testData = 'test'
      const testBuffer = Buffer.from(testData, 'utf8')

      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: testBuffer.length,
        mtime: new Date(),
      })
      ;(RNFS.read as jest.Mock).mockResolvedValue(testBuffer.toString('base64'))

      const result = await readFileInChunks(mockFilePath, mockLogger as any)

      expect(result.toString('utf8')).toBe(testData)
    })

    it('should handle file size exactly matching chunk size', async () => {
      const chunkSize = 1024
      const testBuffer = Buffer.alloc(chunkSize, 'x')

      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: chunkSize,
        mtime: new Date(),
      })
      ;(RNFS.read as jest.Mock).mockResolvedValue(testBuffer.toString('base64'))

      const result = await readFileInChunks(mockFilePath, mockLogger as any, chunkSize)

      expect(result.length).toBe(chunkSize)
      expect(RNFS.read).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    it('should throw error when stat fails', async () => {
      const statError = new Error('File not found')
      ;(RNFS.stat as jest.Mock).mockRejectedValue(statError)

      await expect(readFileInChunks(mockFilePath, mockLogger as any)).rejects.toThrow('File not found')

      expect(mockLogger.error).toHaveBeenCalledWith('Error reading file', {
        filePath: mockFilePath,
        chunkSize: 1024 * 1024,
        errorMessage: 'File not found',
      })
    })

    it('should throw error when read fails', async () => {
      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: 100,
        mtime: new Date(),
      })

      const readError = new Error('Permission denied')
      ;(RNFS.read as jest.Mock).mockRejectedValue(readError)

      await expect(readFileInChunks(mockFilePath, mockLogger as any)).rejects.toThrow('Permission denied')

      expect(mockLogger.error).toHaveBeenCalledWith('Error reading file', {
        filePath: mockFilePath,
        chunkSize: 1024 * 1024,
        errorMessage: 'Permission denied',
      })
    })

    it('should handle error without logger', async () => {
      const error = new Error('Test error')
      ;(RNFS.stat as jest.Mock).mockRejectedValue(error)

      await expect(readFileInChunks(mockFilePath, mockLogger as any)).rejects.toThrow('Test error')
    })

    it('should handle error in onChunk callback', async () => {
      const testBuffer = Buffer.from('test', 'utf8')
      const callbackError = new Error('Callback error')
      const onChunkMock = jest.fn().mockRejectedValue(callbackError)

      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: testBuffer.length,
        mtime: new Date(),
      })
      ;(RNFS.read as jest.Mock).mockResolvedValue(testBuffer.toString('base64'))

      await expect(readFileInChunks(mockFilePath, mockLogger as any, 1024, onChunkMock)).rejects.toThrow(
        'Callback error'
      )
    })
  })

  describe('chunk size variations', () => {
    it('should handle custom chunk size', async () => {
      const customChunkSize = 512
      const testBuffer = Buffer.alloc(1000, 'y')

      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: testBuffer.length,
        mtime: new Date(),
      })
      ;(RNFS.read as jest.Mock).mockImplementation((path, length, offset) => {
        const chunk = testBuffer.subarray(offset, offset + length)
        return Promise.resolve(chunk.toString('base64'))
      })

      const result = await readFileInChunks(mockFilePath, mockLogger as any, customChunkSize)

      expect(result.length).toBe(1000)
      expect(RNFS.read).toHaveBeenCalledTimes(Math.ceil(1000 / customChunkSize))
    })

    it('should use default chunk size of 1MB', async () => {
      const testBuffer = Buffer.alloc(100, 'z')

      ;(RNFS.stat as jest.Mock).mockResolvedValue({
        size: testBuffer.length,
        mtime: new Date(),
      })
      ;(RNFS.read as jest.Mock).mockResolvedValue(testBuffer.toString('base64'))

      await readFileInChunks(mockFilePath, mockLogger as any)

      expect(RNFS.read).toHaveBeenCalledWith(mockFilePath, 100, 0, 'base64')
    })
  })
})
