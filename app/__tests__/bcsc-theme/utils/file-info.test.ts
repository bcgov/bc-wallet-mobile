import { removeFileSafely } from '@/bcsc-theme/utils/file-info'
import { MockLogger } from '@bifold/core'
import RNFS from 'react-native-fs'

jest.mock('react-native-fs', () => ({
  exists: jest.fn(),
  unlink: jest.fn(),
}))

describe('File Info Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('removeFileSafely', () => {
    it('should remove file when file exists', async () => {
      const mockFilePath = '/path/to/selfie.png'
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)

      RNFSMock.exists.mockResolvedValue(true)
      RNFSMock.unlink.mockResolvedValue(undefined)

      await removeFileSafely(mockLogger, mockFilePath)

      expect(RNFSMock.exists).toHaveBeenCalledWith(mockFilePath)
      expect(RNFSMock.unlink).toHaveBeenCalledWith(mockFilePath)
    })

    it('should not attempt to remove file when file does not exist', async () => {
      const mockFilePath = '/path/to/selfie.png'
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)

      RNFSMock.exists.mockResolvedValue(false)

      await removeFileSafely(mockLogger, mockFilePath)

      expect(RNFSMock.exists).toHaveBeenCalledWith(mockFilePath)
      expect(RNFSMock.unlink).not.toHaveBeenCalled()
    })

    it('should handle undefined file path gracefully', async () => {
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)

      await removeFileSafely(mockLogger, undefined)

      expect(RNFSMock.exists).not.toHaveBeenCalled()
      expect(RNFSMock.unlink).not.toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Unable to remove file'))
    })

    it('should log debug if file does not exist', async () => {
      const mockFilePath = '/path/to/selfie.png'
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)

      RNFSMock.exists.mockResolvedValue(false)

      await removeFileSafely(mockLogger, mockFilePath)

      expect(RNFSMock.exists).toHaveBeenCalledWith(mockFilePath)
      expect(RNFSMock.unlink).not.toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('does not exist, skipping removal'))
    })

    it('should log error if unlink fails', async () => {
      const mockFilePath = '/path/to/selfie.png'
      const mockLogger = new MockLogger()
      const RNFSMock = jest.mocked(RNFS)
      const mockError = new Error('Failed to delete file')

      RNFSMock.exists.mockResolvedValue(true)
      RNFSMock.unlink.mockRejectedValue(mockError)

      await removeFileSafely(mockLogger, mockFilePath)

      expect(RNFSMock.exists).toHaveBeenCalledWith(mockFilePath)
      expect(RNFSMock.unlink).toHaveBeenCalledWith(mockFilePath)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error removing file'))
    })
  })
})
