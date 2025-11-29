import { BCSCLoadingContext, BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { testIdWithKey } from '@bifold/core'
import { act, render, renderHook } from '@testing-library/react-native'
import { useContext } from 'react'

describe('BCSCLoadingProvider', () => {
  it('should render children when not loading', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCLoadingProvider>{children}</BCSCLoadingProvider>
    )

    const { getByTestId } = render(<div />, { wrapper })

    expect(getByTestId(testIdWithKey('BCSCLoadingProviderChildren'))).toBeDefined()
  })

  it('should render loading screen when loading', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCLoadingProvider>{children}</BCSCLoadingProvider>
    )

    const HookLoadingBridge = () => {
      const loadingContext = useContext(BCSCLoadingContext)

      if (loadingContext) {
        loadingContext.startLoading('Loading data...')
      }

      return null
    }

    const { queryByTestId, queryByText } = render(<HookLoadingBridge />, { wrapper })

    act(() => {
      const children = queryByTestId(testIdWithKey('BCSCLoadingProviderChildren'))
      expect(children).toBeNull()
      expect(queryByText('Loading data...')).toBeDefined()
    })
  })
})

describe('useLoadingScreen hook', () => {
  it('should not be loading on init', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCLoadingProvider>{children}</BCSCLoadingProvider>
    )

    const { result } = renderHook(() => useContext(BCSCLoadingContext), { wrapper })

    expect(result.current?.isLoading).toBe(false)
  })

  it('should start and stop loading', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCLoadingProvider>{children}</BCSCLoadingProvider>
    )

    const { result } = renderHook(() => useContext(BCSCLoadingContext), { wrapper })

    result.current?.startLoading('Loading data...')
    expect(result.current?.isLoading).toBe(true)

    result.current?.stopLoading()
    expect(result.current?.isLoading).toBe(false)
  })
})
