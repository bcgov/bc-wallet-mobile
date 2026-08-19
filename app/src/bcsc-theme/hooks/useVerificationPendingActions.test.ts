import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
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

const navigation = { navigate: jest.fn() } as any

describe('useVerificationPendingActions', () => {
  const updateVerificationRequestMock = jest.fn().mockResolvedValue(undefined)
  const updateAccountFlagsMock = jest.fn().mockResolvedValue(undefined)
  const cancelVerificationRequestMock = jest.fn().mockResolvedValue(undefined)
  const dispatchMock = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()

    jest
      .mocked(Bifold)
      .useStore.mockReturnValue([{ bcscSecure: { verificationRequestId: 'request-id' } } as any, dispatchMock])
    jest.mocked(Bifold).useServices.mockReturnValue([{ info: jest.fn(), warn: jest.fn(), error: jest.fn() }] as any)
    jest.mocked(useApi).mockReturnValue({ token: { checkDeviceCodeStatus: jest.fn() } } as any)
    jest.mocked(useSecureActions).mockReturnValue({
      updateVerificationRequest: updateVerificationRequestMock,
      updateAccountFlags: updateAccountFlagsMock,
    } as any)
    jest.mocked(useEvidenceService).mockReturnValue({
      cancelVerificationRequest: cancelVerificationRequestMock,
    } as any)
    // Simulate the user confirming the alert by invoking the passed-in action immediately.
    jest.mocked(useAlerts).mockReturnValue({
      cancelVerificationRequestAlert: jest.fn((onAction: () => Promise<void>) => onAction()),
    } as any)
  })

  describe('handleCancelVerification', () => {
    it('cancels the request, clears verification state, and navigates back on success', async () => {
      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCancelVerification()
      })

      expect(cancelVerificationRequestMock).toHaveBeenCalledWith('request-id')
      expect(updateVerificationRequestMock).toHaveBeenCalledWith(null, null)
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
      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationMethodSelection)
    })

    it('still clears verification state and navigates back when there is no pending request id', async () => {
      jest.mocked(Bifold).useStore.mockReturnValue([{ bcscSecure: {} } as any, dispatchMock])

      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCancelVerification()
      })

      expect(cancelVerificationRequestMock).not.toHaveBeenCalled()
      expect(updateVerificationRequestMock).toHaveBeenCalledWith(null, null)
      expect(updateAccountFlagsMock).toHaveBeenCalledWith({ userSubmittedVerificationVideo: false })
      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationMethodSelection)
    })

    it('still clears verification state and navigates back when cancelling the request fails', async () => {
      cancelVerificationRequestMock.mockRejectedValue(new Error('cancel boom'))
      const errorLogMock = jest.fn()
      jest
        .mocked(Bifold)
        .useServices.mockReturnValue([{ info: jest.fn(), warn: jest.fn(), error: errorLogMock }] as any)

      const { result } = renderHook(() => useVerificationPendingActions(navigation))

      await act(async () => {
        await result.current.handleCancelVerification()
      })

      expect(errorLogMock).toHaveBeenCalledWith(expect.stringContaining('Error cancelling verification request'))
      expect(updateVerificationRequestMock).toHaveBeenCalledWith(null, null)
      expect(dispatchMock).toHaveBeenCalledWith({ type: BCDispatchAction.RESET_SEND_VIDEO })
      expect(updateAccountFlagsMock).toHaveBeenCalledWith({ userSubmittedVerificationVideo: false })
      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationMethodSelection)
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
      expect(navigation.navigate).not.toHaveBeenCalled()
    })
  })
})
