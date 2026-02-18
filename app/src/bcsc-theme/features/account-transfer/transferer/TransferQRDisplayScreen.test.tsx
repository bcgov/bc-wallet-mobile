import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import TransferQRDisplayScreen from './TransferQRDisplayScreen'

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
