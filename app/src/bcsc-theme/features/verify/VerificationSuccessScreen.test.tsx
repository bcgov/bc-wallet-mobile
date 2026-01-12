import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import VerificationSuccessScreen from './VerificationSuccessScreen'

describe('VerificationSuccess', () => {
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
        <VerificationSuccessScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
