import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import MismatchedSerialScreen from './MismatchedSerialScreen'

describe('MismatchedSerial', () => {
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
        <MismatchedSerialScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
