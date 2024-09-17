import { render } from '@testing-library/react-native'
import React from 'react'
import PINCreateHeader from '../../src/components/PINCreateHeader'

// Mock the RNPermissionsModule
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
}))

describe('PINCreateHeader Component', () => {
  test('Renders correctly', async () => {
    const tree = render(<PINCreateHeader updatePin />)

    expect(tree).toMatchSnapshot()
  })
})
