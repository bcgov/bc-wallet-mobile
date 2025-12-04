import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import TransferSuccessScreen from '../../src/bcsc-theme/features/account-transfer/TransferSuccessScreen'



describe('TransferSuccess', () => {

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
        <TransferSuccessScreen/>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
