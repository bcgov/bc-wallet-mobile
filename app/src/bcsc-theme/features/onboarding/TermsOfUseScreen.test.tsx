import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { TermsOfUseScreen } from './TermsOfUseScreen'

jest.mock('@/bcsc-theme/api/hooks/useApi')

const mockTermsOfUseResponse = {
  version: '1.0',
  date: '2024-01-01',
  html: '<p>Terms of Use content</p>',
}

describe('TermsOfUse', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
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
        <TermsOfUseScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(tree.queryByTestId('mocked-webview', { includeHiddenElements: true })).toBeTruthy()
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
        <TermsOfUseScreen navigation={mockNavigation as never} />
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
        <TermsOfUseScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(tree.getByTestId('com.ariesbifold:id/RetryTermsOfUse')).toBeTruthy()
    })
  })
})
