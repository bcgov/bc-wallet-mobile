import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import EmailConfirmationScreen from '../../src/bcsc-theme/features/verify/email/EmailConfirmationScreen'



describe('EmailConfirmation', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const route = { params: { emailAddressId: 'test-email-id' } }
    const tree = render(
      <BasicAppContext>
        <EmailConfirmationScreen navigation={mockNavigation as never} route={route as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
