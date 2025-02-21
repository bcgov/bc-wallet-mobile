import { StoreProvider } from '@hyperledger/aries-bifold-core'
import { render } from '@testing-library/react-native'
import React from 'react'

import PersonCredential from '../../src/screens/PersonCredential'
import { initialState, reducer } from '../../src/store'
import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'

const mockNavigation = jest.fn()
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => {
    return mockNavigation
  },
}))

describe('Person Credential Screen', () => {
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
    const navigation = useNavigation()
    const tree = render(
      <BasicAppContext>
        <StoreProvider initialState={initialState} reducer={reducer}>
          <PersonCredential navigation={navigation as never} route={{} as never} />
        </StoreProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
