import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { TermsOfUseContent } from './TermsOfUseContent'

jest.mock('@/bcsc-theme/api/hooks/useApi')

const mockTermsOfUseResponse = {
  version: '1.0',
  date: '2024-01-01',
  html: '<p>Terms of Use content</p>',
}

describe('TermsOfUseContent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    const useApiMock = jest.mocked(useApi)
    useApiMock.mockReturnValue({
      config: {
        getTermsOfUse: jest.fn().mockResolvedValue(mockTermsOfUseResponse),
        getServerStatus: jest.fn(),
      },
    } as any)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly after loading terms', async () => {
    const tree = render(
      <BasicAppContext>
        <TermsOfUseContent onAccept={jest.fn()} />
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(tree.queryByTestId('mocked-webview')).toBeTruthy()
    })

    expect(tree).toMatchSnapshot()
  })

  it('shows loading indicator while fetching terms', () => {
    const useApiMock = jest.mocked(useApi)
    useApiMock.mockReturnValue({
      config: {
        getTermsOfUse: jest.fn().mockReturnValue(new Promise(() => {})), // never resolves
        getServerStatus: jest.fn(),
      },
    } as any)

    const tree = render(
      <BasicAppContext>
        <TermsOfUseContent onAccept={jest.fn()} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('shows retry button on error', async () => {
    const useApiMock = jest.mocked(useApi)
    useApiMock.mockReturnValue({
      config: {
        getTermsOfUse: jest.fn().mockRejectedValue(new Error('Network error')),
        getServerStatus: jest.fn(),
      },
    } as any)

    const tree = render(
      <BasicAppContext>
        <TermsOfUseContent onAccept={jest.fn()} />
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(tree.getByTestId('com.ariesbifold:id/RetryTermsOfUse')).toBeTruthy()
    })
  })

  it('calls onAccept with the loaded terms when accept is pressed', async () => {
    const onAccept = jest.fn()

    const tree = render(
      <BasicAppContext>
        <TermsOfUseContent onAccept={onAccept} />
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(tree.queryByTestId('mocked-webview')).toBeTruthy()
    })

    // Simulate the webview finishing loading to enable the accept button
    fireEvent(tree.getByTestId('mocked-webview'), 'load')
    fireEvent.press(tree.getByTestId('com.ariesbifold:id/AcceptAndContinue'))

    await waitFor(() => {
      expect(onAccept).toHaveBeenCalledWith(mockTermsOfUseResponse)
    })
  })
})
