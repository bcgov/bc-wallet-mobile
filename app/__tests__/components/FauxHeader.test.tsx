import { render } from '@testing-library/react-native'
import React from 'react'

// Mock the RNPermissionsModule
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
}))

import FauxHeader from '../../src/components/FauxHeader'

describe('FauxHeader Component', () => {
  test('renders correctly', () => {
    const tree = render(<FauxHeader title={'test'} onBackPressed={jest.fn()} />)
    expect(tree).toMatchSnapshot()
  })
})
