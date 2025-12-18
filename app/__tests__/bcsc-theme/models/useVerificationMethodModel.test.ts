import useApi from '@/bcsc-theme/api/hooks/useApi'
import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import useVerificationMethodModel from '@/bcsc-theme/features/verify/_models/useVerificationMethodModel'
import { VerificationVideoCache } from '@/bcsc-theme/features/verify/send-video/VideoReviewScreen'
import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { removeFileSafely } from '@/bcsc-theme/utils/file-info'
import { checkIfWithinServiceHours, formatServiceHours } from '@/bcsc-theme/utils/serviceHoursFormatter'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/bcsc-theme/utils/file-info')
jest.mock('@/bcsc-theme/utils/serviceHoursFormatter')
jest.mock('@/bcsc-theme/features/verify/send-video/VideoReviewScreen', () => ({
  VerificationVideoCache: {
    clearCache: jest.fn(),
  },
}))
jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

describe('useVerificationMethodModel', () => {
  const mockDispatch = jest.fn()
  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
  const mockNavigation = {
    navigate: jest.fn(),
  } as any

  const mockStore: any = {
    bcsc: {
      appVersion: '1.0.0',
      cardType: BCSCCardType.Combined,
      nicknames: ['Bob'],
      selectedNickname: 'Bob',
      bookmarks: [],
      bannerMessages: [],
      analyticsOptIn: false,
      videoPath: '/path/to/video.mp4',
      photoPath: '/path/to/photo.jpg',
      videoThumbnailPath: '/path/to/thumbnail.jpg',
    },
    bcscSecure: {
      isHydrated: true,
      additionalEvidenceData: [],
      verificationOptions: [
        DeviceVerificationOption.LIVE_VIDEO_CALL,
        DeviceVerificationOption.SEND_VIDEO,
        DeviceVerificationOption.IN_PERSON,
      ],
    },
  }

  const mockEvidenceApi = {
    createVerificationRequest: jest.fn(),
  }

  const mockVideoCallApi = {
    getVideoDestinations: jest.fn(),
    getServiceHours: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    const useApiMock = jest.mocked(useApi)
    useApiMock.mockReturnValue({
      evidence: mockEvidenceApi,
      video: mockVideoCallApi,
    } as any)

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([mockStore, mockDispatch])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)
  })

  describe('Initial state', () => {
    it('should return initial loading states and verification options', () => {
      const { result } = renderHook(() => useVerificationMethodModel({ navigation: mockNavigation }))

      expect(result.current.sendVideoLoading).toBe(false)
      expect(result.current.liveCallLoading).toBe(false)
      expect(result.current.verificationOptions).toEqual(['video_call', 'back_check', 'counter'])
      expect(result.current.handlePressSendVideo).toBeDefined()
      expect(result.current.handlePressLiveCall).toBeDefined()
    })
  })

  describe('handlePressSendVideo', () => {
    it('should successfully create verification request and navigate', async () => {
      const mockVerificationRequest = {
        sha256: 'test-sha256',
        id: 'test-id',
        prompts: [{ id: 'prompt-1' }, { id: 'prompt-2' }],
      }

      mockEvidenceApi.createVerificationRequest.mockResolvedValue(mockVerificationRequest)
      const clearCacheMock = jest.mocked(VerificationVideoCache.clearCache)
      const removeFileSafelyMock = jest.mocked(removeFileSafely)
      removeFileSafelyMock.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationMethodModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handlePressSendVideo()
      })

      expect(mockEvidenceApi.createVerificationRequest).toHaveBeenCalledTimes(1)
      expect(removeFileSafelyMock).toHaveBeenCalledWith(mockStore.bcsc.videoPath, mockLogger)
      expect(removeFileSafelyMock).toHaveBeenCalledWith(mockStore.bcsc.photoPath, mockLogger)
      expect(removeFileSafelyMock).toHaveBeenCalledWith(mockStore.bcsc.videoThumbnailPath, mockLogger)
      expect(clearCacheMock).toHaveBeenCalledTimes(1)

      expect(mockDispatch).toHaveBeenCalledWith({ type: BCDispatchAction.RESET_SEND_VIDEO })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID,
        payload: ['test-id'],
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_SHA,
        payload: ['test-sha256'],
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_VIDEO_PROMPTS,
        payload: [mockVerificationRequest.prompts],
      })

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.InformationRequired)
      expect(result.current.sendVideoLoading).toBe(false)
    })

    it('should set loading state during request', async () => {
      let resolveRequest: (value: any) => void
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve
      })

      mockEvidenceApi.createVerificationRequest.mockReturnValue(requestPromise)
      const removeFileSafelyMock = jest.mocked(removeFileSafely)
      removeFileSafelyMock.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationMethodModel({ navigation: mockNavigation }))

      act(() => {
        result.current.handlePressSendVideo()
      })

      expect(result.current.sendVideoLoading).toBe(true)

      await act(async () => {
        resolveRequest!({
          sha256: 'test-sha256',
          id: 'test-id',
          prompts: [],
        })
        await requestPromise
      })

      expect(result.current.sendVideoLoading).toBe(false)
    })

    it('should handle errors gracefully and log them', async () => {
      const mockError = new Error('Failed to create verification request')
      mockEvidenceApi.createVerificationRequest.mockRejectedValue(mockError)

      const { result } = renderHook(() => useVerificationMethodModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handlePressSendVideo()
      })

      expect(mockLogger.error).toHaveBeenCalledWith('Error sending video:', mockError)
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
      expect(mockDispatch).not.toHaveBeenCalled()
      expect(result.current.sendVideoLoading).toBe(false)
    })

    it('should handle file cleanup errors gracefully', async () => {
      const mockVerificationRequest = {
        sha256: 'test-sha256',
        id: 'test-id',
        prompts: [],
      }

      mockEvidenceApi.createVerificationRequest.mockResolvedValue(mockVerificationRequest)
      const removeFileSafelyMock = jest.mocked(removeFileSafely)
      removeFileSafelyMock.mockRejectedValue(new Error('Failed to remove file'))

      const { result } = renderHook(() => useVerificationMethodModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handlePressSendVideo()
      })

      // Should still proceed with dispatch and navigation even if file cleanup fails
      // (Promise.allSettled is used so rejections don't stop the flow)
      expect(mockDispatch).toHaveBeenCalled()
      expect(mockNavigation.navigate).toHaveBeenCalled()
    })
  })

  describe('handlePressLiveCall', () => {
    const mockDestinations = [
      { destination_name: 'Test Harness Queue Destination', id: 'test-1' },
      { destination_name: 'Other Destination', id: 'test-2' },
    ]

    const mockServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [
        {
          start_day: 'MONDAY',
          end_day: 'FRIDAY',
          start_time: '07:30',
          end_time: '17:00',
        },
      ],
    }

    it('should navigate to BeforeYouCall when destination is available and within service hours', async () => {
      const formattedHours = 'Monday to Friday\n7:30am - 5:00pm Pacific Time'

      mockVideoCallApi.getVideoDestinations.mockResolvedValue(mockDestinations)
      mockVideoCallApi.getServiceHours.mockResolvedValue(mockServiceHours)
      const formatServiceHoursMock = jest.mocked(formatServiceHours)
      formatServiceHoursMock.mockReturnValue(formattedHours)
      const checkIfWithinServiceHoursMock = jest.mocked(checkIfWithinServiceHours)
      checkIfWithinServiceHoursMock.mockReturnValue(true)

      const { result } = renderHook(() => useVerificationMethodModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handlePressLiveCall()
      })

      expect(mockVideoCallApi.getVideoDestinations).toHaveBeenCalledTimes(1)
      expect(mockVideoCallApi.getServiceHours).toHaveBeenCalledTimes(1)
      expect(formatServiceHoursMock).toHaveBeenCalledWith(mockServiceHours)
      expect(checkIfWithinServiceHoursMock).toHaveBeenCalledWith(mockServiceHours)

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.BeforeYouCall, {
        formattedHours,
      })
      expect(result.current.liveCallLoading).toBe(false)
    })

    it('should navigate to CallBusyOrClosed when no destination is found', async () => {
      const formattedHours = 'Monday to Friday\n7:30am - 5:00pm Pacific Time'

      mockVideoCallApi.getVideoDestinations.mockResolvedValue([{ destination_name: 'Other Destination', id: 'test-2' }])
      mockVideoCallApi.getServiceHours.mockResolvedValue(mockServiceHours)
      const formatServiceHoursMock = jest.mocked(formatServiceHours)
      formatServiceHoursMock.mockReturnValue(formattedHours)

      const { result } = renderHook(() => useVerificationMethodModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handlePressLiveCall()
      })

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.CallBusyOrClosed, {
        busy: true,
        formattedHours,
      })
      expect(result.current.liveCallLoading).toBe(false)
    })

    it('should navigate to CallBusyOrClosed when outside service hours', async () => {
      const formattedHours = 'Monday to Friday\n7:30am - 5:00pm Pacific Time'

      mockVideoCallApi.getVideoDestinations.mockResolvedValue(mockDestinations)
      mockVideoCallApi.getServiceHours.mockResolvedValue(mockServiceHours)
      const formatServiceHoursMock = jest.mocked(formatServiceHours)
      formatServiceHoursMock.mockReturnValue(formattedHours)
      const checkIfWithinServiceHoursMock = jest.mocked(checkIfWithinServiceHours)
      checkIfWithinServiceHoursMock.mockReturnValue(false)

      const { result } = renderHook(() => useVerificationMethodModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handlePressLiveCall()
      })

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.CallBusyOrClosed, {
        busy: false,
        formattedHours,
      })
      expect(result.current.liveCallLoading).toBe(false)
    })

    it('should set loading state during request', async () => {
      let resolveDestinations: (value: any) => void
      let resolveServiceHours: (value: any) => void

      const destinationsPromise = new Promise((resolve) => {
        resolveDestinations = resolve
      })
      const serviceHoursPromise = new Promise((resolve) => {
        resolveServiceHours = resolve
      })

      mockVideoCallApi.getVideoDestinations.mockReturnValue(destinationsPromise)
      mockVideoCallApi.getServiceHours.mockReturnValue(serviceHoursPromise)
      const formatServiceHoursMock = jest.mocked(formatServiceHours)
      formatServiceHoursMock.mockReturnValue('Monday to Friday\n7:30am - 5:00pm Pacific Time')
      const checkIfWithinServiceHoursMock = jest.mocked(checkIfWithinServiceHours)
      checkIfWithinServiceHoursMock.mockReturnValue(true)

      const { result } = renderHook(() => useVerificationMethodModel({ navigation: mockNavigation }))

      act(() => {
        result.current.handlePressLiveCall()
      })

      expect(result.current.liveCallLoading).toBe(true)

      await act(async () => {
        resolveDestinations!(mockDestinations)
        resolveServiceHours!(mockServiceHours)
        await Promise.all([destinationsPromise, serviceHoursPromise])
      })

      expect(result.current.liveCallLoading).toBe(false)
    })

    it('should handle errors and navigate to CallBusyOrClosed with unavailable message', async () => {
      const mockError = new Error('Network error')
      mockVideoCallApi.getVideoDestinations.mockRejectedValue(mockError)

      const { result } = renderHook(() => useVerificationMethodModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handlePressLiveCall()
      })

      expect(mockLogger.error).toHaveBeenCalledWith('Error checking service availability:', mockError)
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.CallBusyOrClosed, {
        busy: false,
        formattedHours: 'Unavailable',
      })
      expect(result.current.liveCallLoading).toBe(false)
    })

    it('should handle empty destinations array', async () => {
      const formattedHours = 'Monday to Friday\n7:30am - 5:00pm Pacific Time'

      mockVideoCallApi.getVideoDestinations.mockResolvedValue([])
      mockVideoCallApi.getServiceHours.mockResolvedValue(mockServiceHours)
      const formatServiceHoursMock = jest.mocked(formatServiceHours)
      formatServiceHoursMock.mockReturnValue(formattedHours)

      const { result } = renderHook(() => useVerificationMethodModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handlePressLiveCall()
      })

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.CallBusyOrClosed, {
        busy: true,
        formattedHours,
      })
    })
  })
})
