import useCancelledReviewViewModel from '@/bcsc-theme/features/verify/send-video/CancelledReviewViewModel'
import { useVerificationState } from '@/bcsc-theme/state/verification/useVerificationState'
import { storage } from '@/bcsc-theme/storage'
import { reportSessionWritesAs, seedBCSCStoreFromBCState } from '@/bcsc-theme/storage/testing'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import * as Bifold from '@bifold/core'
import { CommonActions, useNavigation } from '@mocks/@react-navigation/native'
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

jest.mock('@/bcsc-theme/state/verification/useVerificationState', () => ({
  useVerificationState: jest.fn(),
}))

describe('useCancelledReviewViewModel', () => {
  const mockDispatch = jest.fn()

  beforeEach(() => {
    reportSessionWritesAs(mockDispatch)
    jest.clearAllMocks()
    jest.mocked(Bifold).useStore.mockReturnValue([{} as any, mockDispatch])
    seedBCSCStoreFromBCState({} as any as never)
    jest.mocked(useVerificationState).mockReturnValue({
      isVerified: false,
      isDeviceVerifiedByIas: false,
      isVerificationInProgress: true,
      isCardInactive: false,
      needsVerification: false,
    })
  })

  describe('cleanUpVerificationData', () => {
    it('clears the verification request', async () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      await result.current.cleanUpVerificationData()

      expect(mockUpdateVerificationRequest).toHaveBeenCalledWith(undefined, null)
    })

    it('resets send video and video prompt state', async () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      await result.current.cleanUpVerificationData()

      // Captured media and prompts live in the session slice of the BCSC store
      expect(storage.store.getState().session).toMatchObject({
        photoPath: undefined,
        videoPath: undefined,
        videoThumbnailPath: undefined,
        prompts: undefined,
      })
    })

    it('clears the secure verification request status and message', async () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      await result.current.cleanUpVerificationData()

      expect(storage.store.getState().session.verificationRequestStatus).toBeUndefined()
      expect(storage.store.getState().session.verificationRequestStatusMessage).toBeUndefined()
    })

    it('clears the secure verification video submitted at timestamp', async () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      await result.current.cleanUpVerificationData()

      expect(storage.store.getState().session.verificationVideoSubmittedAt).toBeUndefined()
    })

    it('resets the userSubmittedVerificationVideo account flag', async () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      await result.current.cleanUpVerificationData()

      expect(mockUpdateAccountFlags).toHaveBeenCalledWith({ userSubmittedVerificationVideo: false })
    })

    it('dispatches exactly the expected three actions', async () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      await result.current.cleanUpVerificationData()

      expect(mockDispatch).toHaveBeenCalledTimes(3)
    })
  })

  describe('resumeVerification', () => {
    it('continues the verification process', () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      result.current.resumeVerification()

      expect(mockContinueVerificationProcess).toHaveBeenCalledTimes(1)
    })
  })

  describe('retryWithNewVideo', () => {
    // Mounted in the VerifyStack the user is already in the verify flow, so the store swap the
    // MainStack mount relies on would remount nothing — it has to reset in-stack instead.
    it('resets to verification method selection when the verify flow is already mounted', () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      result.current.retryWithNewVideo()

      expect(CommonActions.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.VerificationMethodSelection }],
      })
      expect(useNavigation().dispatch).toHaveBeenCalledTimes(1)
      expect(mockContinueVerificationProcess).not.toHaveBeenCalled()
    })

    // Reached from the home notification card, where there is no verify route to navigate to.
    it('re-enters the verify flow via store state when mounted outside it', () => {
      jest.mocked(useVerificationState).mockReturnValue({
        isVerified: false,
        isDeviceVerifiedByIas: false,
        isVerificationInProgress: false,
        isCardInactive: false,
        needsVerification: true,
      })

      const { result } = renderHook(() => useCancelledReviewViewModel())

      result.current.retryWithNewVideo()

      expect(mockContinueVerificationProcess).toHaveBeenCalledTimes(1)
      expect(useNavigation().dispatch).not.toHaveBeenCalled()
    })

    // The full reset is the other button's job; retry keeps the ID, address and email steps.
    it('does not clear verification data', () => {
      const { result } = renderHook(() => useCancelledReviewViewModel())

      result.current.retryWithNewVideo()

      expect(mockUpdateVerificationRequest).not.toHaveBeenCalled()
      expect(mockUpdateAccountFlags).not.toHaveBeenCalled()
    })
  })
})
