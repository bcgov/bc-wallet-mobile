import { getFileInfo, getPhotoMetadata, getVideoMetadata, removeFileSafely } from '@/bcsc-theme/utils/file-info'
import { DEFAULT_SELFIE_VIDEO_FILENAME, VIDEO_MP4_MIME_TYPE } from '@/constants'
import readFileInChunks from '@/utils/read-file'
import { MockLogger } from '@bifold/core'
import { hashBase64, saveEvidencePhoto } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'

jest.mock('react-native-fs', () => ({
  exists: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn(),
}))

jest.mock('@/utils/read-file', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockReadFileInChunks = readFileInChunks as jest.MockedFunction<typeof readFileInChunks>

describe('File Info Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getFileInfo', () => {
    it('should return filename, timestamp, and size from file stats', async () => {
      const RNFSMock = jest.mocked(RNFS)
      RNFSMock.stat.mockResolvedValue({
        mtime: new Date('2025-01-15T12:00:00Z').getTime(),
        size: 1024,
        path: '/path/to/photo.png',
        isFile: () => true,
        isDirectory: () => false,
        ctime: 0,
        name: 'photo.png',
      } as any)

      const result = await getFileInfo('/path/to/photo.png')

      expect(RNFSMock.stat).toHaveBeenCalledWith('/path/to/photo.png')
      expect(result).toEqual({
        filename: 'photo.png',
        timestamp: new Date('2025-01-15T12:00:00Z').getTime() / 1000,
        size: 1024,
      })
    })

    it('should default filename to selfie.png when path has no filename', async () => {
      const RNFSMock = jest.mocked(RNFS)
      // Edge case: path ending with "/" so pop() returns ""
      RNFSMock.stat.mockResolvedValue({
        mtime: new Date('2025-01-15T12:00:00Z').getTime(),
        size: 512,
        path: '',
        isFile: () => true,
        isDirectory: () => false,
        ctime: 0,
        name: '',
      } as any)

      const result = await getFileInfo('')

      expect(result.filename).toBe('selfie.png')
    })
  })

  describe('getPhotoMetadata', () => {
    it('should return photo metadata with permanent path on successful save', async () => {
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)
      const mockBuffer = Buffer.from('fake-jpeg-data')

      RNFSMock.stat.mockResolvedValue({
        mtime: new Date('2025-06-01T10:00:00Z').getTime(),
        size: mockBuffer.byteLength,
        path: '/tmp/photo.jpg',
        isFile: () => true,
        isDirectory: () => false,
        ctime: 0,
        name: 'photo.jpg',
      } as any)

      mockReadFileInChunks.mockResolvedValue(mockBuffer)
      ;(hashBase64 as jest.Mock).mockResolvedValue('sha256-hash-value')
      ;(saveEvidencePhoto as jest.Mock).mockResolvedValue('/permanent/path/photo.jpg')

      const result = await getPhotoMetadata('/tmp/photo.jpg', mockLogger)

      expect(mockReadFileInChunks).toHaveBeenCalledWith('/tmp/photo.jpg', mockLogger)
      expect(hashBase64).toHaveBeenCalledWith(mockBuffer.toString('base64'))
      expect(saveEvidencePhoto).toHaveBeenCalledWith(
        mockBuffer.toString('base64'),
        expect.stringContaining('evidence_')
      )
      expect(result).toEqual({
        content_length: mockBuffer.byteLength,
        content_type: 'image/jpeg',
        date: Math.floor(new Date('2025-06-01T10:00:00Z').getTime() / 1000),
        label: 'front',
        filename: 'photo.jpg',
        sha256: 'sha256-hash-value',
        file_path: '/permanent/path/photo.jpg',
      })
    })

    it('should fall back to original file path when saveEvidencePhoto fails', async () => {
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)
      const mockBuffer = Buffer.from('fake-jpeg-data')

      RNFSMock.stat.mockResolvedValue({
        mtime: new Date('2025-06-01T10:00:00Z').getTime(),
        size: mockBuffer.byteLength,
        path: '/tmp/photo.jpg',
        isFile: () => true,
        isDirectory: () => false,
        ctime: 0,
        name: 'photo.jpg',
      } as any)

      mockReadFileInChunks.mockResolvedValue(mockBuffer)
      ;(hashBase64 as jest.Mock).mockResolvedValue('sha256-hash-value')
      ;(saveEvidencePhoto as jest.Mock).mockRejectedValue(new Error('Storage full'))

      const result = await getPhotoMetadata('/tmp/photo.jpg', mockLogger)

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to save evidence photo'))
      expect(result.file_path).toBe('/tmp/photo.jpg')
    })

    it('should handle non-Error thrown by saveEvidencePhoto', async () => {
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)
      const mockBuffer = Buffer.from('fake-jpeg-data')

      RNFSMock.stat.mockResolvedValue({
        mtime: new Date('2025-06-01T10:00:00Z').getTime(),
        size: mockBuffer.byteLength,
        path: '/tmp/photo.jpg',
        isFile: () => true,
        isDirectory: () => false,
        ctime: 0,
        name: 'photo.jpg',
      } as any)

      mockReadFileInChunks.mockResolvedValue(mockBuffer)
      ;(hashBase64 as jest.Mock).mockResolvedValue('sha256-hash-value')
      ;(saveEvidencePhoto as jest.Mock).mockRejectedValue('string-error')

      const result = await getPhotoMetadata('/tmp/photo.jpg', mockLogger)

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown error'))
      expect(result.file_path).toBe('/tmp/photo.jpg')
    })
  })

  describe('getVideoMetadata', () => {
    it('should return video metadata with hashed content', async () => {
      const mockBuffer = Buffer.from('fake-video-data')
      const mockPrompts = [
        { id: 10, prompt: 'Say hello' },
        { id: 20, prompt: 'Turn left' },
      ]
      const mtime = new Date('2025-06-01T10:00:00Z').getTime()

      ;(hashBase64 as jest.Mock).mockResolvedValue('video-sha256-hash')

      const result = await getVideoMetadata(mockBuffer, 30, mockPrompts, mtime)

      expect(hashBase64).toHaveBeenCalledWith(mockBuffer.toString('base64'))
      expect(result).toEqual({
        content_type: VIDEO_MP4_MIME_TYPE,
        content_length: mockBuffer.byteLength,
        date: Math.floor(mtime / 1000),
        sha256: 'video-sha256-hash',
        duration: 30,
        filename: DEFAULT_SELFIE_VIDEO_FILENAME,
        prompts: [
          { id: 10, prompted_at: 0 },
          { id: 20, prompted_at: 1 },
        ],
      })
    })

    it('should handle empty prompts array', async () => {
      const mockBuffer = Buffer.from('video')
      const mtime = Date.now()

      ;(hashBase64 as jest.Mock).mockResolvedValue('hash')

      const result = await getVideoMetadata(mockBuffer, 5, [], mtime)

      expect(result.prompts).toEqual([])
    })
  })

  describe('removeFileSafely', () => {
    it('should remove file when file exists', async () => {
      const mockFilePath = '/path/to/selfie.png'
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)

      RNFSMock.exists.mockResolvedValue(true)
      RNFSMock.unlink.mockResolvedValue(undefined)

      await removeFileSafely(mockFilePath, mockLogger)

      expect(RNFSMock.exists).toHaveBeenCalledWith(mockFilePath)
      expect(RNFSMock.unlink).toHaveBeenCalledWith(mockFilePath)
    })

    it('should not attempt to remove file when file does not exist', async () => {
      const mockFilePath = '/path/to/selfie.png'
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)

      RNFSMock.exists.mockResolvedValue(false)

      await removeFileSafely(mockFilePath, mockLogger)

      expect(RNFSMock.exists).toHaveBeenCalledWith(mockFilePath)
      expect(RNFSMock.unlink).not.toHaveBeenCalled()
    })

    it('should handle undefined file path gracefully', async () => {
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)

      await removeFileSafely(undefined, mockLogger)

      expect(RNFSMock.exists).not.toHaveBeenCalled()
      expect(RNFSMock.unlink).not.toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Unable to remove file'))
    })

    it('should log debug if file does not exist', async () => {
      const mockFilePath = '/path/to/selfie.png'
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)

      RNFSMock.exists.mockResolvedValue(false)

      await removeFileSafely(mockFilePath, mockLogger)

      expect(RNFSMock.exists).toHaveBeenCalledWith(mockFilePath)
      expect(RNFSMock.unlink).not.toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('does not exist, skipping removal'))
    })

    it('should log error if unlink fails', async () => {
      const mockFilePath = '/path/to/selfie.png'
      const mockLogger = new MockLogger()
      const mockError = new Error('Failed to delete file')
      const RNFSMock = jest.mocked(RNFS)

      RNFSMock.exists.mockResolvedValue(true)
      RNFSMock.unlink.mockRejectedValue(mockError)

      await removeFileSafely(mockFilePath, mockLogger)

      expect(RNFSMock.exists).toHaveBeenCalledWith(mockFilePath)
      expect(RNFSMock.unlink).toHaveBeenCalledWith(mockFilePath)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error removing file safely'), mockError)
    })
  })
})
