import { StoreProvider } from '@hyperledger/aries-bifold-core'
import { render } from '@testing-library/react-native'
import React from 'react'

import RemoteLogWarning from '../../src/screens/RemoteLogWarning'
import { initialState, reducer } from '../../src/store'

jest.mock('react-native-splash-screen', () => ({}))

describe('RemoteLogWarning Screen', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test('screen renders correctly', () => {
    const tree = render(
      <StoreProvider initialState={initialState} reducer={reducer}>
        <RemoteLogWarning onEnablePressed={jest.fn()} onBackPressed={jest.fn()} />
      </StoreProvider>
    )

    expect(tree).toMatchSnapshot()
  })
})
