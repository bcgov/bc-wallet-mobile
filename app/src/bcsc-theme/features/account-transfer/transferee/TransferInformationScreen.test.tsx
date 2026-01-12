import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import TransferInformationScreen from './TransferInformationScreen'

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
