import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import AccountProblemScreen from './AccountProblemScreen'

describe('AccountProblemScreen', () => {
  const renderScreen = (navigation: { navigate: jest.Mock; goBack: jest.Mock }) =>
    render(
      <BasicAppContext>
        <AccountProblemScreen navigation={navigation as any} />
      </BasicAppContext>
    )

  it('renders correctly', () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() }
    const tree = renderScreen(navigation)
    expect(tree).toMatchSnapshot()
  })

  it('navigates to MainRemoveAccountConfirmation when Remove Account is pressed', () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() }
    const tree = renderScreen(navigation)

    fireEvent.press(tree.getByTestId(testIdWithKey('RemoveAccount')))

    expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainRemoveAccountConfirmation)
  })

  it('goes back when Close is pressed', () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() }
    const tree = renderScreen(navigation)

    fireEvent.press(tree.getByTestId(testIdWithKey('Close')))

    expect(navigation.goBack).toHaveBeenCalled()
  })
})
