import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
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
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <ManualPairing navigation={mockNavigation as never} route={{} as never} />
      </BasicAppContext>
    )

  describe('Rendering', () => {
    test('renders correctly', () => {
      const tree = renderScreen()
      expect(tree).toMatchSnapshot()
    })
  })

  describe('Submission', () => {
    test('shows error when submitting empty code', () => {
      renderScreen()
      fireEvent.press(screen.getByTestId(testIdWithKey('Submit')))
      expect(screen.getByText('BCSC.ManualPairing.EmptyPairingCodeMessage')).toBeTruthy()
    })

    test('submits valid pairing code', async () => {
      mockLoginByPairingCode.mockResolvedValue({
        client_ref_id: 'ref-123',
        client_name: 'Test Service',
      })
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('ManualPairingCodeInput'))
      fireEvent.changeText(codeInput, 'ABCDEF')
      fireEvent.press(screen.getByTestId(testIdWithKey('Submit')))

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
      fireEvent.press(screen.getByTestId(testIdWithKey('Submit')))

      await waitFor(() => {
        expect(mockLoginByPairingCode).toHaveBeenCalledWith('ABCDEF')
      })
    })

    test('shows error when submission fails', async () => {
      mockLoginByPairingCode.mockRejectedValue(new Error('Network error'))
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('ManualPairingCodeInput'))
      fireEvent.changeText(codeInput, 'ABCDEF')
      fireEvent.press(screen.getByTestId(testIdWithKey('Submit')))

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
      fireEvent.press(screen.getByTestId(testIdWithKey('Submit')))

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.PairingConfirmation, {
          serviceId: 'ref-123',
          serviceName: 'Test Service',
        })
      })
    })
  })
})
