import { testIdWithKey } from '@bifold/core'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import { act } from 'react-test-renderer'
import { useNavigation } from '../../__mocks__/@react-navigation/native'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import TransferSuccessScreen from '../../src/bcsc-theme/features/account-transfer/transferer/TransferSuccessScreen'
import { BCSCScreens, BCSCStacks } from '../../src/bcsc-theme/types/navigators'

describe('TransferSuccess', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Render tests', () => {
    it('renders correctly', () => {
      const tree = render(
        <BasicAppContext>
          <TransferSuccessScreen />
        </BasicAppContext>
      )

      expect(tree).toMatchSnapshot()
    })
  })

  describe('Navigation tests', () => {
    it('navigates to Home when primary button is pressed', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <TransferSuccessScreen />
        </BasicAppContext>
      )

      const homeButton = getByTestId(testIdWithKey('BCSC.TransferSuccess.ButtonText'))
      act(() => {
        fireEvent.press(homeButton)
      })

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCStacks.Tab, { screen: BCSCScreens.Home })
    })

    it('navigates to RemoveAccountConfirmation when remove account button is pressed', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <TransferSuccessScreen />
        </BasicAppContext>
      )

      const removeAccountButton = getByTestId(testIdWithKey('BCSC.Account.RemoveAccount'))
      act(() => {
        fireEvent.press(removeAccountButton)
      })

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.RemoveAccountConfirmation)
    })
  })
})
