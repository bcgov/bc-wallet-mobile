import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/@react-navigation/native'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import AccountSetupScreen from '../../src/bcsc-theme/features/onboarding/AccountSetupScreen'

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
        <AccountSetupScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
