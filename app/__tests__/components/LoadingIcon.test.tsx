import { render } from '@testing-library/react-native'
import React from 'react'

import LoadingIcon from '../../src/components/LoadingIcon'

describe('LoadingIcon Component', () => {
  test('renders correctly', () => {
    const size = 50 // arbitrary
    const color = '#333' // arbitrary
    const active = true // arbitrary
    const tree = render(<LoadingIcon size={size} color={color} active={active} />)
    expect(tree).toMatchSnapshot()
  })
})
