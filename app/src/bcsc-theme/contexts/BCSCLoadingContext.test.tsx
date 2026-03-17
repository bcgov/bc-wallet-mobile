import { BCSCLoadingContext, BCSCLoadingProvider, LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { testIdWithKey } from '@bifold/core'
import { act, render, renderHook } from '@testing-library/react-native'
import { useContext } from 'react'

describe('BCSCLoadingContext', () => {
  it('should show children and hide overlay when not loading', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCLoadingProvider>{children}</BCSCLoadingProvider>
    )

    const { getByTestId } = render(<></>, { wrapper })

    expect(getByTestId(testIdWithKey('BCSCLoadingProviderChildren'))).toHaveStyle({ display: 'flex' })
    expect(getByTestId(testIdWithKey('BCSCLoadingProviderOverlay'), { includeHiddenElements: true })).toHaveStyle({
      display: 'none',
    })
  })

  it('should show overlay and hide children when loading', () => {
    const { getByTestId } = render(
      <BCSCLoadingProvider>
        <LoadingScreen />
      </BCSCLoadingProvider>
    )

    expect(getByTestId(testIdWithKey('BCSCLoadingProviderOverlay'))).toHaveStyle({ display: 'flex' })
    expect(getByTestId(testIdWithKey('BCSCLoadingProviderChildren'), { includeHiddenElements: true })).toHaveStyle({
      display: 'none',
    })
  })

  it('should set isLoading to true when startLoading is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCLoadingProvider>{children}</BCSCLoadingProvider>
    )

    const { result } = renderHook(() => useContext(BCSCLoadingContext), { wrapper })

    act(() => {
      result.current?.startLoading('Loading data...')
    })

    expect(result.current?.isLoading).toBe(true)
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

    let stopLoading: (() => void) | undefined
    act(() => {
      stopLoading = result.current?.startLoading('Loading data...')
    })
    expect(result.current?.isLoading).toBe(true)

    act(() => {
      stopLoading?.()
    })
    expect(result.current?.isLoading).toBe(false)
  })

  it('should stay loading until all concurrent loaders have stopped', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCLoadingProvider>{children}</BCSCLoadingProvider>
    )

    const { result } = renderHook(() => useContext(BCSCLoadingContext), { wrapper })

    let stopA: (() => void) | undefined
    let stopB: (() => void) | undefined

    act(() => {
      stopA = result.current?.startLoading()
      stopB = result.current?.startLoading()
    })
    expect(result.current?.isLoading).toBe(true)

    act(() => {
      stopA?.()
    })
    expect(result.current?.isLoading).toBe(true) // B is still active

    act(() => {
      stopB?.()
    })
    expect(result.current?.isLoading).toBe(false)
  })

  it('should update the message as new loaders are started', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCLoadingProvider>{children}</BCSCLoadingProvider>
    )

    const { result } = renderHook(() => useContext(BCSCLoadingContext), { wrapper })

    let stopA: (() => void) | undefined
    let stopB: (() => void) | undefined
    let stopC: (() => void) | undefined

    act(() => {
      stopA = result.current?.startLoading('Message A')
    })
    expect(result.current?.loadingMessage).toBe('Message A')

    act(() => {
      stopB = result.current?.startLoading('Message B')
    })
    expect(result.current?.loadingMessage).toBe('Message B')

    act(() => {
      stopC = result.current?.startLoading('Message C')
    })
    expect(result.current?.loadingMessage).toBe('Message C')

    act(() => {
      stopA?.()
      stopB?.()
      stopC?.()
    })
    expect(result.current?.isLoading).toBe(false)
    expect(result.current?.loadingMessage).toBeNull()
  })

  it('should display the message of the most recently started loader that has one', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCLoadingProvider>{children}</BCSCLoadingProvider>
    )

    const { result } = renderHook(() => useContext(BCSCLoadingContext), { wrapper })

    let stopA: (() => void) | undefined
    let stopB: (() => void) | undefined

    act(() => {
      stopA = result.current?.startLoading('Message A')
    })
    expect(result.current?.isLoading).toBe(true)
    expect(result.current?.loadingMessage).toBe('Message A')

    // Starting a loader without a message should not overwrite "Message A"
    act(() => {
      stopB = result.current?.startLoading()
    })
    expect(result.current?.isLoading).toBe(true)
    expect(result.current?.loadingMessage).toBe('Message A')

    // Stopping B (no message) should leave "Message A" intact
    act(() => {
      stopB?.()
    })
    expect(result.current?.isLoading).toBe(true)
    expect(result.current?.loadingMessage).toBe('Message A')

    act(() => {
      stopA?.()
    })
    expect(result.current?.isLoading).toBe(false)
    expect(result.current?.loadingMessage).toBeNull()
  })
})

describe('LoadingScreen component', () => {
  it('should start loading when mounted', () => {
    let isLoading: boolean | undefined

    const ContextCapture = () => {
      const ctx = useContext(BCSCLoadingContext)
      isLoading = ctx?.isLoading
      return null
    }

    render(
      <BCSCLoadingProvider>
        <ContextCapture />
        <LoadingScreen />
      </BCSCLoadingProvider>
    )

    expect(isLoading).toBe(true)
  })

  it('should stop loading when unmounted', () => {
    let isLoading: boolean | undefined

    const ContextCapture = () => {
      const ctx = useContext(BCSCLoadingContext)
      isLoading = ctx?.isLoading
      return null
    }

    const TestWrapper = ({ showLoading }: { showLoading: boolean }) => (
      <BCSCLoadingProvider>
        <ContextCapture />
        {showLoading && <LoadingScreen />}
      </BCSCLoadingProvider>
    )

    const { rerender } = render(<TestWrapper showLoading={true} />)
    expect(isLoading).toBe(true)

    rerender(<TestWrapper showLoading={false} />)
    expect(isLoading).toBe(false)
  })
})
