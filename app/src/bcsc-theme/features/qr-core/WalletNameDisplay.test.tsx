import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'
import WalletNameDisplay from './WalletNameDisplay'

describe('WalletNameDisplay', () => {
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation()
  })

  const renderComponent = (nickname?: string) =>
    render(
      <BasicAppContext initialStateOverride={{ bcsc: { selectedNickname: nickname } }}>
        <WalletNameDisplay />
      </BasicAppContext>
    )

  it('renders the wallet nickname from the store', () => {
    renderComponent('Custom Wallet')
    expect(screen.getByTestId(testIdWithKey('WalletName'))).toHaveTextContent('Custom Wallet')
  })

  it('falls back to "My Wallet" when no nickname is set', () => {
    renderComponent(undefined)
    expect(screen.getByTestId(testIdWithKey('WalletName'))).toHaveTextContent('My Wallet')
  })

  it('navigates to EditNickname when the edit button is pressed', () => {
    renderComponent()
    fireEvent.press(screen.getByTestId(testIdWithKey('EditNickname')))
    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.EditNickname)
  })
})
