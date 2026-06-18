import useApi from '@/bcsc-theme/api/hooks/useApi'
import useEvidenceUploadModel from '@/bcsc-theme/features/verify/send-video/useEvidenceUploadModel'
import { getVideoMetadata } from '@/bcsc-theme/utils/file-info'
import { BCState } from '@/store'
import readFileInChunks from '@/utils/read-file'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import RNFS from 'react-native-fs'
import { VerificationVideoCache } from './VideoReviewScreen'

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/utils/read-file')
jest.mock('@/bcsc-theme/utils/file-info', () => ({
  getVideoMetadata: jest.fn(),
}))
jest.mock('@/utils/analytics/analytics-singleton', () => ({
  Analytics: {
    trackErrorEvent: jest.fn(),
    trackAlertDisplayEvent: jest.fn(),
    trackAlertActionEvent: jest.fn(),
  },
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
const mockUpdateVerificationRequest = jest.fn().mockResolvedValue(undefined)
jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    updateAccountFlags: mockUpdateAccountFlags,
    updateVerificationRequest: mockUpdateVerificationRequest,
  })),
}))

jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: () => ({
    startLoading: jest.fn().mockReturnValue(jest.fn()),
    updateLoadingMessage: jest.fn(),
    isLoading: false,
  }),
}))

