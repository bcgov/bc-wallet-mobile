import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation, useRoute } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React from 'react'
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

describe('ManualPairing', () => {
  let mockNavigation: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation()
    jest.mocked(useRoute).mockReturnValue({ params: {} } as ReturnType<typeof useRoute>)
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
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
        expect(mockLoginByPairingCode).toHaveBeenCalledWith('ABCDEF')
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
        expect(mockLoginByPairingCode).toHaveBeenCalledWith('ABCDEF')
      })
    })

    test('shows error when submission fails', async () => {
      mockLoginByPairingCode.mockRejectedValue(new Error('Network error'))
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('ManualPairingCodeInput'))
      fireEvent.changeText(codeInput, 'ABCDEF')

      await waitFor(() => {
        expect(screen.getByText('BCSC.ManualPairing.FailedToSubmitPairingCodeMessage')).toBeTruthy()
      })
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

      renderScreen()

      await waitFor(() => {
        expect(mockLoginByPairingCode).toHaveBeenCalledWith('SKGAZZ')
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
