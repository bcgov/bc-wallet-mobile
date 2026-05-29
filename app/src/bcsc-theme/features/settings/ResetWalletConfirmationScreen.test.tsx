import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import ResetWalletConfirmationScreen from './ResetWalletConfirmationScreen'

const mockResetWallet = jest.fn()
jest.mock('@/bcsc-theme/features/agent/BCSCAgentProvider', () => ({
  useBCSCAgent: () => ({ resetWallet: mockResetWallet }),
}))

describe('ResetWalletConfirmationScreen', () => {
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <ResetWalletConfirmationScreen />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

  it('renders correctly', () => {
    const tree = renderScreen()
    expect(tree).toMatchSnapshot()
  })

  it('calls resetWallet and navigates back when confirm is pressed', async () => {
    mockResetWallet.mockResolvedValue(undefined)
    const tree = renderScreen()

    fireEvent.press(tree.getByTestId(testIdWithKey('ConfirmDestructiveAction')))

    expect(mockNavigation.goBack).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockResetWallet).toHaveBeenCalled()
    })
  })

  it('navigates back when cancel is pressed', () => {
    const tree = renderScreen()

    fireEvent.press(tree.getByTestId(testIdWithKey('Cancel')))

    expect(mockNavigation.goBack).toHaveBeenCalled()
  })
})
