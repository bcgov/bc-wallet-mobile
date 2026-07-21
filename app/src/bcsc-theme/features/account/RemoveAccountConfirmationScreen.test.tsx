import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import RemoveAccountConfirmationScreen from './RemoveAccountConfirmationScreen'

const mockFactoryReset = jest.fn()
jest.mock('@/bcsc-theme/api/hooks/useFactoryReset', () => ({
  useFactoryReset: () => mockFactoryReset,
}))

describe('RemoveAccountConfirmationScreen', () => {
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <RemoveAccountConfirmationScreen />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

  it('renders correctly', () => {
    const tree = renderScreen()
    expect(tree).toMatchSnapshot()
  })

  it('calls factoryReset and navigates back when confirm is pressed', async () => {
    mockFactoryReset.mockResolvedValue({ success: true })
    const tree = renderScreen()

    fireEvent.press(tree.getByTestId(testIdWithKey('ConfirmDestructiveAction')))

    expect(mockNavigation.goBack).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockFactoryReset).toHaveBeenCalled()
    })
  })
})
