import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Linking } from 'react-native'
import { WebViewScreen } from './WebViewScreen'

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')

const endpoints = {
  account: 'https://example.com/account',
  accountDevices: 'https://example.com/account/embedded/devices',
}
const PUBLIC_URL = 'https://example.com/static/help/topics.html?fromapp=1'
const DEVICES_URL = endpoints.accountDevices

const mockClient = (getAccessToken = jest.fn().mockResolvedValue('fresh-token')) => {
  jest.mocked(useBCSCApiClient).mockReturnValue({ endpoints, getAccessToken } as never)
  return getAccessToken
}

const renderScreen = (url: string) =>
  render(
    <BasicAppContext>
      <WebViewScreen route={{ params: { url, title: 'Test' } } as never} />
    </BasicAppContext>
  )

describe('WebViewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockClient()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = renderScreen('https://example.com')

    expect(tree).toMatchSnapshot()
  })

  it('loads a public page without a bearer header and without touching the token cache', () => {
    const getAccessToken = mockClient()
    const tree = renderScreen(PUBLIC_URL)

    expect(tree.getByTestId('mocked-webview').props.source).toEqual({ uri: PUBLIC_URL })
    expect(getAccessToken).not.toHaveBeenCalled()
  })

  it('waits for a valid access token before loading an IAS account page', async () => {
    const getAccessToken = mockClient()
    const tree = renderScreen(DEVICES_URL)

    expect(tree.queryByTestId('mocked-webview')).toBeNull()
    expect(getAccessToken).toHaveBeenCalledWith({ forceRefresh: false })

    const webview = await tree.findByTestId('mocked-webview')
    expect(webview.props.source).toEqual({ uri: DEVICES_URL, headers: { Authorization: 'Bearer fresh-token' } })
  })

  it('refreshes the token and reloads once when an IAS account page answers 401', async () => {
    const getAccessToken = mockClient(
      jest.fn().mockResolvedValueOnce('fresh-token').mockResolvedValueOnce('refreshed-token')
    )
    const tree = renderScreen(DEVICES_URL)
    await tree.findByTestId('mocked-webview')

    fireEvent(tree.getByTestId('mocked-webview'), 'httpError', {
      nativeEvent: { url: DEVICES_URL, statusCode: 401, description: '' },
    })

    await waitFor(() =>
      expect(tree.getByTestId('mocked-webview').props.source.headers).toEqual({
        Authorization: 'Bearer refreshed-token',
      })
    )
    expect(getAccessToken).toHaveBeenLastCalledWith({ forceRefresh: true })
    expect(tree.queryByText('Alerts.WebViewHttpError.Title')).toBeNull()

    // A second 401 is not retried again
    fireEvent(tree.getByTestId('mocked-webview'), 'httpError', {
      nativeEvent: { url: DEVICES_URL, statusCode: 401, description: '' },
    })

    expect(tree.getByText('Alerts.WebViewHttpError.Title')).toBeTruthy()
    expect(getAccessToken).toHaveBeenCalledTimes(2)
  })

  it('shows the error modal when no access token can be obtained', async () => {
    mockClient(jest.fn().mockRejectedValue(new Error('Refresh token expired')))
    const tree = renderScreen(DEVICES_URL)

    await tree.findByText('Alerts.WebViewHttpError.Title')
    expect(tree.getByText('Alerts.WebViewHttpError.Description')).toBeTruthy()
    expect(tree.queryByTestId('mocked-webview')).toBeNull()
  })

  it('shows the error modal with the correct title and description on a native load failure', () => {
    const tree = renderScreen(PUBLIC_URL)

    fireEvent(tree.getByTestId('mocked-webview'), 'error', {
      nativeEvent: { url: PUBLIC_URL, description: 'net::ERR_NAME_NOT_RESOLVED' },
    })

    expect(tree.getByText('Alerts.WebViewLoadFailed.Title')).toBeTruthy()
    expect(tree.getByText('Alerts.WebViewLoadFailed.Description')).toBeTruthy()
  })

  it('shows the error modal with the correct title and description on an HTTP error', () => {
    const tree = renderScreen(PUBLIC_URL)

    fireEvent(tree.getByTestId('mocked-webview'), 'httpError', {
      nativeEvent: { url: PUBLIC_URL, statusCode: 500, description: 'Internal Server Error' },
    })

    expect(tree.getByText('Alerts.WebViewHttpError.Title')).toBeTruthy()
    expect(tree.getByText('Alerts.WebViewHttpError.Description')).toBeTruthy()
  })

  it('hands tel: and mailto: links to another app instead of loading them', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    const tree = renderScreen(PUBLIC_URL)
    const shouldStartLoad = tree.getByTestId('mocked-webview').props.onShouldStartLoadWithRequest

    expect(shouldStartLoad({ url: 'tel:1-888-356-2741' })).toBe(false)
    expect(shouldStartLoad({ url: 'mailto:bcservicescard@gov.bc.ca' })).toBe(false)
    expect(openURL.mock.calls).toEqual([['tel:1-888-356-2741'], ['mailto:bcservicescard@gov.bc.ca']])

    expect(shouldStartLoad({ url: 'https://id.gov.bc.ca/static/help/contact-us.html' })).toBe(true)
    expect(shouldStartLoad({ url: 'about:blank' })).toBe(true)
    expect(openURL).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 401 on a public page', () => {
    const getAccessToken = mockClient()
    const tree = renderScreen(PUBLIC_URL)

    fireEvent(tree.getByTestId('mocked-webview'), 'httpError', {
      nativeEvent: { url: PUBLIC_URL, statusCode: 401, description: '' },
    })

    expect(tree.getByText('Alerts.WebViewHttpError.Title')).toBeTruthy()
    expect(getAccessToken).not.toHaveBeenCalled()
  })
})
