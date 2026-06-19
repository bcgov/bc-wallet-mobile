import * as BCSCLoadingContextModule from '@/bcsc-theme/contexts/BCSCLoadingContext'
import * as ErrorAlertContextModule from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { act, renderHook } from '@testing-library/react-native'
import { useRestartVerification } from './useRestartVerification'
import * as useSecureActionsModule from './useSecureActions'
import * as useVerificationResetModule from './useVerificationReset'

jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: jest.fn(),
}))
jest.mock('@/contexts/ErrorAlertContext', () => ({
  useErrorAlert: jest.fn(),
}))
jest.mock('./useSecureActions', () => ({
  useSecureActions: jest.fn(),
}))
jest.mock('./useVerificationReset', () => ({
  useVerificationReset: jest.fn(),
}))

const mockEmitAlert = jest.fn()
const mockStopLoading = jest.fn()
const mockStartLoading = jest.fn().mockReturnValue(mockStopLoading)
const mockVerificationReset = jest.fn()
const mockContinueVerificationProcess = jest.fn()

/** Renders the hook, invokes the prompt and returns the alert actions it was shown with */
const promptAndGetAlertActions = async (onConfirm?: () => void) => {
  const { result } = renderHook(() => useRestartVerification())

  await act(async () => {
    result.current(onConfirm)
  })

  expect(mockEmitAlert).toHaveBeenCalledWith(
    'Alerts.RestartVerification.Title',
    'Alerts.RestartVerification.Description',
    {
      event: AppEventCode.RESTART_VERIFICATION,
      actions: [
        expect.objectContaining({ text: 'Global.Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Alerts.RestartVerification.Action1', style: 'destructive' }),
      ],
    }
  )

  return mockEmitAlert.mock.calls[0][2].actions
}

describe('useRestartVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    jest.mocked(BCSCLoadingContextModule.useLoadingScreen).mockReturnValue({
      startLoading: mockStartLoading,
    } as any)
    jest.mocked(ErrorAlertContextModule.useErrorAlert).mockReturnValue({
      emitAlert: mockEmitAlert,
    } as any)
    jest.mocked(useSecureActionsModule.useSecureActions).mockReturnValue({
      continueVerificationProcess: mockContinueVerificationProcess,
    } as any)
    jest.mocked(useVerificationResetModule.useVerificationReset).mockReturnValue(mockVerificationReset)
    mockVerificationReset.mockResolvedValue(true)
  })

  it('shows a confirmation alert without resetting anything', async () => {
    await promptAndGetAlertActions()

    expect(mockVerificationReset).not.toHaveBeenCalled()
    expect(mockContinueVerificationProcess).not.toHaveBeenCalled()
    expect(mockStartLoading).not.toHaveBeenCalled()
  })

  it('resets verification and re-enters the verify flow when confirmed', async () => {
    const onConfirm = jest.fn()
    const actions = await promptAndGetAlertActions(onConfirm)

    await act(async () => {
      await actions[1].onPress()
    })

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(mockStartLoading).toHaveBeenCalledWith('Alerts.RestartVerification.Loading')
    expect(mockVerificationReset).toHaveBeenCalledTimes(1)
    expect(mockContinueVerificationProcess).toHaveBeenCalledTimes(1)
    expect(mockStopLoading).toHaveBeenCalledTimes(1)
  })

  it('does not re-enter the verify flow when the reset fails', async () => {
    mockVerificationReset.mockResolvedValue(false)
    const actions = await promptAndGetAlertActions()

    await act(async () => {
      await actions[1].onPress()
    })

    expect(mockVerificationReset).toHaveBeenCalledTimes(1)
    expect(mockContinueVerificationProcess).not.toHaveBeenCalled()
    expect(mockStopLoading).toHaveBeenCalledTimes(1)
  })
})
