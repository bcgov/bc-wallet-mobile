import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import AccountSetupSelectionScreen from '../../src/bcsc-theme/features/account-transfer/AccountSetupSelectionScreen'



describe('AccountSetupSelection', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <AccountSetupSelectionScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
