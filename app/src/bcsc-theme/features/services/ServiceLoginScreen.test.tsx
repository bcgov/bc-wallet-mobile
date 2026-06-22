import useApi from '@/bcsc-theme/api/hooks/useApi'
import { PairingService, PairingServiceProvider } from '@/bcsc-theme/features/pairing'
import * as useServiceLoginStateModule from '@/bcsc-theme/features/services/hooks/useServiceLoginState'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl, REPORT_SUSPICIOUS_URL } from '@/constants'
import { AppError } from '@/errors/appError'
import { ErrorCategory } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Alert, Linking } from 'react-native'
import { ServiceLoginScreen } from './ServiceLoginScreen'

jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    pairing: { loginByPairingCode: jest.fn() },
    metadata: { getClientMetadata: jest.fn().mockResolvedValue([]) },
  })),
}))

jest.mock('@/bcsc-theme/hooks/useQuickLoginUrl', () => ({
  useQuickLoginURL: jest.fn(() => jest.fn()),
}))

jest.mock('./hooks/useServiceLoginState', () => ({
  useServiceLoginState: jest.fn(),
}))

import { useServiceLoginState } from './hooks/useServiceLoginState'

const mockedUseServiceLoginState = useServiceLoginState as jest.MockedFunction<typeof useServiceLoginState>
const mockedUseQuickLoginURL = useQuickLoginURL as jest.MockedFunction<typeof useQuickLoginURL>

const SERVICE_CLIENT_URI = 'https://service.example.com'

const createMockPairingService = () =>
  ({
    hasPendingPairing: false,
    consumePendingPairing: jest.fn(),
    onNavigationRequest: jest.fn(() => () => {}),
    onPendingStateChange: jest.fn(() => () => {}),
    handlePairing: jest.fn(),
    processPendingPairing: jest.fn(),
    clearPendingPairing: jest.fn(),
    getPendingPairing: jest.fn(),
  }) as unknown as PairingService

const renderScreen = (mockNavigation: any) => {
  const route = { params: { serviceClientId: 'service-client-id' } }
  return render(
    <BasicAppContext>
      <PairingServiceProvider service={createMockPairingService()}>
        <ServiceLoginScreen navigation={mockNavigation as never} route={route as never} />
      </PairingServiceProvider>
    </BasicAppContext>
  )
}

