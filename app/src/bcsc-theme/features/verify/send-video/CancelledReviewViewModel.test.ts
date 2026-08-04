import useCancelledReviewViewModel from '@/bcsc-theme/features/verify/send-video/CancelledReviewViewModel'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { renderHook } from '@testing-library/react-native'

jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
  }
})

const mockUpdateAccountFlags = jest.fn().mockResolvedValue(undefined)
const mockUpdateVerificationRequest = jest.fn().mockResolvedValue(undefined)
const mockContinueVerificationProcess = jest.fn()
jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    updateAccountFlags: mockUpdateAccountFlags,
    updateVerificationRequest: mockUpdateVerificationRequest,
    continueVerificationProcess: mockContinueVerificationProcess,
  })),
}))

describe('useCancelledReviewViewModel', () => {
  const mockDispatch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Bifold).useStore.mockReturnValue([{} as any, mockDispatch])
  })

  describe('cleanUpVerificationData', () => {
    it('clears the verification request', () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      result.current.cleanUpVerificationData()

      expect(mockUpdateVerificationRequest).toHaveBeenCalledWith(null, null)
    })

    it('resets send video and video prompt state', () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      result.current.cleanUpVerificationData()

      expect(mockDispatch).toHaveBeenCalledWith({ type: BCDispatchAction.RESET_SEND_VIDEO })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_VIDEO_PROMPTS,
        payload: [undefined],
      })
    })

    it('clears the secure verification request status and message', () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      result.current.cleanUpVerificationData()

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
        payload: [undefined],
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
        payload: [undefined],
      })
    })

    it('clears the secure verification video submitted at timestamp', () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      result.current.cleanUpVerificationData()

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_VIDEO_SUBMITTED_AT,
        payload: [undefined],
      })
    })

    it('resets the userSubmittedVerificationVideo account flag', () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      result.current.cleanUpVerificationData()

      expect(mockUpdateAccountFlags).toHaveBeenCalledWith({ userSubmittedVerificationVideo: false })
    })

    it('dispatches exactly the expected five actions', () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      result.current.cleanUpVerificationData()

      expect(mockDispatch).toHaveBeenCalledTimes(5)
    })
  })

  describe('goToMethodSelection', () => {
    it('continues the verification process', () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      result.current.goToMethodSelection()

      expect(mockContinueVerificationProcess).toHaveBeenCalledTimes(1)
    })
  })
})
