import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import TransferQRDisplayScreen from '../../src/bcsc-theme/features/account-transfer/TransferQRDisplayScreen'

describe('TransferQRDisplay', () => {
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
        <TransferQRDisplayScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
