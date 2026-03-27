import useApi from '@/bcsc-theme/api/hooks/useApi'
import { PairingService, PairingServiceProvider } from '@/bcsc-theme/features/pairing'
import * as useServiceLoginStateModule from '@/bcsc-theme/features/services/hooks/useServiceLoginState'
import { AppError } from '@/errors/appError'
import { ErrorCategory } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
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
jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    pairing: { loginByPairingCode: jest.fn() },
    metadata: {},
  })),
}))

jest.mock('@/bcsc-theme/hooks/useQuickLoginUrl', () => ({
  useQuickLoginURL: jest.fn(() => jest.fn()),
}))

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
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const route = { params: { serviceClient: { client_id: 'test-client' } } }
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
        },
        isLoading: false,
        serviceHydrated: true,
      })

      const { getByText, queryByTestId } = renderScreen(mockNavigation)

      expect(getByText(SERVICE_CLIENT_URI)).toBeTruthy()
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
  })
})
