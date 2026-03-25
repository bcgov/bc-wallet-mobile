import { PairingService, PairingServiceProvider } from '@/bcsc-theme/features/pairing'
import { AppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { ErrorCategory } from '@/errors/errorRegistry'
import * as useAlertsModule from '@/hooks/useAlerts'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
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

  describe('onContinueWithPairingCode error handling', () => {
    const useApi = require('@/bcsc-theme/api/hooks/useApi').default as jest.Mock

    const renderWithPairingCode = (mockLoginByPairingCode: jest.Mock, mockAlerts: Record<string, jest.Mock>) => {
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)
      useApi.mockReturnValue({
        pairing: { loginByPairingCode: mockLoginByPairingCode },
        metadata: {},
      })

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
      const handledError = new AppError('Test', 'test error', {
        category: ErrorCategory.AUTHENTICATION,
        appEvent: AppEventCode.INVALID_PAIRING_CODE,
        statusCode: 2205,
      }, { track: false })
      handledError.handled = true

      const mockLoginServerErrorAlert = jest.fn()
      const tree = renderWithPairingCode(
        jest.fn().mockRejectedValue(handledError),
        { loginServerErrorAlert: mockLoginServerErrorAlert }
      )

      const continueButton = tree.queryByTestId('com.ariesbifold:id/ServiceLoginContinue')
      if (continueButton) {
        fireEvent.press(continueButton)
        await waitFor(() => expect(mockLoginServerErrorAlert).not.toHaveBeenCalled())
      }
    })

    it('should show loginServerErrorAlert when pairing code error is not handled', async () => {
      const mockLoginServerErrorAlert = jest.fn()
      const tree = renderWithPairingCode(
        jest.fn().mockRejectedValue(new Error('unexpected failure')),
        { loginServerErrorAlert: mockLoginServerErrorAlert }
      )

      const continueButton = tree.queryByTestId('com.ariesbifold:id/ServiceLoginContinue')
      if (continueButton) {
        fireEvent.press(continueButton)
        await waitFor(() => expect(mockLoginServerErrorAlert).toHaveBeenCalled())
      }
    })
  })
})
