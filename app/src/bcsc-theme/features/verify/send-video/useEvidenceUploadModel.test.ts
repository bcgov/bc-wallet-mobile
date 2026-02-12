import useApi from '@/bcsc-theme/api/hooks/useApi'
import useEvidenceUploadModel from '@/bcsc-theme/features/verify/send-video/useEvidenceUploadModel'
import { BCState } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'

jest.mock('@/bcsc-theme/api/hooks/useApi')
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
  })
})
