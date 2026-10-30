import useApi from '@/bcsc-theme/api/hooks/useApi'
import useEvidenceUploadModel, {
  resetInFlightSubmitForTests,
} from '@/bcsc-theme/features/verify/send-video/useEvidenceUploadModel'
import { useEvidenceService } from '@/bcsc-theme/services/hooks/useEvidenceService'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { getVideoMetadata, removeFileSafely } from '@/bcsc-theme/utils/file-info'
import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { BCDispatchAction, BCState } from '@/store'
import readFileInChunks from '@/utils/read-file'
import * as Bifold from '@bifold/core'
import * as Navigation from '@react-navigation/native'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import RNFS from 'react-native-fs'
import { VerificationVideoCache } from './VideoReviewScreen'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/bcsc-theme/services/hooks/useEvidenceService')
jest.mock('@/utils/read-file')
jest.mock('@/bcsc-theme/utils/file-info', () => ({
  getVideoMetadata: jest.fn(),
  removeFileSafely: jest.fn().mockResolvedValue(undefined),
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

const mockFileUploadErrorAlert = jest.fn()
const mockAlreadyVerifiedAlert = jest.fn()
// Takes the screen's navigation, so a test with two screens can hand each its own alert and see which one fired
const mockUseAlerts = jest.fn()
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: (navigation: unknown) => mockUseAlerts(navigation),
}))

