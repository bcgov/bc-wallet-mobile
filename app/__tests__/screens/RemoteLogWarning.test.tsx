import { AgentProvider, StoreProvider } from '@hyperledger/aries-bifold-core'
import { render } from '@testing-library/react-native'
import React from 'react'

import RemoteLogWarning from '../../src/screens/RemoteLogWarning'
// import { AttestationProvider } from '../../src/hooks/useAttestation'
import { initialState, reducer } from '../../src/store'

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

describe('RemoteLogWarning Screen', () => {
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
          <RemoteLogWarning onEnablePressed={jest.fn()} onBackPressed={jest.fn()} />
        </AttestationProvider>
      </StoreProvider>
    )

    expect(tree).toMatchSnapshot()
  })
})
