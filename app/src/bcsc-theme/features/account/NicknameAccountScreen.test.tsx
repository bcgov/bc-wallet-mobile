import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import NicknameAccountScreen from './NicknameAccountScreen'

describe('NicknameAccount', () => {
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
        <NicknameAccountScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