// Left unmocked so the real useAlreadyVerifiedRecovery runs and its navigation is asserted here;
// only the token exchange it depends on is stubbed.
const mockCheckVerificationStatus = jest.fn()
jest.mock('@/bcsc-theme/services/hooks/useTokenService', () => ({
  __esModule: true,
  useTokenService: () => ({ checkVerificationStatus: mockCheckVerificationStatus }),
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
    goBack: jest.fn(),
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

  // A plausible capture date and permanent file_path — the default photoMetadata fixture so
  // tests aren't tripped up by the send-video selfie date-plausibility guard (#4338). Tests
  // targeting that guard override this.
  const plausiblePhotoMetadata = {
    label: 'front',
    content_type: 'image/jpeg',
    content_length: 1,
    date: 1_782_000_000,
    sha256: 'selfie-sha',
    file_path: '/permanent/selfie.jpg',
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
    mockUseAlerts.mockReturnValue({
      fileUploadErrorAlert: mockFileUploadErrorAlert,
      alreadyVerifiedAlert: mockAlreadyVerifiedAlert,
    })

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([baseStore as BCState, jest.fn()])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)

    // useEvidenceUpload (additional evidence) still reads the raw API; the model's own calls go through the
    // service, which spreads the same API in production
    const useApiMock = jest.mocked(useApi)
    useApiMock.mockReturnValue({ evidence: mockEvidenceApi } as any)
    jest.mocked(useEvidenceService).mockReturnValue(mockEvidenceApi as any)
  })

  afterEach(() => {
    // Every case settles its run: one left in flight would be joined by the next case for req-123 and time it out
    const { wasInFlight } = resetInFlightSubmitForTests()
    expect(wasInFlight).toBe(false)
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
    it.each(['success', 'failure'] as const)(
      'advances only after completed stages and handles finalization %s',
      async (outcome) => {
        const video = deferred<Buffer>()
        const documents = deferred<{ label: string; upload_uri: string }[]>()
        const videoUpload = deferred<void>()
        const documentUpload = deferred<void>()
        const submission = deferred<void>()
        const accountFlags = deferred<void>()

        jest.mocked(Bifold.useStore).mockReturnValue([
          {
            ...baseStore,
            bcsc: {
              ...baseStore.bcsc,
              photoPath: '/photo.jpg',
              videoPath: '/video.mp4',
              videoDuration: 10,
              prompts: [{ text: 'smile' }],
              photoMetadata: plausiblePhotoMetadata,
            },
            bcscSecure: {
              ...baseStore.bcscSecure,
              verificationRequestId: 'req-123',
              verificationRequestSha: 'sha-456',
              additionalEvidenceData: [
                {
                  evidenceType: { evidence_type: 'drivers_licence' },
                  documentNumber: 'DL123',
                  metadata: [{ label: 'front', file_path: '/front.jpg', date: 1_782_000_000 }],
                },
              ],
            },
          } as BCState,
          jest.fn(),
        ])
        jest.mocked(readFileInChunks).mockResolvedValue(Buffer.from([1, 2, 3]))
        jest.mocked(VerificationVideoCache.getCache).mockReturnValueOnce(video.promise)
        jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)
        jest.mocked(getVideoMetadata).mockResolvedValue({ duration: 10 } as any)
        mockEvidenceApi.sendEvidenceMetadata.mockReturnValueOnce(documents.promise)
        mockEvidenceApi.uploadPhotoEvidenceMetadata.mockResolvedValue({ upload_uri: 'photo-uri' })
        mockEvidenceApi.uploadVideoEvidenceMetadata.mockResolvedValue({ upload_uri: 'video-uri' })
        mockEvidenceApi.uploadPhotoEvidenceBinary
          .mockResolvedValueOnce(undefined)
          .mockReturnValueOnce(documentUpload.promise)
        mockEvidenceApi.uploadVideoEvidenceBinary.mockReturnValueOnce(videoUpload.promise)
        mockEvidenceApi.sendVerificationRequest.mockReturnValueOnce(submission.promise)

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))
        let pending!: Promise<void>
        await act(async () => {
          pending = result.current.handleSend()
        })
        expect(result.current.progressPercent).toBe(0)
        expect(result.current.uploadMessage).toBe('BCSC.SendVideo.UploadProgress.PreparingVideo')

        await act(async () => {
          video.resolve(Buffer.from([4, 5, 6]))
        })
        expect(result.current.progressPercent).toBe(25)
        expect(result.current.uploadMessage).toBe('BCSC.SendVideo.UploadProgress.PreparingDocuments')

        await act(async () => {
          documents.resolve([{ label: 'FRONT_SIDE', upload_uri: 'document-uri' }])
        })
        expect(result.current.progressPercent).toBe(50)
        expect(result.current.uploadMessage).toBe('BCSC.SendVideo.UploadProgress.UploadingFiles')

        await act(async () => {
          videoUpload.resolve()
        })
        expect(result.current.progressPercent).toBe(50)
        expect(mockEvidenceApi.sendVerificationRequest).not.toHaveBeenCalled()

        await act(async () => {
          documentUpload.resolve()
        })
        expect(result.current.progressPercent).toBe(75)
        expect(result.current.uploadMessage).toBe('BCSC.SendVideo.UploadProgress.FinalizingVerification')

        if (outcome === 'failure') {
          await act(async () => {
            submission.reject(new Error('Submission failed'))
            await pending
          })
          expect(result.current.progressPercent).toBe(75)
          expect(result.current.uploadMessage).toBe('BCSC.SendVideo.UploadProgress.FinalizingVerification')
          expect(mockFileUploadErrorAlert).toHaveBeenCalled()
          expect(mockNavigation.dispatch).not.toHaveBeenCalled()
        } else {
          mockUpdateAccountFlags.mockReturnValueOnce(accountFlags.promise)
          await act(async () => {
            submission.resolve()
          })
          expect(result.current.progressPercent).toBe(75)
          expect(mockNavigation.dispatch).not.toHaveBeenCalled()

          await act(async () => {
            accountFlags.resolve()
            await pending
          })
          expect(result.current.progressPercent).toBe(100)
          expect(result.current.uploadMessage).toBe('BCSC.SendVideo.UploadProgress.FinalizingVerification')
          expect(mockNavigation.dispatch).toHaveBeenCalled()
          expect(mockFileUploadErrorAlert).not.toHaveBeenCalled()
        }
        expect(result.current.isUploading).toBe(false)
      }
    )

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
            photoMetadata: plausiblePhotoMetadata,
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
      expect(mockUpdateVerificationRequest).toHaveBeenCalledWith(undefined, null)
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
            photoMetadata: plausiblePhotoMetadata,
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
      expect(mockUpdateVerificationRequest).toHaveBeenCalledWith(undefined, null)
      expect(mockNavigation.dispatch).toHaveBeenCalled()
      expect(mockFileUploadErrorAlert).toHaveBeenCalled()
    })

    it('should complete the full upload flow and navigate on success', async () => {
      const mockStoreDispatch = jest.fn()
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
            photoMetadata: plausiblePhotoMetadata,
          },
          bcscSecure: {
            ...baseStore.bcscSecure,
            verificationRequestId: 'req-123',
            verificationRequestSha: 'sha-456',
            additionalEvidenceData: [],
          },
        } as BCState,
        mockStoreDispatch,
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
      mockEvidenceApi.sendVerificationRequest.mockResolvedValue({
        id: 'req-123',
        status: 'pending',
        avg_turnaround_time_message: 'within 24 hours',
      })

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockEvidenceApi.uploadPhotoEvidenceMetadata).toHaveBeenCalled()
      expect(mockEvidenceApi.uploadVideoEvidenceMetadata).toHaveBeenCalled()
      expect(mockEvidenceApi.uploadPhotoEvidenceBinary).toHaveBeenCalledWith('photo-uri', expect.anything(), 'image')
      expect(mockEvidenceApi.uploadVideoEvidenceBinary).toHaveBeenCalledWith('video-uri', expect.anything())
      expect(mockEvidenceApi.sendVerificationRequest).toHaveBeenCalledWith('req-123', {
        upload_uris: ['photo-uri', 'video-uri'],
        sha256: 'sha-456',
      })
      expect(mockUpdateAccountFlags).toHaveBeenCalledWith({ userSubmittedVerificationVideo: true })
      expect(result.current.progressPercent).toBe(100)
      expect(mockStoreDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_VIDEO_SUBMITTED_AT,
        payload: [expect.any(Date)],
      })
      // Navigates to the confirmation screen, forwarding the API turnaround message as a route param
      expect(mockNavigation.dispatch).toHaveBeenCalled()
      const dispatchArg = mockNavigation.dispatch.mock.calls[0][0]
      const resetRoutes = dispatchArg.payload?.routes ?? dispatchArg.routes
      expect(resetRoutes[0].params).toEqual({
        avgTurnaroundTimeMessage: 'within 24 hours',
      })
    })

    it('rewrites an isom video brand to mp42 before hashing and uploads the same bytes', async () => {
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
            photoMetadata: plausiblePhotoMetadata,
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

      // ftyp header written by VisionCamera v5 / Media3 on Android: major brand isom
      const isomVideo = Buffer.from([
        0x00,
        0x00,
        0x00,
        0x1c,
        ...Buffer.from('ftypisom'),
        0x00,
        0x02,
        0x00,
        0x00,
        ...Buffer.from('isomiso2mp41'),
      ])
      jest.mocked(readFileInChunks).mockResolvedValue(Buffer.from([1, 2, 3]))
      jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(isomVideo)
      jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)

      let hashedBrand: string | undefined
      jest.mocked(getVideoMetadata).mockImplementation(async (bytes: Buffer) => {
        hashedBrand = bytes.subarray(8, 12).toString('ascii')
        return { duration: 10 } as any
      })

      mockEvidenceApi.uploadPhotoEvidenceMetadata.mockResolvedValue({ upload_uri: 'photo-uri' })
      mockEvidenceApi.uploadVideoEvidenceMetadata.mockResolvedValue({ upload_uri: 'video-uri' })
      mockEvidenceApi.uploadPhotoEvidenceBinary.mockResolvedValue(undefined)
      mockEvidenceApi.uploadVideoEvidenceBinary.mockResolvedValue(undefined)
      mockEvidenceApi.sendVerificationRequest.mockResolvedValue({ id: 'req-123', status: 'pending' })

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(hashedBrand).toBe('mp42')
      const uploadedVideo: Buffer = mockEvidenceApi.uploadVideoEvidenceBinary.mock.calls[0][1]
      expect(uploadedVideo.subarray(8, 12).toString('ascii')).toBe('mp42')
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
            photoMetadata: plausiblePhotoMetadata,
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
            photoMetadata: plausiblePhotoMetadata,
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
            photoMetadata: plausiblePhotoMetadata,
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

    describe('when the evidence endpoint rejects the upload as already approved (409)', () => {
      // IAS returns 409 "Registration Request already approved" once the registration request behind
      // the device_code is approved, so the upload is redundant rather than failed.
      const conflictError = new AppError(
        'Conflict',
        { category: ErrorCategory.VERIFICATION, appEvent: AppEventCode.ALREADY_VERIFIED, statusCode: 2410 },
        {
          cause: new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, { status: 409 } as any),
          track: false,
        }
      )

      const arrangeReadySend = () => {
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
              photoMetadata: plausiblePhotoMetadata,
            },
            bcscSecure: {
              ...baseStore.bcscSecure,
              verificationRequestId: 'req-123',
              verificationRequestSha: 'sha-456',
              deviceCode: 'device-code',
              userCode: 'user-code',
              additionalEvidenceData: [],
            },
          } as BCState,
          jest.fn(),
        ])

        jest.mocked(readFileInChunks).mockResolvedValue(Buffer.from([1, 2, 3]))
        jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(Buffer.from([4, 5, 6]))
        jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)
        jest.mocked(getVideoMetadata).mockResolvedValue({ duration: 10 } as any)
        mockEvidenceApi.uploadVideoEvidenceMetadata.mockResolvedValue({ upload_uri: 'video-uri' })
        mockEvidenceApi.uploadPhotoEvidenceMetadata.mockRejectedValue(conflictError)
      }

      it('attempts recovery and returns early without the file upload error modal', async () => {
        arrangeReadySend()
        mockCheckVerificationStatus.mockResolvedValue(true)

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

        await act(async () => {
          await result.current.handleSend()
        })

        expect(mockCheckVerificationStatus).toHaveBeenCalledWith('device-code', 'user-code')
        expect(mockFileUploadErrorAlert).not.toHaveBeenCalled()
        expect(mockEvidenceApi.uploadPhotoEvidenceBinary).not.toHaveBeenCalled()
        expect(mockEvidenceApi.sendVerificationRequest).not.toHaveBeenCalled()
      })

      it('navigates to VerificationSuccess when recovery succeeds', async () => {
        arrangeReadySend()
        mockCheckVerificationStatus.mockResolvedValue(true)

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

        await act(async () => {
          await result.current.handleSend()
        })

        expect(Navigation.CommonActions.reset).toHaveBeenCalledWith(
          expect.objectContaining({ routes: [{ name: BCSCScreens.VerificationSuccess }] })
        )
        expect(mockAlreadyVerifiedAlert).not.toHaveBeenCalled()
      })

      it('emits alreadyVerifiedAlert with the original error when recovery fails', async () => {
        arrangeReadySend()
        mockCheckVerificationStatus.mockResolvedValue(false)

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

        await act(async () => {
          await result.current.handleSend()
        })

        expect(mockAlreadyVerifiedAlert).toHaveBeenCalledWith(conflictError)
        expect(mockFileUploadErrorAlert).not.toHaveBeenCalled()
        expect(Navigation.CommonActions.reset).not.toHaveBeenCalled()
      })
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
            photoMetadata: plausiblePhotoMetadata,
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

      const uploadContext = { media_kind: 'image', media_stage: 'binary', media_bytes: 3, media_format: 'image/jpeg' }
      const innerError = new AppError(
        'Network Error',
        { category: ErrorCategory.NETWORK, appEvent: AppEventCode.NO_INTERNET, statusCode: 2100 },
        { cause: new AxiosError('Network Error', 'ERR_NETWORK'), context: uploadContext, track: false }
      )
      mockEvidenceApi.uploadPhotoEvidenceBinary.mockRejectedValue(innerError)

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleSend()
      })

      expect(mockFileUploadErrorAlert).toHaveBeenCalled()
      expect((mockFileUploadErrorAlert.mock.calls[0][0] as AppError).toJSON().context).toEqual(
        expect.objectContaining(uploadContext)
      )
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
            photoMetadata: plausiblePhotoMetadata,
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

    describe('when the submit is reconciled against the server record (see useEvidenceService)', () => {
      const arrangeReadySend = () => {
        jest.mocked(Bifold).useStore.mockReturnValue([
          {
            ...baseStore,
            bcsc: {
              ...baseStore.bcsc,
              photoPath: '/photo.jpg',
              videoPath: '/video.mp4',
              videoDuration: 10,
              prompts: [{ text: 'smile' }],
              photoMetadata: plausiblePhotoMetadata,
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
      }

      it('submits through the evidence service rather than the raw API', async () => {
        arrangeReadySend()
        const serviceSend = jest.fn().mockResolvedValue({ id: 'req-123', status: 'pending' })
        jest
          .mocked(useEvidenceService)
          .mockReturnValue({ ...mockEvidenceApi, sendVerificationRequest: serviceSend } as any)

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

        await act(async () => {
          await result.current.handleSend()
        })

        expect(serviceSend).toHaveBeenCalledWith('req-123', {
          upload_uris: ['photo-uri', 'video-uri'],
          sha256: 'sha-456',
        })
        expect(mockEvidenceApi.sendVerificationRequest).not.toHaveBeenCalled()
      })

      it('continues to SuccessfullySent with the read-back turnaround message when the request was already pending', async () => {
        arrangeReadySend()
        mockEvidenceApi.sendVerificationRequest.mockResolvedValue({
          id: 'req-123',
          status: 'pending',
          avg_turnaround_time_message: 'within 2 business days',
        })

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

        await act(async () => {
          await result.current.handleSend()
        })

        expect(mockUpdateAccountFlags).toHaveBeenCalledWith({ userSubmittedVerificationVideo: true })
        expect(Navigation.CommonActions.reset).toHaveBeenCalledWith(
          expect.objectContaining({
            routes: [
              { name: BCSCScreens.SuccessfullySent, params: { avgTurnaroundTimeMessage: 'within 2 business days' } },
            ],
          })
        )
        expect(mockFileUploadErrorAlert).not.toHaveBeenCalled()
      })

      it('routes to CancelledReview with the agent reason instead of the success screen when the request was already cancelled', async () => {
        arrangeReadySend()
        mockEvidenceApi.sendVerificationRequest.mockResolvedValue({
          id: 'req-123',
          status: 'cancelled',
          status_message: 'Video too dark',
        })

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

        await act(async () => {
          await result.current.handleSend()
        })

        expect(Navigation.CommonActions.reset).toHaveBeenCalledWith(
          expect.objectContaining({
            routes: [{ name: BCSCScreens.CancelledReview, params: { agentReason: 'Video too dark' } }],
          })
        )
        expect(mockUpdateAccountFlags).not.toHaveBeenCalled()
        expect(mockFileUploadErrorAlert).not.toHaveBeenCalled()
        expect(result.current.progressPercent).toBe(100)
      })

      it('shows no second modal when the service already surfaced the finalization failure', async () => {
        arrangeReadySend()
        const surfacedError = new AppError(
          'Server error',
          { category: ErrorCategory.NETWORK, appEvent: AppEventCode.SERVER_ERROR, statusCode: 2101 },
          { track: false }
        )
        surfacedError.handled = true
        mockEvidenceApi.sendVerificationRequest.mockRejectedValue(surfacedError)

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

        await act(async () => {
          await result.current.handleSend()
        })

        expect(mockFileUploadErrorAlert).not.toHaveBeenCalled()
        expect(mockNavigation.dispatch).not.toHaveBeenCalled()
        expect(mockUpdateAccountFlags).not.toHaveBeenCalled()
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Error during evidence upload process'),
          surfacedError
        )
      })
    })

    describe('when a second UploadingScreen mounts while a submit is in flight (#4928)', () => {
      // "Use Video" resets the stack with key-less routes, so a second press while the reset is still landing
      // mounts a second UploadingScreen, which submits on mount as well. Both would PUT the same verification
      // request, and IAS rejects the second as a duplicate (500) after the first went through. The second joins.
      const secondNavigation = { navigate: jest.fn(), dispatch: jest.fn(), goBack: jest.fn() } as any

      const arrangeReadySend = () => {
        jest.mocked(Bifold).useStore.mockReturnValue([
          {
            ...baseStore,
            bcsc: {
              ...baseStore.bcsc,
              photoPath: '/photo.jpg',
              videoPath: '/video.mp4',
              videoDuration: 10,
              prompts: [{ text: 'smile' }],
              photoMetadata: plausiblePhotoMetadata,
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
      }

      it('submits once, mirrors the run on the newest screen and lets only that screen navigate', async () => {
        arrangeReadySend()
        const submission = deferred<{ id: string; status: string }>()
        mockEvidenceApi.sendVerificationRequest.mockReturnValueOnce(submission.promise)

        const first = renderHook(() => useEvidenceUploadModel(mockNavigation))
        let firstSend!: Promise<void>
        await act(async () => {
          firstSend = first.result.current.handleSend()
        })
        await waitFor(() => expect(mockEvidenceApi.sendVerificationRequest).toHaveBeenCalledTimes(1))
        expect(first.result.current.progressPercent).toBe(75)

        const second = renderHook(() => useEvidenceUploadModel(secondNavigation))
        let secondSend!: Promise<void>
        await act(async () => {
          secondSend = second.result.current.handleSend()
        })
        // Joined: nothing is uploaded or submitted again, and the progress made so far is shown
        expect(mockEvidenceApi.uploadPhotoEvidenceMetadata).toHaveBeenCalledTimes(1)
        expect(mockEvidenceApi.sendVerificationRequest).toHaveBeenCalledTimes(1)
        expect(second.result.current.progressPercent).toBe(75)
        expect(second.result.current.isUploading).toBe(true)
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already in flight'))

        await act(async () => {
          submission.resolve({ id: 'req-123', status: 'pending' })
          await Promise.all([firstSend, secondSend])
        })

        expect(mockUpdateAccountFlags).toHaveBeenCalledTimes(1)
        expect(first.result.current.progressPercent).toBe(100)
        expect(second.result.current.progressPercent).toBe(100)
        expect(secondNavigation.dispatch).toHaveBeenCalledTimes(1)
        expect(mockNavigation.dispatch).not.toHaveBeenCalled()
        expect(first.result.current.isUploading).toBe(false)
        expect(second.result.current.isUploading).toBe(false)
      })

      it('alerts once, from the newest screen, when the shared run fails', async () => {
        // The user in #4928 saw the error alert. The replaced screen awaited the same run, so a settler check that
        // only held on the success path would still alert twice here.
        arrangeReadySend()
        const replacedScreenAlert = jest.fn()
        mockUseAlerts.mockImplementation((navigation: unknown) => ({
          fileUploadErrorAlert: navigation === secondNavigation ? mockFileUploadErrorAlert : replacedScreenAlert,
          alreadyVerifiedAlert: mockAlreadyVerifiedAlert,
        }))
        const submission = deferred<{ id: string; status: string }>()
        mockEvidenceApi.sendVerificationRequest.mockReturnValueOnce(submission.promise)

        const first = renderHook(() => useEvidenceUploadModel(mockNavigation))
        let firstSend!: Promise<void>
        await act(async () => {
          firstSend = first.result.current.handleSend()
        })
        await waitFor(() => expect(mockEvidenceApi.sendVerificationRequest).toHaveBeenCalledTimes(1))

        const second = renderHook(() => useEvidenceUploadModel(secondNavigation))
        let secondSend!: Promise<void>
        await act(async () => {
          secondSend = second.result.current.handleSend()
        })

        await act(async () => {
          submission.reject(new Error('Verification failed'))
          await Promise.all([firstSend, secondSend])
        })

        expect(mockFileUploadErrorAlert).toHaveBeenCalledTimes(1)
        expect(replacedScreenAlert).not.toHaveBeenCalled()
        expect(mockUpdateAccountFlags).not.toHaveBeenCalled()
        expect(mockNavigation.dispatch).not.toHaveBeenCalled()
        expect(secondNavigation.dispatch).not.toHaveBeenCalled()
        expect(first.result.current.isUploading).toBe(false)
        expect(second.result.current.isUploading).toBe(false)
      })

      it('lets the newest screen cancel the shared run before it submits', async () => {
        arrangeReadySend()
        const video = deferred<Buffer>()
        jest.mocked(VerificationVideoCache.getCache).mockReturnValueOnce(video.promise)

        const first = renderHook(() => useEvidenceUploadModel(mockNavigation))
        let firstSend!: Promise<void>
        await act(async () => {
          firstSend = first.result.current.handleSend()
        })
        const second = renderHook(() => useEvidenceUploadModel(secondNavigation))
        let secondSend!: Promise<void>
        await act(async () => {
          secondSend = second.result.current.handleSend()
        })

        await act(async () => {
          await second.result.current.handleCancel()
          video.resolve(Buffer.from([4, 5, 6]))
          await Promise.all([firstSend, secondSend])
        })

        expect(mockEvidenceApi.uploadPhotoEvidenceMetadata).not.toHaveBeenCalled()
        expect(mockEvidenceApi.sendVerificationRequest).not.toHaveBeenCalled()
        expect(mockFileUploadErrorAlert).not.toHaveBeenCalled()
        expect(mockNavigation.dispatch).not.toHaveBeenCalled()
        expect(secondNavigation.dispatch).not.toHaveBeenCalled()
        expect(secondNavigation.goBack).toHaveBeenCalledTimes(1)
      })

      it('starts a fresh run when the previous one was cancelled and is still draining', async () => {
        // Cancel keeps the verification request id, so the next recording is submitted against the same request.
        // The cancelled run is still finishing the upload it was in when it was flagged; joining it would hand the
        // new screen `cancelled` and leave the new recording unsent.
        arrangeReadySend()
        const cancelledUpload = deferred<void>()
        mockEvidenceApi.uploadVideoEvidenceBinary.mockReturnValueOnce(cancelledUpload.promise)
        mockEvidenceApi.sendVerificationRequest.mockResolvedValueOnce({ id: 'req-123', status: 'pending' })

        const first = renderHook(() => useEvidenceUploadModel(mockNavigation))
        let firstSend!: Promise<void>
        await act(async () => {
          firstSend = first.result.current.handleSend()
        })
        await waitFor(() => expect(mockEvidenceApi.uploadVideoEvidenceBinary).toHaveBeenCalledTimes(1))
        await act(async () => {
          await first.result.current.handleCancel()
        })

        const second = renderHook(() => useEvidenceUploadModel(secondNavigation))
        let secondSend!: Promise<void>
        await act(async () => {
          secondSend = second.result.current.handleSend()
        })
        // Not joined: the new recording is prepared and uploaded by a run of its own
        expect(mockLogger.warn).not.toHaveBeenCalledWith(expect.stringContaining('already in flight'))
        await waitFor(() => expect(mockEvidenceApi.uploadVideoEvidenceBinary).toHaveBeenCalledTimes(2))

        await act(async () => {
          cancelledUpload.resolve()
          await Promise.all([firstSend, secondSend])
        })

        // The cancelled run never submitted; the new one did, and only the new screen navigated
        expect(mockEvidenceApi.sendVerificationRequest).toHaveBeenCalledTimes(1)
        expect(second.result.current.progressPercent).toBe(100)
        expect(secondNavigation.dispatch).toHaveBeenCalledTimes(1)
        expect(mockNavigation.dispatch).not.toHaveBeenCalled()
        expect(mockFileUploadErrorAlert).not.toHaveBeenCalled()
      })

      it('starts a fresh run once the previous one has settled', async () => {
        // Only a live run is joined: a retry after a failure must submit again
        arrangeReadySend()
        mockEvidenceApi.sendVerificationRequest
          .mockRejectedValueOnce(new Error('Verification failed'))
          .mockResolvedValueOnce({ id: 'req-123', status: 'pending' })

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

        await act(async () => {
          await result.current.handleSend()
        })
        expect(mockFileUploadErrorAlert).toHaveBeenCalledTimes(1)
        expect(mockNavigation.dispatch).not.toHaveBeenCalled()

        await act(async () => {
          await result.current.handleSend()
        })

        expect(mockEvidenceApi.sendVerificationRequest).toHaveBeenCalledTimes(2)
        expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1)
      })
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
            photoMetadata: plausiblePhotoMetadata,
          },
          bcscSecure: {
            ...baseStore.bcscSecure,
            verificationRequestId: 'req-123',
            verificationRequestSha: 'sha-456',
            additionalEvidenceData: [
              {
                evidenceType: { evidence_type: 'drivers_licence' },
                documentNumber: 'DL123',
                // A plausible date so the #4338 capture-date guard is a no-op here — this test
                // is about additional-evidence processing, not the date guard.
                metadata: [{ label: 'front', file_path: '/front.jpg', side: 'front', date: 1_782_000_000 }],
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
        images: [{ label: 'FRONT_SIDE', side: 'front', file_path: undefined, date: 1_782_000_000 }],
      })
      expect(mockEvidenceApi.uploadPhotoEvidenceBinary).toHaveBeenCalledWith(
        'evidence-uri-front',
        expect.anything(),
        'document'
      )
      expect(mockEvidenceApi.sendVerificationRequest).toHaveBeenCalledWith('req-123', {
        upload_uris: ['photo-uri', 'video-uri', 'evidence-uri-front'],
        sha256: 'sha-456',
      })
    })

    describe('send-video selfie capture-date guard (#4338)', () => {
      // Reached only by the send-video flow — the live-call flow's uploadSelfiePhoto has its own
      // equivalent guard (useEvidenceUpload.test.tsx).
      const storeWithSha = (photoMetadata: unknown): any => ({
        ...baseStore,
        bcsc: {
          ...baseStore.bcsc,
          photoPath: '/photo.jpg',
          videoPath: '/video.mp4',
          videoDuration: 10,
          prompts: [{ text: 'smile' }],
          photoMetadata,
        },
        bcscSecure: {
          ...baseStore.bcscSecure,
          verificationRequestId: 'req-123',
          verificationRequestSha: 'sha-456',
          additionalEvidenceData: [],
        },
      })

      beforeEach(() => {
        jest.mocked(readFileInChunks).mockResolvedValue(Buffer.from([1, 2, 3]))
        jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(Buffer.from([4, 5, 6]))
        jest.mocked(getVideoMetadata).mockResolvedValue({ duration: 10 } as any)
        mockEvidenceApi.uploadPhotoEvidenceMetadata.mockResolvedValue({ upload_uri: 'photo-uri' })
        mockEvidenceApi.uploadVideoEvidenceMetadata.mockResolvedValue({ upload_uri: 'video-uri' })
        mockEvidenceApi.uploadPhotoEvidenceBinary.mockResolvedValue(undefined)
        mockEvidenceApi.uploadVideoEvidenceBinary.mockResolvedValue(undefined)
        mockEvidenceApi.sendVerificationRequest.mockResolvedValue({ id: 'req-123', status: 'pending' })
      })

      it('substitutes an implausible selfie capture date with the permanent file mtime before upload', async () => {
        const mtimeMs = new Date('2026-06-15T00:00:00Z').getTime()
        jest.mocked(RNFS.stat).mockResolvedValue({ mtime: mtimeMs } as any)

        const bifoldMock = jest.mocked(Bifold)
        bifoldMock.useStore.mockReturnValue([
          storeWithSha({ ...plausiblePhotoMetadata, date: 1_780_000 }) as BCState,
          jest.fn(),
        ])

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

        await act(async () => {
          await result.current.handleSend()
        })

        expect(RNFS.stat).toHaveBeenCalledWith(plausiblePhotoMetadata.file_path)
        expect(mockEvidenceApi.uploadPhotoEvidenceMetadata).toHaveBeenCalledWith(
          expect.objectContaining({ date: Math.floor(mtimeMs / 1000) }),
          undefined
        )
      })

      it('passes a plausible selfie capture date through untouched', async () => {
        // Only the video stat call in prepareLocalFiles hits RNFS.stat here.
        jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)

        const bifoldMock = jest.mocked(Bifold)
        bifoldMock.useStore.mockReturnValue([storeWithSha(plausiblePhotoMetadata) as BCState, jest.fn()])

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

        await act(async () => {
          await result.current.handleSend()
        })

        expect(RNFS.stat).not.toHaveBeenCalledWith(plausiblePhotoMetadata.file_path)
        expect(mockEvidenceApi.uploadPhotoEvidenceMetadata).toHaveBeenCalledWith(
          expect.objectContaining({ date: plausiblePhotoMetadata.date }),
          undefined
        )
      })

      it('derives media_format from the real photo/video bytes and forwards them to the metadata calls', async () => {
        // Real magic bytes (not the suite-default [1,2,3]/[4,5,6] placeholders) so the sniffer
        // actually has something to detect — see #4184 adversarial review finding.
        const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
        const mp4Bytes = Buffer.from([
          0,
          0,
          0,
          16,
          ...'ftyp'.split('').map((c) => c.charCodeAt(0)),
          ...'isom'.split('').map((c) => c.charCodeAt(0)),
          0,
          0,
          0,
          0,
        ])
        jest.mocked(readFileInChunks).mockResolvedValue(jpegBytes)
        jest.mocked(VerificationVideoCache.getCache).mockResolvedValue(mp4Bytes)
        jest.mocked(RNFS.stat).mockResolvedValue({ mtime: new Date('2026-01-01') } as any)

        const bifoldMock = jest.mocked(Bifold)
        bifoldMock.useStore.mockReturnValue([storeWithSha(plausiblePhotoMetadata) as BCState, jest.fn()])

        const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

        await act(async () => {
          await result.current.handleSend()
        })

        expect(mockEvidenceApi.uploadPhotoEvidenceMetadata).toHaveBeenCalledWith(
          expect.objectContaining({ date: plausiblePhotoMetadata.date }),
          'image/jpeg'
        )
        expect(mockEvidenceApi.uploadVideoEvidenceMetadata).toHaveBeenCalledWith(expect.anything(), 'video/mp4')
      })
    })
  })

  describe('handleCancel', () => {
    const storeWithPaths: any = {
      ...baseStore,
      bcsc: {
        ...baseStore.bcsc,
        photoPath: '/photo.jpg',
        videoPath: '/video.mp4',
        videoThumbnailPath: '/thumb.jpg',
      },
    }

    it('removes all media files', async () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithPaths as BCState, jest.fn()])

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleCancel()
      })

      const mockRemove = jest.mocked(removeFileSafely)
      expect(mockRemove).toHaveBeenCalledWith('/photo.jpg', expect.anything())
      expect(mockRemove).toHaveBeenCalledWith('/video.mp4', expect.anything())
      expect(mockRemove).toHaveBeenCalledWith('/thumb.jpg', expect.anything())
    })

    it('clears the video cache and dispatches RESET_SEND_VIDEO', async () => {
      const mockDispatch = jest.fn()
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithPaths as BCState, mockDispatch])

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleCancel()
      })

      expect(VerificationVideoCache.clearCache).toHaveBeenCalled()
      expect(mockDispatch).toHaveBeenCalledWith({ type: BCDispatchAction.RESET_SEND_VIDEO })
    })

    it('navigates back', async () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithPaths as BCState, jest.fn()])

      const { result } = renderHook(() => useEvidenceUploadModel(mockNavigation))

      await act(async () => {
        await result.current.handleCancel()
      })

      expect(mockNavigation.goBack).toHaveBeenCalled()
    })
  })
})
