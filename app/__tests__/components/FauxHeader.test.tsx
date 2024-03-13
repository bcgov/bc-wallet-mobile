import { render } from '@testing-library/react-native'
import React from 'react'

import FauxHeader from '../../src/components/FauxHeader'

describe('FauxHeader Component', () => {
  test('renders correctly', () => {
    const tree = render(<FauxHeader title={'test'} onBackPressed={jest.fn()} />)
    expect(tree).toMatchSnapshot()
  })
})
