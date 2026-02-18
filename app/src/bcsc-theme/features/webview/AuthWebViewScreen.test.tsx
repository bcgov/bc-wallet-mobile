import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { AuthWebViewScreen } from './AuthWebViewScreen'

describe('AuthWebView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const route = {
      key: 'auth-webview',
      name: 'AuthWebView',
      params: { url: 'https://example.com', title: 'Test' },
    } as any
    const tree = render(
      <BasicAppContext>
        <AuthWebViewScreen route={route} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
