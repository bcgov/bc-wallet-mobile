import {
  BCSCLoadingContext,
  BCSCLoadingProvider,
  LoadingPresentation,
  LoadingScreen,
} from '@/bcsc-theme/contexts/BCSCLoadingContext'
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
  it('restores the generic loader and its message after startup finishes', () => {
    const TestWrapper = ({ startup }: { startup: boolean }) => (
      <BCSCLoadingProvider>
        <LoadingScreen message="Loading data..." />
        {startup && <LoadingScreen message="Preparing the app..." presentation={LoadingPresentation.Startup} />}
      </BCSCLoadingProvider>
    )

    const view = render(<TestWrapper startup />)
    expect(view.getByTestId(testIdWithKey('StartupLoadingScreenContent'))).toBeTruthy()
    expect(view.getByText('Preparing the app...')).toBeTruthy()
    expect(view.queryByTestId(testIdWithKey('LoadingScreenContent'))).toBeNull()

    view.rerender(<TestWrapper startup={false} />)
    expect(view.queryByTestId(testIdWithKey('StartupLoadingScreenContent'))).toBeNull()
    expect(view.getByTestId(testIdWithKey('LoadingScreenContent'))).toBeTruthy()
    expect(view.getByText('Loading data...')).toBeTruthy()
  })

  it('keeps startup visible when an overlapping generic loader finishes', () => {
    const TestWrapper = ({ generic }: { generic: boolean }) => (
      <BCSCLoadingProvider>
        <LoadingScreen presentation={LoadingPresentation.Startup} />
        {generic && <LoadingScreen message="Loading data..." />}
      </BCSCLoadingProvider>
    )

    const view = render(<TestWrapper generic />)
    view.rerender(<TestWrapper generic={false} />)

    expect(view.getByTestId(testIdWithKey('StartupLoadingScreenContent'))).toBeTruthy()
    expect(view.getByText('BCSC.Loading.AppStartup')).toBeTruthy()
  })

  it('restores an earlier startup loader until its own token is stopped', () => {
    const TestWrapper = ({ first, second }: { first: boolean; second: boolean }) => (
      <BCSCLoadingProvider>
        {first && <LoadingScreen message="First startup" presentation={LoadingPresentation.Startup} />}
        {second && <LoadingScreen message="Second startup" presentation={LoadingPresentation.Startup} />}
      </BCSCLoadingProvider>
    )

    const view = render(<TestWrapper first second />)
    expect(view.getByText('Second startup')).toBeTruthy()

    view.rerender(<TestWrapper first second={false} />)
    expect(view.getByText('First startup')).toBeTruthy()

    view.rerender(<TestWrapper first={false} second={false} />)
    expect(view.queryByTestId(testIdWithKey('StartupLoadingScreenContent'))).toBeNull()
    expect(view.getByTestId(testIdWithKey('BCSCLoadingProviderOverlay'), { includeHiddenElements: true })).toHaveStyle({
      display: 'none',
    })
  })

  it('does not restart its token when the loading context changes', () => {
    const stopLoading = jest.fn()
    const startLoading = jest.fn(() => stopLoading)
    const initialContext = {
      isLoading: false,
      loadingMessage: null,
      startLoading,
      updateLoadingMessage: jest.fn(),
    }
    const view = render(
      <BCSCLoadingContext.Provider value={initialContext}>
        <LoadingScreen message="Preparing the app..." presentation={LoadingPresentation.Startup} />
      </BCSCLoadingContext.Provider>
    )

    view.rerender(
      <BCSCLoadingContext.Provider value={{ ...initialContext, isLoading: true }}>
        <LoadingScreen message="Preparing the app..." presentation={LoadingPresentation.Startup} />
      </BCSCLoadingContext.Provider>
    )

    expect(startLoading).toHaveBeenCalledTimes(1)
    expect(startLoading).toHaveBeenCalledWith('Preparing the app...', LoadingPresentation.Startup, undefined)
    expect(stopLoading).not.toHaveBeenCalled()
    view.unmount()
    expect(stopLoading).toHaveBeenCalledTimes(1)
  })

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
