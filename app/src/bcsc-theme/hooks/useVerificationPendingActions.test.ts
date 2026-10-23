import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { VerificationRequestStatus } from '@/constants'
import { useAlerts } from '@/hooks/useAlerts'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { useEvidenceService } from '../services/hooks/useEvidenceService'
import useSecureActions from './useSecureActions'
import { useVerificationPendingActions } from './useVerificationPendingActions'

jest.mock('@bifold/core')
jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('./useSecureActions')
jest.mock('@/hooks/useAlerts')
jest.mock('../services/hooks/useEvidenceService')
const mockEmitErrorModal = jest.fn()
jest.mock('@/contexts/ErrorAlertContext', () => ({
  useErrorAlert: () => ({ emitErrorModal: mockEmitErrorModal }),
}))

const navigation = { navigate: jest.fn(), reset: jest.fn() } as any

describe('useVerificationPendingActions', () => {
  const updateVerificationRequestMock = jest.fn()
  const updateAccountFlagsMock = jest.fn()
  const cancelVerificationRequestMock = jest.fn()
  const getVerificationRequestStatusMock = jest.fn()
  const checkDeviceCodeStatusMock = jest.fn()
  const dispatchMock = jest.fn()
  const loggerMock = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

  const pendingRequest = { verificationRequestId: 'request-id', deviceCode: 'device-code', userCode: 'user-code' }

  beforeEach(() => {
    jest.resetAllMocks()

    updateVerificationRequestMock.mockResolvedValue(undefined)
    updateAccountFlagsMock.mockResolvedValue(undefined)
    cancelVerificationRequestMock.mockResolvedValue(undefined)
    getVerificationRequestStatusMock.mockResolvedValue({ status: VerificationRequestStatus.PENDING })
    checkDeviceCodeStatusMock.mockResolvedValue(undefined)

    jest.mocked(Bifold).useStore.mockReturnValue([{ bcscSecure: pendingRequest } as any, dispatchMock])
    jest.mocked(Bifold).useServices.mockReturnValue([loggerMock] as any)
    jest.mocked(useApi).mockReturnValue({ token: { checkDeviceCodeStatus: checkDeviceCodeStatusMock } } as any)
    jest.mocked(useSecureActions).mockReturnValue({
      updateVerificationRequest: updateVerificationRequestMock,
      updateAccountFlags: updateAccountFlagsMock,
    } as any)
    jest.mocked(useEvidenceService).mockReturnValue({
      cancelVerificationRequest: cancelVerificationRequestMock,
      getVerificationRequestStatus: getVerificationRequestStatusMock,
    } as any)
    // Simulate the user confirming the alert by invoking the passed-in action immediately.
    jest.mocked(useAlerts).mockReturnValue({
      cancelVerificationRequestAlert: jest.fn((onAction: () => Promise<void>) => onAction()),
    } as any)
  })

  describe('handleCheckStatus', () => {
    it('goes straight to the success screen when the user is already verified', async () => {
      jest
        .mocked(Bifold)
        .useStore.mockReturnValue([{ bcscSecure: { ...pendingRequest, verified: true } } as any, dispatchMock])
      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCheckStatus()
      })

      expect(getVerificationRequestStatusMock).not.toHaveBeenCalled()
      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationSuccess)
    })

    it('exchanges the device code and moves on to the success screen once the review is approved', async () => {
      getVerificationRequestStatusMock.mockResolvedValue({ status: VerificationRequestStatus.VERIFIED })
      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCheckStatus()
      })

      expect(getVerificationRequestStatusMock).toHaveBeenCalledWith('request-id')
      expect(checkDeviceCodeStatusMock).toHaveBeenCalledWith('device-code', 'user-code')
      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationSuccess)
    })

    it('moves on to the cancelled review, with the agent reason, once the review is rejected', async () => {
      getVerificationRequestStatusMock.mockResolvedValue({
        status: VerificationRequestStatus.CANCELLED,
        status_message: 'Video too dark',
      })
      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCheckStatus()
      })

      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.CancelledReview, { agentReason: 'Video too dark' })
      expect(checkDeviceCodeStatusMock).not.toHaveBeenCalled()
    })

    it('stays on the pending review while the request is still pending', async () => {
      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCheckStatus()
      })

      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.PendingReview)
    })

    it('only logs a failed automatic check', async () => {
      getVerificationRequestStatusMock.mockRejectedValue(new Error('status boom'))
      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCheckStatus()
      })

      expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Failed to check status'))
      expect(mockEmitErrorModal).not.toHaveBeenCalled()
      expect(navigation.navigate).not.toHaveBeenCalled()
    })

    it('tells the user when a manual Check status fails, so silence never reads as "still pending"', async () => {
      getVerificationRequestStatusMock.mockRejectedValue(new Error('status boom'))
      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCheckStatus({ surfaceErrors: true })
      })

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Error.Problem',
        'Error.ProblemDescription',
        expect.objectContaining({ cause: expect.any(Error) })
      )
    })

    describe('overlapping triggers', () => {
      /** A first fetch that stays in flight until the test settles it. */
      const holdFirstFetch = () => {
        let settle: (value: { status: VerificationRequestStatus }) => void = () => undefined
        getVerificationRequestStatusMock.mockReturnValueOnce(
          new Promise((resolve) => {
            settle = resolve
          })
        )
        return (value: { status: VerificationRequestStatus }) => settle(value)
      }

      it('coalesces triggers that arrive mid-check into one follow-up check, so a late decision is not lost', async () => {
        const settleFirstFetch = holdFirstFetch()
        const { result } = renderHook(() => useVerificationPendingActions(navigation))

        let first: Promise<void> = Promise.resolve()
        act(() => {
          first = result.current.handleCheckStatus()
        })
        expect(result.current.isCheckingStatus).toBe(true)

        // The focus check is still awaiting a stale response when the push and a foreground both ask again
        await act(async () => {
          await result.current.handleCheckStatus()
          await result.current.handleCheckStatus()
        })
        expect(getVerificationRequestStatusMock).toHaveBeenCalledTimes(1)

        // The stale response settles as pending; exactly one follow-up fetch serves the queued triggers
        await act(async () => {
          settleFirstFetch({ status: VerificationRequestStatus.PENDING })
          await first
        })

        expect(getVerificationRequestStatusMock).toHaveBeenCalledTimes(2)
        expect(result.current.isCheckingStatus).toBe(false)
        expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.PendingReview)
      })

      it('skips the follow-up when the check in flight already found the decision', async () => {
        const settleFirstFetch = holdFirstFetch()
        const { result } = renderHook(() => useVerificationPendingActions(navigation))

        let first: Promise<void> = Promise.resolve()
        act(() => {
          first = result.current.handleCheckStatus()
        })
        await act(async () => {
          await result.current.handleCheckStatus()
        })

        await act(async () => {
          settleFirstFetch({ status: VerificationRequestStatus.VERIFIED })
          await first
        })

        expect(getVerificationRequestStatusMock).toHaveBeenCalledTimes(1)
        expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationSuccess)
        expect(result.current.isCheckingStatus).toBe(false)
      })

      it('keeps a queued manual press entitled to see a failure', async () => {
        const settleFirstFetch = holdFirstFetch()
        getVerificationRequestStatusMock.mockRejectedValueOnce(new Error('status boom'))
        const { result } = renderHook(() => useVerificationPendingActions(navigation))

        let first: Promise<void> = Promise.resolve()
        act(() => {
          first = result.current.handleCheckStatus() // automatic (focus)
        })
        await act(async () => {
          await result.current.handleCheckStatus({ surfaceErrors: true }) // the button, queued behind it
        })

        await act(async () => {
          settleFirstFetch({ status: VerificationRequestStatus.PENDING })
          await first
        })

        expect(getVerificationRequestStatusMock).toHaveBeenCalledTimes(2)
        expect(mockEmitErrorModal).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('handleCancelVerification', () => {
    it('cancels the request, clears verification state, and navigates back on success', async () => {
      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCancelVerification()
      })

      expect(cancelVerificationRequestMock).toHaveBeenCalledWith('request-id')
      expect(updateVerificationRequestMock).toHaveBeenCalledWith(undefined, null)
      expect(dispatchMock).toHaveBeenCalledWith({ type: BCDispatchAction.RESET_SEND_VIDEO })
      expect(dispatchMock).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_VIDEO_PROMPTS,
        payload: [undefined],
      })
      expect(dispatchMock).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_VIDEO_SUBMITTED_AT,
        payload: [undefined],
      })
      expect(updateAccountFlagsMock).toHaveBeenCalledWith({ userSubmittedVerificationVideo: false })
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.VerificationMethodSelection }],
      })
    })

    it('still clears verification state and navigates back when there is no pending request id', async () => {
      jest.mocked(Bifold).useStore.mockReturnValue([{ bcscSecure: {} } as any, dispatchMock])

      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCancelVerification()
      })

      expect(cancelVerificationRequestMock).not.toHaveBeenCalled()
      expect(updateVerificationRequestMock).toHaveBeenCalledWith(undefined, null)
      expect(updateAccountFlagsMock).toHaveBeenCalledWith({ userSubmittedVerificationVideo: false })
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.VerificationMethodSelection }],
      })
    })

    it('still clears verification state and navigates back when cancelling the request fails', async () => {
      cancelVerificationRequestMock.mockRejectedValue(new Error('cancel boom'))

      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCancelVerification()
      })

      expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Error cancelling verification request'))
      expect(updateVerificationRequestMock).toHaveBeenCalledWith(undefined, null)
      expect(dispatchMock).toHaveBeenCalledWith({ type: BCDispatchAction.RESET_SEND_VIDEO })
      expect(updateAccountFlagsMock).toHaveBeenCalledWith({ userSubmittedVerificationVideo: false })
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.VerificationMethodSelection }],
      })
    })

    it('does not invoke cleanup when the user dismisses the confirmation alert', async () => {
      jest.mocked(useAlerts).mockReturnValue({
        cancelVerificationRequestAlert: jest.fn(),
      } as any)

      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCancelVerification()
      })

      expect(cancelVerificationRequestMock).not.toHaveBeenCalled()
      expect(updateVerificationRequestMock).not.toHaveBeenCalled()
      expect(navigation.reset).not.toHaveBeenCalled()
    })
  })
})