describe('ServiceLogin', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockedUseServiceLoginState.mockReturnValue({
      state: {},
      isLoading: true,
      serviceHydrated: false,
    })
    mockedUseQuickLoginURL.mockReturnValue(jest.fn())
    mockNavigation.canGoBack = jest.fn().mockReturnValue(false)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const route = { params: { serviceClientId: 'test-client' } }
    const tree = render(
      <BasicAppContext>
        <PairingServiceProvider service={createMockPairingService()}>
          <ServiceLoginScreen navigation={mockNavigation as never} route={route as never} />
        </PairingServiceProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  describe('Render views', () => {
    it('renders Default view (quick login available)', () => {
      mockedUseServiceLoginState.mockReturnValue({
        state: {
          serviceTitle: 'Test Service',
          serviceInitiateLoginUri: 'https://login.example.com',
          serviceClientUri: SERVICE_CLIENT_URI,
          claimsDescription: 'Your name and birthdate',
          privacyPolicyUri: 'https://privacy.example.com',
        },
        isLoading: false,
        serviceHydrated: true,
      })

      const { getByTestId, queryByTestId } = renderScreen(mockNavigation)

      expect(getByTestId(testIdWithKey('ReportSuspiciousLink'))).toBeTruthy()
      expect(queryByTestId(testIdWithKey('ServiceClientLink'))).toBeNull()
    })

    it('renders Unavailable view (quick login unavailable)', () => {
      mockedUseServiceLoginState.mockReturnValue({
        state: {
          serviceTitle: 'Test Service',
          serviceClientUri: SERVICE_CLIENT_URI,
        },
        isLoading: false,
        serviceHydrated: true,
      })

      const { getByTestId } = renderScreen(mockNavigation)

      expect(getByTestId(testIdWithKey('ServiceClientLink'))).toBeTruthy()
    })

    it('renders Unavailable view (quick login unavailable) without service client URI', () => {
      mockedUseServiceLoginState.mockReturnValue({
        state: {
          serviceTitle: 'Test Service',
          serviceClientUri: undefined,
        },
        isLoading: false,
        serviceHydrated: true,
      })

      const { queryByTestId } = renderScreen(mockNavigation)

      expect(queryByTestId(testIdWithKey('ServiceClientLink'))).toBeNull()
    })

    it('opens service client URI when ServiceClientLink is pressed', () => {
      mockedUseServiceLoginState.mockReturnValue({
        state: {
          serviceTitle: 'Test Service',
          serviceClientUri: SERVICE_CLIENT_URI,
        },
        isLoading: false,
        serviceHydrated: true,
      })

      const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
      const { getByTestId } = renderScreen(mockNavigation)

      fireEvent.press(getByTestId(testIdWithKey('ServiceClientLink')))

      expect(mockOpenURL).toHaveBeenCalledWith(SERVICE_CLIENT_URI)
      mockOpenURL.mockRestore()
    })

    it('renders Default view with privacy policy card when privacyPolicyUri is set', () => {
      mockedUseServiceLoginState.mockReturnValue({
        state: {
          serviceTitle: 'Test Service',
          serviceInitiateLoginUri: 'https://login.example.com',
          privacyPolicyUri: 'https://privacy.example.com',
          claimsDescription: 'Your name and birthdate',
        },
        isLoading: false,
        serviceHydrated: true,
      })

      const { getByTestId } = renderScreen(mockNavigation)

      expect(getByTestId(testIdWithKey('ReadPrivacyPolicy'))).toBeTruthy()
      expect(getByTestId(testIdWithKey('ReportSuspiciousLink'))).toBeTruthy()
    })

    it('renders Default view with report suspicious link when no privacyPolicyUri', () => {
      mockedUseServiceLoginState.mockReturnValue({
        state: {
          serviceTitle: 'Test Service',
          serviceInitiateLoginUri: 'https://login.example.com',
          claimsDescription: 'Your name and birthdate',
        },
        isLoading: false,
        serviceHydrated: true,
      })

      const { getByTestId, queryByTestId } = renderScreen(mockNavigation)

      expect(getByTestId(testIdWithKey('ReportSuspiciousLink'))).toBeTruthy()
      expect(queryByTestId(testIdWithKey('ReadPrivacyPolicy'))).toBeNull()
    })

    it('opens REPORT_SUSPICIOUS_URL when the report suspicious link is pressed', () => {
      mockedUseServiceLoginState.mockReturnValue({
        state: {
          serviceTitle: 'Test Service',
          serviceInitiateLoginUri: 'https://login.example.com',
          claimsDescription: 'Your name and birthdate',
        },
        isLoading: false,
        serviceHydrated: true,
      })

      const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
      const { getByTestId } = renderScreen(mockNavigation)

      fireEvent.press(getByTestId(testIdWithKey('BCSC.Services.ReportSuspicious')))

      expect(mockOpenURL).toHaveBeenCalledWith(REPORT_SUSPICIOUS_URL)
      mockOpenURL.mockRestore()
    })
  })

  describe('Unavailable view GoToServiceClient', () => {
    const renderUnavailable = (extraState: Record<string, unknown> = {}) => {
      mockedUseServiceLoginState.mockReturnValue({
        state: { serviceTitle: 'Test Service', ...extraState },
        isLoading: false,
        serviceHydrated: true,
      })
      return renderScreen(mockNavigation)
    }

    it('does not call Linking.openURL when serviceClientUri is missing', () => {
      const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
      const { getByTestId } = renderUnavailable()

      fireEvent.press(getByTestId(testIdWithKey('GoToServiceClient')))

      expect(mockOpenURL).not.toHaveBeenCalled()
      mockOpenURL.mockRestore()
    })

    it('opens serviceClientUri when GoToServiceClient is pressed', async () => {
      const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
      const { getByTestId } = renderUnavailable({ serviceClientUri: SERVICE_CLIENT_URI })

      fireEvent.press(getByTestId(testIdWithKey('GoToServiceClient')))

      await waitFor(() => expect(mockOpenURL).toHaveBeenCalledWith(SERVICE_CLIENT_URI))
      mockOpenURL.mockRestore()
    })

    it('shows alert when Linking.openURL rejects', async () => {
      const mockOpenURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('failed'))
      const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation()
      const { getByTestId } = renderUnavailable({ serviceClientUri: SERVICE_CLIENT_URI })

      fireEvent.press(getByTestId(testIdWithKey('GoToServiceClient')))

      await waitFor(() => expect(mockAlert).toHaveBeenCalled())
      mockOpenURL.mockRestore()
      mockAlert.mockRestore()
    })
  })

  describe('onContinueWithPairingCode error handling', () => {
    const mockedUseApi = useApi as jest.MockedFunction<typeof useApi>

    const renderWithPairingCode = (mockLoginByPairingCode: jest.Mock, mockAlerts: Record<string, jest.Mock>) => {
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)
      jest.spyOn(useServiceLoginStateModule, 'useServiceLoginState').mockReturnValue({
        state: { pairingCode: 'ABC123', serviceTitle: 'Test Service' },
        isLoading: false,
        serviceHydrated: true,
      })
      mockedUseApi.mockReturnValue({
        pairing: { loginByPairingCode: mockLoginByPairingCode },
        metadata: {},
      } as any)

      const route = {
        params: {
          pairingCode: 'ABC123',
          serviceTitle: 'Test Service',
          serviceClientId: 'test-client',
        },
      }

      return render(
        <BasicAppContext>
          <PairingServiceProvider service={createMockPairingService()}>
            <ServiceLoginScreen navigation={mockNavigation as never} route={route as never} />
          </PairingServiceProvider>
        </BasicAppContext>
      )
    }

    it('should not show alert when pairing code error is already handled by error policy', async () => {
      const handledError = new AppError(
        'test error',
        {
          category: ErrorCategory.AUTHENTICATION,
          appEvent: AppEventCode.INVALID_PAIRING_CODE,
          statusCode: 2205,
        },
        { track: false }
      )
      handledError.handled = true

      const mockLoginServerErrorAlert = jest.fn()
      const tree = renderWithPairingCode(jest.fn().mockRejectedValue(handledError), {
        loginServerErrorAlert: mockLoginServerErrorAlert,
      })

      const continueButton = tree.getByTestId('com.ariesbifold:id/ServiceLoginContinue')
      fireEvent.press(continueButton)
      await waitFor(() => expect(mockLoginServerErrorAlert).not.toHaveBeenCalled())
    })

    it('should show loginServerErrorAlert when pairing code error is not handled', async () => {
      const mockLoginServerErrorAlert = jest.fn()
      const tree = renderWithPairingCode(jest.fn().mockRejectedValue(new Error('unexpected failure')), {
        loginServerErrorAlert: mockLoginServerErrorAlert,
      })

      const continueButton = tree.getByTestId('com.ariesbifold:id/ServiceLoginContinue')
      fireEvent.press(continueButton)
      await waitFor(() => expect(mockLoginServerErrorAlert).toHaveBeenCalled())
    })

    it('should ignore a second press while a call is in-flight', async () => {
      let resolveLogin!: (value: { client_ref_id: string; client_name: string }) => void
      const pendingLogin = new Promise<{ client_ref_id: string; client_name: string }>((resolve) => {
        resolveLogin = resolve
      })
      const mockLoginByPairingCode = jest.fn().mockReturnValue(pendingLogin)

      const tree = renderWithPairingCode(mockLoginByPairingCode, {
        loginServerErrorAlert: jest.fn(),
      })

      const continueButton = tree.getByTestId('com.ariesbifold:id/ServiceLoginContinue')
      fireEvent.press(continueButton)
      fireEvent.press(continueButton) // second tap while in-flight

      resolveLogin({ client_ref_id: 'test-client', client_name: 'Test Service' })

      await waitFor(() => expect(mockLoginByPairingCode).toHaveBeenCalledTimes(1))
    })
  })

  describe('onContinueWithQuickLoginUrl', () => {
    const mockedUseApi = useApi as jest.MockedFunction<typeof useApi>

    const renderWithService = (mockGetQuickLoginURL: jest.Mock, mockAlerts: Record<string, jest.Mock>) => {
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)
      jest.spyOn(useServiceLoginStateModule, 'useServiceLoginState').mockReturnValue({
        state: {
          serviceTitle: 'Test Service',
          serviceInitiateLoginUri: 'https://login.example.com',
          service: { client_ref_id: 'test', client_name: 'Test Service' } as any,
          privacyPolicyUri: 'https://privacy.example.com',
        },
        isLoading: false,
        serviceHydrated: true,
      })
      mockedUseApi.mockReturnValue({
        pairing: { loginByPairingCode: jest.fn() },
        metadata: {},
      } as any)
      mockedUseQuickLoginURL.mockReturnValue(mockGetQuickLoginURL)

      const route = { params: { serviceClientId: 'test-client' } }
      return render(
        <BasicAppContext>
          <PairingServiceProvider service={createMockPairingService()}>
            <ServiceLoginScreen navigation={mockNavigation as never} route={route as never} />
          </PairingServiceProvider>
        </BasicAppContext>
      )
    }

    it('should open URL and navigate home on successful quick login', async () => {
      const quickLoginUrl = 'https://login.example.com/quick'
      const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
      const mockGetQuickLoginURL = jest.fn().mockResolvedValue({ success: true, url: quickLoginUrl })

      const tree = renderWithService(mockGetQuickLoginURL, { loginServerErrorAlert: jest.fn() })

      fireEvent.press(tree.getByTestId('com.ariesbifold:id/ServiceLoginContinue'))

      await waitFor(() => expect(mockOpenURL).toHaveBeenCalledWith(quickLoginUrl))
      await waitFor(() => expect(mockNavigation.reset).toHaveBeenCalled())

      mockOpenURL.mockRestore()
    })

    it('should show loginServerErrorAlert when quick login URL generation fails', async () => {
      const mockLoginServerErrorAlert = jest.fn()
      const mockGetQuickLoginURL = jest.fn().mockResolvedValue({ error: 'token expired' })

      const tree = renderWithService(mockGetQuickLoginURL, { loginServerErrorAlert: mockLoginServerErrorAlert })

      fireEvent.press(tree.getByTestId('com.ariesbifold:id/ServiceLoginContinue'))

      await waitFor(() => expect(mockLoginServerErrorAlert).toHaveBeenCalled())
    })

    it('should show alert and not navigate when Linking.openURL throws', async () => {
      const quickLoginUrl = 'https://login.example.com/quick'
      const mockOpenURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('failed'))
      const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation()
      const mockGetQuickLoginURL = jest.fn().mockResolvedValue({ success: true, url: quickLoginUrl })

      const tree = renderWithService(mockGetQuickLoginURL, { loginServerErrorAlert: jest.fn() })

      fireEvent.press(tree.getByTestId('com.ariesbifold:id/ServiceLoginContinue'))

      await waitFor(() => expect(mockAlert).toHaveBeenCalled())
      expect(mockNavigation.reset).not.toHaveBeenCalled()

      mockOpenURL.mockRestore()
      mockAlert.mockRestore()
    })
  })

  describe('onContinue fallback', () => {
    it('shows loginServerErrorAlert when no service or pairing code is available', async () => {
      const mockLoginServerErrorAlert = jest.fn()
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({
        loginServerErrorAlert: mockLoginServerErrorAlert,
      } as any)
      mockedUseServiceLoginState.mockReturnValue({
        state: {
          serviceTitle: 'Test Service',
          serviceInitiateLoginUri: 'https://login.example.com',
        },
        isLoading: false,
        serviceHydrated: true,
      })

      const tree = renderScreen(mockNavigation)
      fireEvent.press(tree.getByTestId('com.ariesbifold:id/ServiceLoginContinue'))

      await waitFor(() => expect(mockLoginServerErrorAlert).toHaveBeenCalled())
    })
  })

  describe('onOpenInfoShared', () => {
    const renderDefault = () => {
      mockedUseServiceLoginState.mockReturnValue({
        state: {
          serviceTitle: 'Test Service',
          serviceInitiateLoginUri: 'https://login.example.com',
          claimsDescription: 'Your name and birthdate',
        },
        isLoading: false,
        serviceHydrated: true,
      })
      return renderScreen(mockNavigation)
    }

    it('navigates to MainWebView with INFO_SHARED url when help button is pressed', () => {
      const { getByTestId } = renderDefault()

      fireEvent.press(getByTestId(testIdWithKey('HelpButton')))

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        BCSCScreens.MainWebView,
        expect.objectContaining({ url: HelpCentreUrl.INFO_SHARED })
      )
    })

    it('does not throw when navigation throws', () => {
      mockNavigation.navigate.mockImplementationOnce(() => {
        throw new Error('navigation failed')
      })
      const { getByTestId } = renderDefault()

      expect(() => fireEvent.press(getByTestId(testIdWithKey('HelpButton')))).not.toThrow()
    })
  })

  describe('onOpenPrivacyPolicy', () => {
    const PRIVACY_URL = 'https://privacy.example.com'

    const renderWithPrivacy = () => {
      mockedUseServiceLoginState.mockReturnValue({
        state: {
          serviceTitle: 'Test Service',
          serviceInitiateLoginUri: 'https://login.example.com',
          claimsDescription: 'Your name and birthdate',
          privacyPolicyUri: PRIVACY_URL,
        },
        isLoading: false,
        serviceHydrated: true,
      })
      return renderScreen(mockNavigation)
    }

    it('opens privacy policy URL when ReadPrivacyPolicy is pressed', async () => {
      const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
      const { getByTestId } = renderWithPrivacy()

      fireEvent.press(getByTestId(testIdWithKey('ReadPrivacyPolicy')))

      await waitFor(() => expect(mockOpenURL).toHaveBeenCalledWith(PRIVACY_URL))
      mockOpenURL.mockRestore()
    })

    it('shows alert when Linking.openURL rejects', async () => {
      const mockOpenURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('failed'))
      const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation()
      const { getByTestId } = renderWithPrivacy()

      fireEvent.press(getByTestId(testIdWithKey('ReadPrivacyPolicy')))

      await waitFor(() => expect(mockAlert).toHaveBeenCalled())
      mockOpenURL.mockRestore()
      mockAlert.mockRestore()
    })
  })

  describe('onCancel', () => {
    const renderWithDefaultState = (mockPairingService: PairingService) => {
      mockedUseServiceLoginState.mockReturnValue({
        state: { serviceTitle: 'Test Service', pairingCode: 'ABC123' },
        isLoading: false,
        serviceHydrated: true,
      })

      const route = { params: { serviceClientId: 'test-client' } }
      return render(
        <BasicAppContext>
          <PairingServiceProvider service={mockPairingService}>
            <ServiceLoginScreen navigation={mockNavigation as never} route={route as never} />
          </PairingServiceProvider>
        </BasicAppContext>
      )
    }

    it('consumes pending pairing when hasPendingPairing is true', () => {
      const mockConsumePendingPairing = jest.fn()
      const mockPairingService = {
        ...createMockPairingService(),
        hasPendingPairing: true,
        consumePendingPairing: mockConsumePendingPairing,
      } as unknown as PairingService

      const { getByTestId } = renderWithDefaultState(mockPairingService)

      fireEvent.press(getByTestId('com.ariesbifold:id/ServiceLoginCancel'))

      expect(mockConsumePendingPairing).toHaveBeenCalled()
      expect(mockNavigation.goBack).not.toHaveBeenCalled()
    })

    it('goes back when navigation can go back', () => {
      mockNavigation.canGoBack.mockReturnValue(true)

      const { getByTestId } = renderWithDefaultState(createMockPairingService())

      fireEvent.press(getByTestId('com.ariesbifold:id/ServiceLoginCancel'))

      expect(mockNavigation.goBack).toHaveBeenCalled()
    })

    it('navigates to home tab when no pending pairing and no back stack', () => {
      mockNavigation.canGoBack.mockReturnValue(false)

      const { getByTestId } = renderWithDefaultState(createMockPairingService())

      fireEvent.press(getByTestId('com.ariesbifold:id/ServiceLoginCancel'))

      expect(mockNavigation.navigate).toHaveBeenCalled()
      expect(mockNavigation.goBack).not.toHaveBeenCalled()
    })
  })
})
