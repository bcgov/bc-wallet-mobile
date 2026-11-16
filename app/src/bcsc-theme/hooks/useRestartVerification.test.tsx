import useEvidenceApi from '@/bcsc-theme/api/hooks/useEvidenceApi'
import * as BCSCLoadingContextModule from '@/bcsc-theme/contexts/BCSCLoadingContext'
import * as ErrorAlertContextModule from '@/contexts/ErrorAlertContext'
import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import { useRestartVerification } from './useRestartVerification'
import * as useSecureActionsModule from './useSecureActions'
import * as useVerificationResetModule from './useVerificationReset'

jest.mock('@bifold/core')
jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('@/bcsc-theme/api/hooks/useEvidenceApi')
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
const mockCancelVerificationRequest = jest.fn()
const mockDispatch = jest.fn()
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

const wrappedAxiosError = (cause: AxiosError) =>
  new AppError(
    'Request failed',
    { category: ErrorCategory.VERIFICATION, appEvent: AppEventCode.ALREADY_VERIFIED, statusCode: 2000 },
    { cause, track: false }
  )

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
    mockCancelVerificationRequest.mockResolvedValue(undefined)
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([{ bcscSecure: { verificationRequestId: 'request-id' } } as any, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
    jest.mocked(useEvidenceApi).mockReturnValue({ cancelVerificationRequest: mockCancelVerificationRequest } as any)
  })

  const confirmRestart = async () => {
    const actions = await promptAndGetAlertActions()

    await act(async () => {
      await actions[1].onPress()
    })
  }

  it('shows a confirmation alert without resetting anything', async () => {
    await promptAndGetAlertActions()

    expect(mockVerificationReset).not.toHaveBeenCalled()
    expect(mockContinueVerificationProcess).not.toHaveBeenCalled()
    expect(mockStartLoading).not.toHaveBeenCalled()
    expect(mockCancelVerificationRequest).not.toHaveBeenCalled()
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

  it('cancels the pending verification request before resetting', async () => {
    await confirmRestart()

    expect(mockCancelVerificationRequest).toHaveBeenCalledTimes(1)
    expect(mockCancelVerificationRequest).toHaveBeenCalledWith('request-id')
    expect(mockCancelVerificationRequest.mock.invocationCallOrder[0]).toBeLessThan(
      mockVerificationReset.mock.invocationCallOrder[0]
    )
  })

  it('does not call IAS when there is no verification request', async () => {
    jest.mocked(Bifold.useStore).mockReturnValue([{ bcscSecure: {} } as any, mockDispatch])

    await confirmRestart()

    expect(mockCancelVerificationRequest).not.toHaveBeenCalled()
    expect(mockVerificationReset).toHaveBeenCalledTimes(1)
    expect(mockContinueVerificationProcess).toHaveBeenCalledTimes(1)
  })

  it('restarts quietly when the request is already gone (404)', async () => {
    mockCancelVerificationRequest.mockRejectedValue(
      wrappedAxiosError(new AxiosError('Not Found', 'ERR_BAD_REQUEST', undefined, undefined, { status: 404 } as any))
    )

    await confirmRestart()

    expect(mockVerificationReset).toHaveBeenCalledTimes(1)
    expect(mockContinueVerificationProcess).toHaveBeenCalledTimes(1)
    expect(mockStopLoading).toHaveBeenCalledTimes(1)
    expect(mockEmitAlert).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it.each([
    [
      '401',
      wrappedAxiosError(
        new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, { status: 401 } as any)
      ),
    ],
    ['network error', wrappedAxiosError(new AxiosError('Network Error', 'ERR_NETWORK'))],
  ])('restarts anyway and logs a warning when the cancel fails (%s)', async (_name, error) => {
    mockCancelVerificationRequest.mockRejectedValue(error)

    await confirmRestart()

    expect(mockVerificationReset).toHaveBeenCalledTimes(1)
    expect(mockContinueVerificationProcess).toHaveBeenCalledTimes(1)
    expect(mockStopLoading).toHaveBeenCalledTimes(1)
    expect(mockEmitAlert).toHaveBeenCalledTimes(1)
    expect(mockLogger.warn).toHaveBeenCalledTimes(1)
  })

  it('waits for the cancel to settle before resetting', async () => {
    let settleCancel: () => void = () => undefined
    mockCancelVerificationRequest.mockReturnValue(new Promise<void>((resolve) => (settleCancel = resolve)))
    const actions = await promptAndGetAlertActions()

    let pressed: Promise<void> = Promise.resolve()
    await act(async () => {
      pressed = actions[1].onPress()
    })

    expect(mockCancelVerificationRequest).toHaveBeenCalledTimes(1)
    expect(mockVerificationReset).not.toHaveBeenCalled()
    expect(mockContinueVerificationProcess).not.toHaveBeenCalled()
    expect(mockStopLoading).not.toHaveBeenCalled()

    await act(async () => {
      settleCancel()
      await pressed
    })

    expect(mockVerificationReset).toHaveBeenCalledTimes(1)
    expect(mockContinueVerificationProcess).toHaveBeenCalledTimes(1)
    expect(mockStopLoading).toHaveBeenCalledTimes(1)
  })

  it('does not re-enter the verify flow when the cancel succeeds but the reset fails', async () => {
    mockVerificationReset.mockResolvedValue(false)

    await confirmRestart()

    expect(mockCancelVerificationRequest).toHaveBeenCalledTimes(1)
    expect(mockContinueVerificationProcess).not.toHaveBeenCalled()
    expect(mockStopLoading).toHaveBeenCalledTimes(1)
  })
})
