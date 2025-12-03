import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import RemoveAccountConfirmationScreen from '../../src/bcsc-theme/features/account/RemoveAccountConfirmationScreen'



describe('RemoveAccountConfirmation', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <RemoveAccountConfirmationScreen  />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
