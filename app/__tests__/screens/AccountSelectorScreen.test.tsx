import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/@react-navigation/native'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import AccountSelectorScreen from '../../src/bcsc-theme/features/auth/AccountSelectorScreen'

describe('AccountSetup', () => {
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('when nicknames exist', () => {
    it('renders correctly with nickname buttons', () => {
      const tree = render(
        <BasicAppContext initialStateOverride={{ bcsc: { nicknames: ['John', 'Jane'] } as any }}>
          <AccountSelectorScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      expect(tree.getByText('BCSC.AccountSetup.ContinueAs')).toBeTruthy()
      expect(tree.getByText('John')).toBeTruthy()
      expect(tree.getByText('Jane')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('dispatches SELECT_ACCOUNT and navigates to EnterPIN when nickname is pressed', () => {
      const tree = render(
        <BasicAppContext initialStateOverride={{ bcsc: { nicknames: ['John'] } as any }}>
          <AccountSelectorScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      const nicknameButton = tree.getByText('John')
      fireEvent.press(nicknameButton)

      expect(mockNavigation.navigate).toHaveBeenCalledWith('BCSCEnterPIN')
    })
  })

  describe('when no nicknames exist', () => {
    it('renders Continue setting up account button', () => {
      const tree = render(
        <BasicAppContext initialStateOverride={{ bcsc: { nicknames: [] } as any }}>
          <AccountSelectorScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      expect(tree.getByText('Continue setting up account')).toBeTruthy()
      expect(tree.queryByText('BCSC.AccountSetup.ContinueAs')).toBeNull()
      expect(tree).toMatchSnapshot()
    })

    it('navigates to EnterPIN when Continue button is pressed', () => {
      const tree = render(
        <BasicAppContext initialStateOverride={{ bcsc: { nicknames: [] } as any }}>
          <AccountSelectorScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      const continueButton = tree.getByTestId('com.ariesbifold:id/ContinueSetup')
      fireEvent.press(continueButton)

      expect(mockNavigation.navigate).toHaveBeenCalledWith('BCSCEnterPIN')
    })
  })
})
