import { StoreProvider } from '@hyperledger/aries-bifold-core'
import { render } from '@testing-library/react-native'
import React from 'react'

import Developer from '../../src/screens/Developer'
import { getInitialState, reducer } from '../../src/store'

const mockNavigation = jest.fn()

jest.mock('react-native-device-info', () => {
  return {
    getVersion: () => 1,
    getBuildNumber: () => 1,
  }
})
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => {
    return mockNavigation
  },
}))

jest.mock('react-native-permissions', () => ({
  check: jest.fn().mockResolvedValue('granted'),
  request: jest.fn().mockResolvedValue('granted'),
  PERMISSIONS: {
    IOS: {},
    ANDROID: {},
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
  },
}))

describe('Developer Screen', () => {
  beforeEach(() => {
    // Silence console.error because it will print a warning about Switch
    // "Warning: dispatchCommand was called with a ref ...".
    jest.spyOn(console, 'error').mockImplementation(() => {
      return null
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('screen renders correctly', async () => {
    const initialState = await getInitialState()

    const tree = render(
      <StoreProvider initialState={initialState} reducer={reducer}>
        <Developer />
      </StoreProvider>
    )

    expect(tree).toMatchSnapshot()
  })
})
