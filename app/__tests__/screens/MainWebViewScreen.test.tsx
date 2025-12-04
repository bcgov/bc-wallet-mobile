import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import { MainWebViewScreen } from '../../src/bcsc-theme/features/webview/MainWebViewScreen'

describe('MainWebView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const route = { params: { url: 'https://example.com', title: 'Test' } }
    const tree = render(
      <BasicAppContext>
        <MainWebViewScreen route={route as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
