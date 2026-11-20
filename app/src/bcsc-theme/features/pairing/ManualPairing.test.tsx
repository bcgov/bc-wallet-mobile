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
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
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

  const screenTree = () => (
    <BasicAppContext>
      <BCSCLoadingProvider>
        <ManualPairing />
      </BCSCLoadingProvider>
    </BasicAppContext>
  )

  const renderScreen = () => render(screenTree())

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
      // The code unlocks again for another try
      expect(screen.getByTestId(testIdWithKey('ManualPairingCodeInput')).props.editable).toBe(true)
      expect(screen.queryByTestId(testIdWithKey('ManualPairingVerifying'))).toBeNull()
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

  describe('Waiting inside the card', () => {
    test('locks the code and shows the spinner while the code is checked, with the overlay down', async () => {
      let settle: (client: { client_ref_id: string; client_name: string }) => void = () => {}
      mockLoginByPairingCode.mockReturnValue(
        new Promise((resolve) => {
          settle = resolve
        })
      )
      renderScreen()

      fireEvent.changeText(screen.getByTestId(testIdWithKey('ManualPairingCodeInput')), 'ABCDEF')

      await waitFor(() => {
        expect(screen.getByTestId(testIdWithKey('ManualPairingVerifying'))).toBeTruthy()
      })
      expect(screen.getByTestId(testIdWithKey('ManualPairingCodeInput')).props.editable).toBe(false)
      // The wait stays inside the card, so the slide to the confirmation starts from this screen rather
      // than from behind the overlay
      expect(
        screen.getByTestId(testIdWithKey('BCSCLoadingProviderOverlay'), { includeHiddenElements: true }).props
          .accessible
      ).toBe(false)
      expect(mockNavigation.navigate).not.toHaveBeenCalled()

      await act(async () => {
        settle({ client_ref_id: 'ref-123', client_name: 'Test Service' })
      })

      expect(screen.queryByTestId(testIdWithKey('ManualPairingVerifying'))).toBeNull()
      expect(screen.getByTestId(testIdWithKey('ManualPairingCodeInput')).props.editable).toBe(true)
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.PairingConfirmation, {
        serviceId: 'ref-123',
        serviceName: 'Test Service',
      })
    })

    test('confirms the login even when the screen lost focus while the code was checked', async () => {
      // The tab bar and Back stay live while the spinner shows, so the user can leave before the answer
      // lands. The login is approved by then, and the confirmation is the only place the app says so.
      const isFocused = jest.spyOn(mockNavigation, 'isFocused').mockReturnValue(false)
      mockLoginByPairingCode.mockResolvedValue({ client_ref_id: 'ref-123', client_name: 'Test Service' })
      renderScreen()

      fireEvent.changeText(screen.getByTestId(testIdWithKey('ManualPairingCodeInput')), 'ABCDEF')

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.PairingConfirmation, {
          serviceId: 'ref-123',
          serviceName: 'Test Service',
        })
      })
      expect(screen.queryByTestId(testIdWithKey('ManualPairingVerifying'))).toBeNull()
      isFocused.mockRestore()
    })
  })

  // The scanner tab stays live while the spinner shows, so a scan can land on a code still being checked
  describe('A scan while a code is checked', () => {
    type ServiceClient = { client_ref_id: string; client_name: string }

    /** Queues a check whose answer the test lands by hand. */
    const pendingCheck = () => {
      let resolve: (client: ServiceClient) => void = () => {}
      let reject: (error: Error) => void = () => {}
      mockLoginByPairingCode.mockReturnValueOnce(
        new Promise<ServiceClient>((res, rej) => {
          resolve = res
          reject = rej
        })
      )
      return { resolve, reject }
    }

    /** Hands the screen a scanned code as the scanner tab does, with the navigator clearing the param. */
    const scan = (pairingCode: string) => {
      jest.mocked(useRoute).mockReturnValue({ params: { pairingCode } } as ReturnType<typeof useRoute>)
      mockNavigation.setParams.mockImplementationOnce((params: object) => {
        jest.mocked(useRoute).mockReturnValue({ params } as ReturnType<typeof useRoute>)
      })
      screen.rerender(screenTree())
    }

    test('confirms a login the replaced code completed, and keeps waiting on the scanned one', async () => {
      const typed = pendingCheck()
      const scanned = pendingCheck()
      renderScreen()

      fireEvent.changeText(screen.getByTestId(testIdWithKey('ManualPairingCodeInput')), 'ABCDEF')
      scan('SKGAZZ')

      expect(mockLoginByPairingCode).toHaveBeenLastCalledWith('SKGAZZ', ChallengeSource.RemotePairingQrCode)

      // The typed code's answer lands with the field already showing the scanned one. Its login is approved
      // all the same, so it is confirmed, but the wait still belongs to the scanned code.
      await act(async () => {
        typed.resolve({ client_ref_id: 'ref-typed', client_name: 'Typed Service' })
      })

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1)
      expect(mockNavigation.navigate).toHaveBeenLastCalledWith(BCSCScreens.PairingConfirmation, {
        serviceId: 'ref-typed',
        serviceName: 'Typed Service',
      })
      expect(screen.getByTestId(testIdWithKey('ManualPairingVerifying'))).toBeTruthy()
      expect(screen.getByTestId(testIdWithKey('ManualPairingCodeInput')).props.editable).toBe(false)

      await act(async () => {
        scanned.resolve({ client_ref_id: 'ref-scanned', client_name: 'Scanned Service' })
      })

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2)
      expect(mockNavigation.navigate).toHaveBeenLastCalledWith(BCSCScreens.PairingConfirmation, {
        serviceId: 'ref-scanned',
        serviceName: 'Scanned Service',
      })
      expect(screen.queryByTestId(testIdWithKey('ManualPairingVerifying'))).toBeNull()
    })

    test('does not report the failure of a code a scan replaced', async () => {
      alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      const typed = pendingCheck()
      const scanned = pendingCheck()
      renderScreen()

      fireEvent.changeText(screen.getByTestId(testIdWithKey('ManualPairingCodeInput')), 'ABCDEF')
      scan('SKGAZZ')

      await act(async () => {
        typed.reject(mockAssertion404('<html>Not Found</html>').appError)
      })

      expect(alertSpy).not.toHaveBeenCalled()
      expect(screen.queryByText('BCSC.ManualPairing.CodeDoesNotMatchMessage')).toBeNull()
      expect(screen.getByTestId(testIdWithKey('ManualPairingVerifying'))).toBeTruthy()

      await act(async () => {
        scanned.resolve({ client_ref_id: 'ref-scanned', client_name: 'Scanned Service' })
      })

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.PairingConfirmation, {
        serviceId: 'ref-scanned',
        serviceName: 'Scanned Service',
      })
    })

    test('does not send a code again when its own QR is scanned while it is checked', async () => {
      const typed = pendingCheck()
      renderScreen()

      fireEvent.changeText(screen.getByTestId(testIdWithKey('ManualPairingCodeInput')), 'ABCDEF')
      scan('ABCDEF')

      expect(mockNavigation.setParams).toHaveBeenCalledWith({ pairingCode: undefined })
      expect(mockLoginByPairingCode).toHaveBeenCalledTimes(1)

      await act(async () => {
        typed.resolve({ client_ref_id: 'ref-123', client_name: 'Test Service' })
      })

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1)
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.PairingConfirmation, {
        serviceId: 'ref-123',
        serviceName: 'Test Service',
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
