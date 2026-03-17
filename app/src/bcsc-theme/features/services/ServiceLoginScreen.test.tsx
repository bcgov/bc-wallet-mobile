import { PairingService, PairingServiceProvider } from '@/bcsc-theme/features/pairing'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { ServiceLoginScreen } from './ServiceLoginScreen'

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

describe('ServiceLogin', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
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
})
