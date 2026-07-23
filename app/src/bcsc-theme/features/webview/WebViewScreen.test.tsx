import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { WebViewScreen } from './WebViewScreen'

describe('WebViewScreen', () => {
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
        <WebViewScreen route={route as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('shows the error modal with the correct title and description on a native load failure', () => {
    const route = { params: { url: 'https://example.com', title: 'Test' } }
    const tree = render(
      <BasicAppContext>
        <WebViewScreen route={route as never} />
      </BasicAppContext>
    )

    fireEvent(tree.getByTestId('mocked-webview'), 'error', {
      nativeEvent: { description: 'net::ERR_NAME_NOT_RESOLVED' },
    })

    expect(tree.getByText('Alerts.WebViewLoadFailed.Title')).toBeTruthy()
    expect(tree.getByText('Alerts.WebViewLoadFailed.Description')).toBeTruthy()
  })

  it('shows the error modal with the correct title and description on an HTTP error', () => {
    const route = { params: { url: 'https://example.com', title: 'Test' } }
    const tree = render(
      <BasicAppContext>
        <WebViewScreen route={route as never} />
      </BasicAppContext>
    )

    fireEvent(tree.getByTestId('mocked-webview'), 'httpError', {
      nativeEvent: { url: 'https://example.com', statusCode: 500, description: 'Internal Server Error' },
    })

    expect(tree.getByText('Alerts.WebViewHttpError.Title')).toBeTruthy()
    expect(tree.getByText('Alerts.WebViewHttpError.Description')).toBeTruthy()
  })
})
