import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import { AccountRenewalFinalWarningScreen } from './AccountRenewalFinalWarningScreen'

describe('AccountRenewalFinalWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <AccountRenewalFinalWarningScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
