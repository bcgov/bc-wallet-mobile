import { PairingService, PairingServiceProvider } from '@/bcsc-theme/features/pairing'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
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

  describe('DevicePreferenceURLView URL display', () => {
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
})
