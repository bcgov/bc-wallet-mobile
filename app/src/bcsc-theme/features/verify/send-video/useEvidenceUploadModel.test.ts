import useApi from '@/bcsc-theme/api/hooks/useApi'
import useEvidenceUploadModel from '@/bcsc-theme/features/verify/send-video/useEvidenceUploadModel'
import { getVideoMetadata } from '@/bcsc-theme/utils/file-info'
import { BCState } from '@/store'
import readFileInChunks from '@/utils/read-file'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { VerificationVideoCache } from './VideoReviewScreen'

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/utils/read-file')
jest.mock('@/bcsc-theme/utils/file-info', () => ({
  getVideoMetadata: jest.fn(),
}))
jest.mock('@/bcsc-theme/features/verify/send-video/VideoReviewScreen', () => ({
  VerificationVideoCache: {
    getCache: jest.fn(),
    clearCache: jest.fn(),
  },
}))
jest.mock('react-native-fs', () => ({
  stat: jest.fn(),
}))
jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

const mockUpdateAccountFlags = jest.fn().mockResolvedValue(undefined)
jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    updateAccountFlags: mockUpdateAccountFlags,
  })),
}))

jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: () => ({
    startLoading: jest.fn(),
    stopLoading: jest.fn(),
    updateLoadingMessage: jest.fn(),
    isLoading: false,
  }),
}))

