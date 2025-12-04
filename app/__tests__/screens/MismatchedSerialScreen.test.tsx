import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import MismatchedSerialScreen from '../../src/bcsc-theme/features/verify/MismatchedSerialScreen'



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
        <MismatchedSerialScreen/>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
