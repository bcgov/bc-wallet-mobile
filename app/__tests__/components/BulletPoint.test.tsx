import { render } from '@testing-library/react-native'
import React from 'react'
import BulletPoint from '../../src/components/BulletPoint'

// Mock the RNPermissionsModule
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
}))

describe('BulletPoint Component', () => {
  test('Renders correctly', async () => {
    const tree = render(<BulletPoint text={'Any Text'} />)

    expect(tree).toMatchSnapshot()
  })
})