describe('useEvidenceUploadModel', () => {
  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
  const mockNavigation = {
    navigate: jest.fn(),
    dispatch: jest.fn(),
  } as any

  const mockEvidenceApi = {
    uploadPhotoEvidenceMetadata: jest.fn(),
    uploadVideoEvidenceMetadata: jest.fn(),
    uploadPhotoEvidenceBinary: jest.fn(),
    uploadVideoEvidenceBinary: jest.fn(),
    sendEvidenceMetadata: jest.fn(),
    sendVerificationRequest: jest.fn(),
  }

  const baseStore: any = {
    bcsc: {
      photoPath: undefined,
      videoPath: undefined,
      videoThumbnailPath: undefined,
      videoDuration: undefined,
      prompts: [],
      photoMetadata: undefined,
    },
    bcscSecure: {
      verificationRequestId: undefined,
      verificationRequestSha: undefined,
      additionalEvidenceData: [],
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([baseStore as BCState, jest.fn()])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)

    const useApiMock = jest.mocked(useApi)
    useApiMock.mockReturnValue({ evidence: mockEvidenceApi } as any)
  })

  describe('isReady', () => {
    it('should return false when photo, video, and thumbnail are missing', () => {
      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      expect(result.current.isReady).toBe(false)
    })

    it('should return false when only some media paths are present', () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([
        {
          ...baseStore,
          bcsc: { ...baseStore.bcsc, photoPath: '/photo.jpg', videoPath: '/video.mp4' },
        } as BCState,
        jest.fn(),
      ])

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      expect(result.current.isReady).toBe(false)
    })

    it('should return true when photo, video, and thumbnail paths are all present', () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([
        {
          ...baseStore,
          bcsc: {
            ...baseStore.bcsc,
            photoPath: '/photo.jpg',
            videoPath: '/video.mp4',
            videoThumbnailPath: '/thumb.jpg',
          },
        } as BCState,
        jest.fn(),
      ])

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      expect(result.current.isReady).toBe(true)
    })
  })

  describe('handleSend', () => {
    it('should log error when photo or video data is missing', async () => {
      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during sending information to Service BC',
        expect.objectContaining({ message: 'Missing photo or video data' })
      )
    })

    it('should log error when prompts are missing', async () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([
        {
          ...baseStore,
          bcsc: {
            ...baseStore.bcsc,
            photoPath: '/photo.jpg',
            videoPath: '/video.mp4',
            videoDuration: 10,
            prompts: [],
          },
        } as BCState,
        jest.fn(),
      ])

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during sending information to Service BC',
        expect.objectContaining({ message: 'Missing video prompts data' })
      )
    })

    it('should log error when verification request data is missing', async () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([
        {
          ...baseStore,
          bcsc: {
            ...baseStore.bcsc,
            photoPath: '/photo.jpg',
            videoPath: '/video.mp4',
            videoDuration: 10,
            prompts: [{ text: 'smile' }],
          },
        } as BCState,
        jest.fn(),
      ])

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during sending information to Service BC',
        expect.objectContaining({ message: 'Missing verification request data' })
      )
    })

    it('should complete the full upload flow and navigate on success', async () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([
        {
          ...baseStore,
          bcsc: {
            ...baseStore.bcsc,
            photoPath: '/photo.jpg',
            videoPath: '/video.mp4',
            videoDuration: 10,
            prompts: [{ text: 'smile' }],
            photoMetadata: { some: 'metadata' },
          },
          bcscSecure: {
            ...baseStore.bcscSecure,
            verificationRequestId: 'req-123',
            verificationRequestSha: 'sha-456',
            additionalEvidenceData: [],
          },
        } as BCState,
        jest.fn(),
      ])

      const mockReadFile = jest.mocked(readFileInChunks)
      mockReadFile.mockResolvedValue(new Uint8Array([1, 2, 3]))

      const mockGetCache = jest.mocked(VerificationVideoCache.getCache)
      mockGetCache.mockResolvedValue(new Uint8Array([4, 5, 6]))

      const RNFS = require('react-native-fs')
      RNFS.stat.mockResolvedValue({ mtime: new Date('2026-01-01') })

      const mockGetVideoMeta = jest.mocked(getVideoMetadata)
      mockGetVideoMeta.mockResolvedValue({ duration: 10 } as any)

      mockEvidenceApi.uploadPhotoEvidenceMetadata.mockResolvedValue({ upload_uri: 'photo-uri' })
      mockEvidenceApi.uploadVideoEvidenceMetadata.mockResolvedValue({ upload_uri: 'video-uri' })
      mockEvidenceApi.uploadPhotoEvidenceBinary.mockResolvedValue(undefined)
      mockEvidenceApi.uploadVideoEvidenceBinary.mockResolvedValue(undefined)
      mockEvidenceApi.sendVerificationRequest.mockResolvedValue(undefined)

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockEvidenceApi.uploadPhotoEvidenceMetadata).toHaveBeenCalled()
      expect(mockEvidenceApi.uploadVideoEvidenceMetadata).toHaveBeenCalled()
      expect(mockEvidenceApi.uploadPhotoEvidenceBinary).toHaveBeenCalledWith('photo-uri', expect.anything())
      expect(mockEvidenceApi.uploadVideoEvidenceBinary).toHaveBeenCalledWith('video-uri', expect.anything())
      expect(mockEvidenceApi.sendVerificationRequest).toHaveBeenCalledWith('req-123', {
        upload_uris: ['photo-uri', 'video-uri'],
        sha256: 'sha-456',
      })
      expect(mockUpdateAccountFlags).toHaveBeenCalledWith({ userSubmittedVerificationVideo: true })
      expect(mockNavigation.dispatch).toHaveBeenCalled()
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should log error when video cache is missing', async () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([
        {
          ...baseStore,
          bcsc: {
            ...baseStore.bcsc,
            photoPath: '/photo.jpg',
            videoPath: '/video.mp4',
            videoDuration: 10,
            prompts: [{ text: 'smile' }],
          },
          bcscSecure: {
            ...baseStore.bcscSecure,
            verificationRequestId: 'req-123',
            verificationRequestSha: 'sha-456',
            additionalEvidenceData: [],
          },
        } as BCState,
        jest.fn(),
      ])

      jest.mocked(readFileInChunks).mockResolvedValue(new Uint8Array([1, 2, 3]))
      jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(undefined as any)

      const RNFS = require('react-native-fs')
      RNFS.stat.mockResolvedValue({ mtime: new Date('2026-01-01') })

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during sending information to Service BC',
        expect.objectContaining({ message: 'Cache missing video data' })
      )
    })

    it('should process additional evidence and include in upload', async () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([
        {
          ...baseStore,
          bcsc: {
            ...baseStore.bcsc,
            photoPath: '/photo.jpg',
            videoPath: '/video.mp4',
            videoDuration: 10,
            prompts: [{ text: 'smile' }],
            photoMetadata: { some: 'metadata' },
          },
          bcscSecure: {
            ...baseStore.bcscSecure,
            verificationRequestId: 'req-123',
            verificationRequestSha: 'sha-456',
            additionalEvidenceData: [
              {
                evidenceType: { evidence_type: 'drivers_licence' },
                documentNumber: 'DL123',
                metadata: [
                  { label: 'front', file_path: '/front.jpg', side: 'front' },
                ],
              },
            ],
          },
        } as BCState,
        jest.fn(),
      ])

      const mockReadFile = jest.mocked(readFileInChunks)
      mockReadFile.mockResolvedValue(new Uint8Array([1, 2, 3]))

      jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(new Uint8Array([4, 5, 6]))

      const RNFS = require('react-native-fs')
      RNFS.stat.mockResolvedValue({ mtime: new Date('2026-01-01') })

      jest.mocked(getVideoMetadata).mockResolvedValue({ duration: 10 } as any)

      mockEvidenceApi.sendEvidenceMetadata.mockResolvedValue([
        { label: 'front', upload_uri: 'evidence-uri-front' },
      ])
      mockEvidenceApi.uploadPhotoEvidenceMetadata.mockResolvedValue({ upload_uri: 'photo-uri' })
      mockEvidenceApi.uploadVideoEvidenceMetadata.mockResolvedValue({ upload_uri: 'video-uri' })
      mockEvidenceApi.uploadPhotoEvidenceBinary.mockResolvedValue(undefined)
      mockEvidenceApi.uploadVideoEvidenceBinary.mockResolvedValue(undefined)
      mockEvidenceApi.sendVerificationRequest.mockResolvedValue(undefined)

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockEvidenceApi.sendEvidenceMetadata).toHaveBeenCalledWith({
        type: 'drivers_licence',
        number: 'DL123',
        images: [{ label: 'front', side: 'front', file_path: undefined }],
      })
      expect(mockEvidenceApi.uploadPhotoEvidenceBinary).toHaveBeenCalledWith('evidence-uri-front', expect.anything())
      expect(mockEvidenceApi.sendVerificationRequest).toHaveBeenCalledWith('req-123', {
        upload_uris: ['photo-uri', 'video-uri', 'evidence-uri-front'],
        sha256: 'sha-456',
      })
      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })
})
