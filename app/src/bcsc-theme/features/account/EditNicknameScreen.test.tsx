import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import EditNicknameScreen from './EditNicknameScreen'

describe('EditNickname', () => {
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
        <EditNicknameScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