const mockFileUploadErrorAlert = jest.fn()
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({
    fileUploadErrorAlert: mockFileUploadErrorAlert,
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
    createVerificationRequest: jest.fn(),
    getVerificationRequestPrompts: jest.fn(),
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
    it('should emit fileUploadErrorAlert when photo or video data is missing', async () => {
      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockFileUploadErrorAlert).toHaveBeenCalled()
    })

    it('should emit fileUploadErrorAlert when prompts are missing', async () => {
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

      expect(mockFileUploadErrorAlert).toHaveBeenCalled()
    })

    it('routes back to Verification Method Selection and surfaces the error alert when sha is missing', async () => {
      // IAS rotates prompts on every GET /prompts, so refetching here would
      // invalidate the user's recorded video (different sha → "invalid sha256"
      // on finalize). Instead, clear the broken local state, bounce back to
      // Verification Method Selection, and let the existing FILE_UPLOAD_ERROR
      // alert pop on top of that screen so the user knows why they were moved.
      const mockDispatch = jest.fn()
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
            verificationRequestId: 'persisted-id',
            verificationRequestSha: undefined,
            additionalEvidenceData: [],
          },
        } as BCState,
        mockDispatch,
      ])

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      // No evidence API calls at all — recovery must not refetch prompts.
      expect(mockEvidenceApi.getVerificationRequestPrompts).not.toHaveBeenCalled()
      expect(mockEvidenceApi.createVerificationRequest).not.toHaveBeenCalled()
      expect(mockEvidenceApi.uploadPhotoEvidenceMetadata).not.toHaveBeenCalled()
      expect(mockEvidenceApi.sendVerificationRequest).not.toHaveBeenCalled()
      // Local state cleared: id + sha both nulled so the next handlePressSendVideo
      // calls createVerificationRequest and gets a fresh, valid request to record
      // against. The orphaned server-side id is TTL'd by IAS.
      expect(mockUpdateVerificationRequest).toHaveBeenCalledWith(null, null)
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: expect.stringContaining('updateVideoPrompts') })
      )
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: expect.stringContaining('clearPhotoAndVideo') })
      )
      // Navigation reset to Verification Method Selection.
      expect(mockNavigation.dispatch).toHaveBeenCalled()
      // Error alert pops on top of the destination screen.
      expect(mockFileUploadErrorAlert).toHaveBeenCalled()
    })

    it('routes back to Verification Method Selection and surfaces the error alert when both id and sha are missing', async () => {
      // Same path applies for the missing-id case (e.g. a force-kill that lost
      // the id and sha together, or a Bogus dev button). We can't reuse the
      // recorded video either way, so just clear, bounce, and alert.
      const mockDispatch = jest.fn()
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
        } as BCState,
        mockDispatch,
      ])

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockEvidenceApi.getVerificationRequestPrompts).not.toHaveBeenCalled()
      expect(mockEvidenceApi.createVerificationRequest).not.toHaveBeenCalled()
      expect(mockUpdateVerificationRequest).toHaveBeenCalledWith(null, null)
      expect(mockNavigation.dispatch).toHaveBeenCalled()
      expect(mockFileUploadErrorAlert).toHaveBeenCalled()
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
      mockReadFile.mockResolvedValue(Buffer.from([1, 2, 3]))

      const mockGetCache = jest.mocked(VerificationVideoCache.getCache)
      mockGetCache.mockResolvedValue(Buffer.from([4, 5, 6]))

      jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)

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
    })

    it('should emit fileUploadErrorAlert when video cache is missing', async () => {
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

      jest.mocked(readFileInChunks).mockResolvedValue(Buffer.from([1, 2, 3]))
      jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(undefined as any)

      jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockFileUploadErrorAlert).toHaveBeenCalled()
    })

    it('should emit fileUploadErrorAlert when additional evidence processing fails', async () => {
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
                metadata: [{ label: 'front', file_path: '/front.jpg', side: 'front' }],
              },
            ],
          },
        } as BCState,
        jest.fn(),
      ])

      jest.mocked(readFileInChunks).mockResolvedValue(Buffer.from([1, 2, 3]))
      jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(Buffer.from([4, 5, 6]))
      jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)
      jest.mocked(getVideoMetadata).mockResolvedValue({ duration: 10 } as any)
      mockEvidenceApi.sendEvidenceMetadata.mockRejectedValue(new Error('Evidence metadata failed'))

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockFileUploadErrorAlert).toHaveBeenCalled()
      expect(mockEvidenceApi.uploadPhotoEvidenceMetadata).not.toHaveBeenCalled()
    })

    it('should emit fileUploadErrorAlert when metadata upload fails', async () => {
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

      jest.mocked(readFileInChunks).mockResolvedValue(Buffer.from([1, 2, 3]))
      jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(Buffer.from([4, 5, 6]))
      jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)
      jest.mocked(getVideoMetadata).mockResolvedValue({ duration: 10 } as any)
      mockEvidenceApi.uploadPhotoEvidenceMetadata.mockRejectedValue(new Error('Metadata upload failed'))

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockFileUploadErrorAlert).toHaveBeenCalled()
      expect(mockEvidenceApi.uploadPhotoEvidenceBinary).not.toHaveBeenCalled()
    })

    it('should emit fileUploadErrorAlert when binary upload fails', async () => {
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

      jest.mocked(readFileInChunks).mockResolvedValue(Buffer.from([1, 2, 3]))
      jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(Buffer.from([4, 5, 6]))
      jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)
      jest.mocked(getVideoMetadata).mockResolvedValue({ duration: 10 } as any)

      mockEvidenceApi.uploadPhotoEvidenceMetadata.mockResolvedValue({ upload_uri: 'photo-uri' })
      mockEvidenceApi.uploadVideoEvidenceMetadata.mockResolvedValue({ upload_uri: 'video-uri' })
      mockEvidenceApi.uploadPhotoEvidenceBinary.mockRejectedValue(new Error('Upload failed'))

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockFileUploadErrorAlert).toHaveBeenCalled()
      expect(mockEvidenceApi.sendVerificationRequest).not.toHaveBeenCalled()
    })

    it('should emit fileUploadErrorAlert when finalization fails', async () => {
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

      jest.mocked(readFileInChunks).mockResolvedValue(Buffer.from([1, 2, 3]))
      jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(Buffer.from([4, 5, 6]))
      jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)
      jest.mocked(getVideoMetadata).mockResolvedValue({ duration: 10 } as any)

      mockEvidenceApi.uploadPhotoEvidenceMetadata.mockResolvedValue({ upload_uri: 'photo-uri' })
      mockEvidenceApi.uploadVideoEvidenceMetadata.mockResolvedValue({ upload_uri: 'video-uri' })
      mockEvidenceApi.uploadPhotoEvidenceBinary.mockResolvedValue(undefined)
      mockEvidenceApi.uploadVideoEvidenceBinary.mockResolvedValue(undefined)
      mockEvidenceApi.sendVerificationRequest.mockRejectedValue(new Error('Verification failed'))

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockFileUploadErrorAlert).toHaveBeenCalled()
      expect(mockUpdateAccountFlags).not.toHaveBeenCalled()
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
                metadata: [{ label: 'front', file_path: '/front.jpg', side: 'front' }],
              },
            ],
          },
        } as BCState,
        jest.fn(),
      ])

      const mockReadFile = jest.mocked(readFileInChunks)
      mockReadFile.mockResolvedValue(Buffer.from([1, 2, 3]))

      jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(Buffer.from([4, 5, 6]))

      jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)

      jest.mocked(getVideoMetadata).mockResolvedValue({ duration: 10 } as any)

      mockEvidenceApi.sendEvidenceMetadata.mockResolvedValue([
        { label: 'FRONT_SIDE', upload_uri: 'evidence-uri-front' },
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
        images: [{ label: 'FRONT_SIDE', side: 'front', file_path: undefined }],
      })
      expect(mockEvidenceApi.uploadPhotoEvidenceBinary).toHaveBeenCalledWith('evidence-uri-front', expect.anything())
      expect(mockEvidenceApi.sendVerificationRequest).toHaveBeenCalledWith('req-123', {
        upload_uris: ['photo-uri', 'video-uri', 'evidence-uri-front'],
        sha256: 'sha-456',
      })
    })
  })
})
