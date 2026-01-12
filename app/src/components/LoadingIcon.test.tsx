import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import LoadingIcon from './LoadingIcon'

describe('LoadingIcon Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })
  test('renders correctly', () => {
    const size = 50 // arbitrary
    const color = '#333' // arbitrary
    const active = true // arbitrary
    const tree = render(
      <BasicAppContext>
        <LoadingIcon size={size} color={color} active={active} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})
