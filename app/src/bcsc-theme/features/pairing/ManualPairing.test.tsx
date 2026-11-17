import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import { testIdWithKey } from '@bifold/core'
import { useNavigation, useRoute } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { mockAssertion404 } from '@mocks/helpers/pairing-error'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Alert } from 'react-native'
import { ChallengeSource } from 'react-native-bcsc-core'
import ManualPairing from './ManualPairing'

const mockLoginByPairingCode = jest.fn()

jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    pairing: {
      loginByPairingCode: mockLoginByPairingCode,
    },
  })),
}))

const mockUseServerStatus = jest.fn()
jest.mock('@/bcsc-theme/contexts/ServerStatusContext', () => ({
  useServerStatus: () => mockUseServerStatus(),
}))

describe('ManualPairing', () => {
  let mockNavigation: any
  let alertSpy: any
  const mockLoginDeviceErrorAlert = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .spyOn(useAlertsModule, 'useAlerts')
      .mockReturnValue({ loginDeviceErrorAlert: mockLoginDeviceErrorAlert } as any)
    mockNavigation = useNavigation()
    jest.mocked(useRoute).mockReturnValue({ params: {} } as ReturnType<typeof useRoute>)
    mockUseServerStatus.mockReturnValue({ isAvailable: true })
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    alertSpy?.mockRestore()
  })

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <ManualPairing />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

  describe('Rendering', () => {
    test('renders correctly', () => {
      const tree = renderScreen()
      expect(tree).toMatchSnapshot()
    })
  })

  // The IAS-unavailable case now redirects away from the PairingCode tab before it mounts, via
  // QRCoreStack's screenListeners (see QRCoreStack.test.tsx's "server outage gating" tests) rather
  // than a check inside ManualPairing itself. The submission guard below still applies, since a
  // pre-populated pairing code can auto-submit from an effect that runs regardless of focus.
  describe('Submission during an outage', () => {
    test('does not submit a pre-populated code while IAS is unavailable', async () => {
      mockUseServerStatus.mockReturnValue({ isAvailable: false })
      jest.mocked(useRoute).mockReturnValue({ params: { pairingCode: 'ABCDEF' } } as ReturnType<typeof useRoute>)

      renderScreen()

      await waitFor(() => {
        expect(mockLoginByPairingCode).not.toHaveBeenCalled()
      })
    })
  })

  describe('Submission', () => {
    test('does not submit when code is incomplete', async () => {
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('ManualPairingCodeInput'))
      fireEvent.changeText(codeInput, 'ABC')

      await waitFor(() => {
        expect(mockLoginByPairingCode).not.toHaveBeenCalled()
      })
    })

    test('auto-submits when code reaches full length', async () => {
      mockLoginByPairingCode.mockResolvedValue({
        client_ref_id: 'ref-123',
        client_name: 'Test Service',
      })
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('ManualPairingCodeInput'))
      fireEvent.changeText(codeInput, 'ABCDEF')

      await waitFor(() => {
        expect(mockLoginByPairingCode).toHaveBeenCalledWith('ABCDEF', ChallengeSource.RemotePairingCode)
      })
    })

    test('converts lowercase input to uppercase before submitting', async () => {
      mockLoginByPairingCode.mockResolvedValue({
        client_ref_id: 'ref-123',
        client_name: 'Test Service',
      })
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('ManualPairingCodeInput'))
      fireEvent.changeText(codeInput, 'abcdef')

      await waitFor(() => {
        expect(mockLoginByPairingCode).toHaveBeenCalledWith('ABCDEF', ChallengeSource.RemotePairingCode)
      })
    })

    test('shows the code mismatch error for a plain 404', async () => {
      alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      mockLoginByPairingCode.mockRejectedValue(mockAssertion404('<html>Not Found</html>').appError)
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('ManualPairingCodeInput'))
      fireEvent.changeText(codeInput, 'ABCDEF')

      await waitFor(() => {
        expect(screen.getByText('BCSC.ManualPairing.CodeDoesNotMatchMessage')).toBeTruthy()
        expect(alertSpy).toHaveBeenCalledWith(
          'BCSC.ManualPairing.CouldNotVerifyPairingCodeTitle',
          'BCSC.ManualPairing.CodeDoesNotMatchMessage',
          expect.any(Array)
        )
      })
    })

    test.each([
      { name: 'a policy already alerted on', error: AppEventCode.INVALID_PAIRING_CODE, policyAlerts: 1 },
      { name: 'no policy recognises', error: 'invalid_request', policyAlerts: 0 },
    ])('shows only the inline failure for a 404 with an IAS error $name', async ({ error, policyAlerts }) => {
      alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      const mockInvalidPairingCodeAlert = jest.fn()
      const { appError } = mockAssertion404(
        { error, error_description: 'The request failed' },
        { invalidPairingCodeAlert: mockInvalidPairingCodeAlert }
      )
      expect(mockInvalidPairingCodeAlert).toHaveBeenCalledTimes(policyAlerts)

      mockLoginByPairingCode.mockRejectedValue(appError)
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('ManualPairingCodeInput'))
      fireEvent.changeText(codeInput, 'ABCDEF')

      await waitFor(() => {
        expect(screen.getByText('BCSC.ManualPairing.FailedToSubmitPairingCodeMessage')).toBeTruthy()
      })
      expect(screen.queryByText('BCSC.ManualPairing.CodeDoesNotMatchMessage')).toBeNull()
      expect(alertSpy).not.toHaveBeenCalled()
      // A server response is shown inline only, never as a device failure
      expect(mockLoginDeviceErrorAlert).not.toHaveBeenCalled()
    })

    test('alerts with a way to report it when the device fails, keeping the inline failure', async () => {
      const deviceError = AppError.fromErrorDefinition(ErrorRegistry.LOGIN_DEVICE_ERROR, {
        cause: new Error('signing failed'),
        context: { failure_flow: 'pairing', failure_step: 'sign_pairing_code' },
        track: false,
      })
      mockLoginByPairingCode.mockRejectedValue(deviceError)
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('ManualPairingCodeInput'))
      fireEvent.changeText(codeInput, 'ABCDEF')

      await waitFor(() => expect(mockLoginDeviceErrorAlert).toHaveBeenCalledWith(deviceError))
      expect(screen.getByText('BCSC.ManualPairing.FailedToSubmitPairingCodeMessage')).toBeTruthy()
    })

    test('does not alert for a plain 404, which is an incorrect code', async () => {
      alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      mockLoginByPairingCode.mockRejectedValue(mockAssertion404('<html>Not Found</html>').appError)
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('ManualPairingCodeInput'))
      fireEvent.changeText(codeInput, 'ABCDEF')

      await waitFor(() => expect(alertSpy).toHaveBeenCalled())
      expect(mockLoginDeviceErrorAlert).not.toHaveBeenCalled()
    })

    test('navigates to PairingConfirmation on success', async () => {
      mockLoginByPairingCode.mockResolvedValue({
        client_ref_id: 'ref-123',
        client_name: 'Test Service',
      })
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('ManualPairingCodeInput'))
      fireEvent.changeText(codeInput, 'ABCDEF')

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.PairingConfirmation, {
          serviceId: 'ref-123',
          serviceName: 'Test Service',
        })
      })
    })
  })

  describe('Pre-populated from route param', () => {
    test('auto-submits and navigates when route.params.pairingCode is a full-length code', async () => {
      mockLoginByPairingCode.mockResolvedValue({
        client_ref_id: 'ref-456',
        client_name: 'BC Parks Discover Camping',
      })
      jest.mocked(useRoute).mockReturnValue({ params: { pairingCode: 'SKGAZZ' } } as ReturnType<typeof useRoute>)
      // Mirror the navigator clearing the param, otherwise the effect re-submits on every re-render
      mockNavigation.setParams.mockImplementationOnce((params: object) => {
        jest.mocked(useRoute).mockReturnValue({ params } as ReturnType<typeof useRoute>)
      })

      renderScreen()

      await waitFor(() => {
        expect(mockLoginByPairingCode).toHaveBeenCalledWith('SKGAZZ', ChallengeSource.RemotePairingQrCode)
      })
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.PairingConfirmation, {
        serviceId: 'ref-456',
        serviceName: 'BC Parks Discover Camping',
      })
      // Param is cleared after consumption so re-focus doesn't re-submit
      expect(mockNavigation.setParams).toHaveBeenCalledWith({ pairingCode: undefined })
    })

    test('does not auto-submit when the param is too short', async () => {
      jest.mocked(useRoute).mockReturnValue({ params: { pairingCode: 'ABC' } } as ReturnType<typeof useRoute>)

      renderScreen()

      await waitFor(() => {
        expect(mockLoginByPairingCode).not.toHaveBeenCalled()
      })
      expect(mockNavigation.setParams).not.toHaveBeenCalled()
    })
  })
})
