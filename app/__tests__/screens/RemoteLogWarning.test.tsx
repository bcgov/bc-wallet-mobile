import { StoreProvider } from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'

import RemoteLogWarning from '../../src/screens/RemoteLogWarning'
import { initialState, reducer } from '../../src/store'
import { BasicAppContext } from '../../__mocks__/helpers/app'

jest.mock('react-native-splash-screen', () => ({}))

describe('RemoteLogWarning Screen', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test('screen renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <StoreProvider initialState={initialState} reducer={reducer}>
          <RemoteLogWarning onEnablePressed={jest.fn()} onBackPressed={jest.fn()} />
        </StoreProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
