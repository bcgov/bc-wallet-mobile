import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import AccountSelectorScreen from './AccountSelectorScreen'

describe('AccountSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const mockNavigation = useNavigation()

    const tree = render(
      <BasicAppContext>
        <AccountSelectorScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
