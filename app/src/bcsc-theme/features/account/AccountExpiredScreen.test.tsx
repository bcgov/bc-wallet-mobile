import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { AccountExpiredScreen } from './AccountExpiredScreen'

describe('AccountExpired', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()

    jest.clearAllMocks()
    jest.useFakeTimers()

    const mockAccountContext = {
      account: {
        card_expiry: '2024-12-31',
        fullname_formatted: 'John Doe',
      },
    }

    jest.spyOn(React, 'useContext').mockReturnValue(mockAccountContext)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <AccountExpiredScreen navigation={mockNavigation} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
