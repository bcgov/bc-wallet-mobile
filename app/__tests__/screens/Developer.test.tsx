import { StoreProvider } from '@hyperledger/aries-bifold-core'
import { render } from '@testing-library/react-native'
import React from 'react'

import Developer from '../../src/screens/Developer'
import { initialState, reducer } from '../../src/store'

const mockNavigation = jest.fn()
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => {
    return mockNavigation
  },
}))
jest.mock('@hyperledger/aries-bifold-core', () => ({
  ...jest.requireActual('@hyperledger/aries-bifold-core'),
  useConfiguration: jest.fn(),
  useContainer: jest.fn().mockReturnValue({
    resolve: jest.fn().mockReturnValue({
      resolve: jest.fn().mockImplementation(() => Promise.resolve({})),
      resolveAllBundles: jest.fn().mockImplementation(() => Promise.resolve({})),
    }),
  }),
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

  test('screen renders correctly', () => {
    const tree = render(
      <StoreProvider initialState={initialState} reducer={reducer}>
        <Developer />
      </StoreProvider>
    )

    expect(tree).toMatchSnapshot()
  })
})
