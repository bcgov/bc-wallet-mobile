import { StoreProvider } from '@hyperledger/aries-bifold-core'
import { render } from '@testing-library/react-native'
import React from 'react'

import Developer from '../../src/screens/Developer'
import { AttestationProvider } from '../../src/services/attestation'
import { initialState, reducer } from '../../src/store'

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
        <AttestationProvider>
          <Developer />
        </AttestationProvider>
      </StoreProvider>
    )

    expect(tree).toMatchSnapshot()
  })
})
