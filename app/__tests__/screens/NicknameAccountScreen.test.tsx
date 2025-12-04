import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import NicknameAccountScreen from '../../src/bcsc-theme/features/account/NicknameAccountScreen'



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
