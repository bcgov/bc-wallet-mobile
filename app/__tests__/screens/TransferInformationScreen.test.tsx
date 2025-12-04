import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import TransferInformationScreen from '../../src/bcsc-theme/features/account-transfer/TransferInformationScreen'

describe('TransferInformation', () => {
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
        <TransferInformationScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
