import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import RemoteLogWarning from '../../src/screens/RemoteLogWarning'

jest.mock('react-native-splash-screen', () => ({}))

describe('RemoteLogWarning Screen', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test('screen renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <RemoteLogWarning onEnablePressed={jest.fn()} onBackPressed={jest.fn()} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
