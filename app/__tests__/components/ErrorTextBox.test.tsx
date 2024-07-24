import { render } from '@testing-library/react-native'
import React from 'react'

import ErrorTextBox from '../../src/components/ErrorTextBox'

// Mock the RNPermissionsModule
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
}))

describe('ErrorTextBox Component', () => {
  test('renders correctly', () => {
    const tree = render(<ErrorTextBox>Lorem ipsum sit dolar</ErrorTextBox>)
    expect(tree).toMatchSnapshot()
  })
})
