import { StoreProvider } from '@hyperledger/aries-bifold-core'
import { render } from '@testing-library/react-native'
import React from 'react'

import PersonCredential from '../../src/screens/PersonCredential'
import { AttestationProvider } from '../../src/services/attestation'
import { initialState, reducer } from '../../src/store'

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
    const tree = render(
      <StoreProvider initialState={initialState} reducer={reducer}>
        <AttestationProvider>
          <PersonCredential />
        </AttestationProvider>
      </StoreProvider>
    )

    expect(tree).toMatchSnapshot()
  })
})
