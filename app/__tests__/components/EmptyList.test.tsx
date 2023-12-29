import { render } from '@testing-library/react-native'
import React from 'react'

import EmptyList from '../../src/components/EmptyList'

describe('EmptyList Component', () => {
  test('renders correctly', () => {
    const tree = render(<EmptyList />)
    expect(tree).toMatchSnapshot()
  })
})
