import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import TransferInstructionsScreen from '../../src/bcsc-theme/features/account-transfer/TransferInstructionsScreen'

describe('TransferInstructions', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <TransferInstructionsScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
