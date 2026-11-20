import { BCAnimatedLoadingIcon } from '@/bcsc-theme/components/BCAnimatedLoadingIcon'
import { testIdWithKey } from '@bifold/core'
import { act, render, renderHook } from '@testing-library/react-native'
import { useState } from 'react'
import { Animated } from 'react-native'
import { BCSCLoadingProvider, LoadingScreen, useLoadingScreen } from './BCSCLoadingContext'

describe('BCSCLoadingContext', () => {
  afterEach(() => jest.restoreAllMocks())

  it('keeps the idle layout mounted without starting an animation', () => {
    const loop = jest.spyOn(Animated, 'loop')
    const view = render(<BCSCLoadingProvider />)
    expect(view.getByTestId(testIdWithKey('BCSCLoadingProviderChildren'))).toHaveStyle({ display: 'flex' })
    expect(view.queryByTestId(testIdWithKey('LoadingScreenContent'))).toBeNull()
    expect(view.UNSAFE_getByType(BCAnimatedLoadingIcon)).toBeTruthy()
    expect(loop).not.toHaveBeenCalled()
  })

  it('keeps the illustration running across message changes and stops the loop when idle', () => {
    const stop = jest.fn()
    const start = jest.fn()
    jest.spyOn(Animated, 'loop').mockReturnValue({ start, stop, reset: jest.fn() })
    const App = ({ message = 'Preparing', show = true }: { message?: string; show?: boolean }) => (
      <BCSCLoadingProvider>{show && <LoadingScreen message={message} />}</BCSCLoadingProvider>
    )
    const view = render(<App />)
    const illustration = view.UNSAFE_getByType(BCAnimatedLoadingIcon)
    expect(view.getByText('Preparing')).toBeTruthy()
    expect(view.queryByRole('progressbar')).toBeNull()
    expect(start).toHaveBeenCalledTimes(1)

    view.rerender(<App message="Loading account" />)
    expect(view.getByText('Loading account')).toBeTruthy()
    expect(view.UNSAFE_getByType(BCAnimatedLoadingIcon)).toBe(illustration)
    expect(start).toHaveBeenCalledTimes(1)
    expect(stop).not.toHaveBeenCalled()

    view.rerender(<App show={false} />)
    expect(view.queryByTestId(testIdWithKey('LoadingScreenContent'))).toBeNull()
    expect(view.UNSAFE_getByType(BCAnimatedLoadingIcon)).toBe(illustration)
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('keeps overlapping loaders visible and restores the remaining loader when the latest finishes', () => {
    const { result } = renderHook(() => useLoadingScreen(), { wrapper: BCSCLoadingProvider })
    let stopFirst!: () => void
    let stopSecond!: () => void
    act(() => {
      stopFirst = result.current.startLoading('First')
      stopSecond = result.current.startLoading('Second')
    })
    expect(result.current.loadingMessage).toBe('Second')
    act(() => stopSecond())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.loadingMessage).toBe('First')
    act(() => stopSecond())
    expect(result.current.isLoading).toBe(true)
    act(() => stopFirst())
    expect(result.current.isLoading).toBe(false)
    expect(result.current.loadingMessage).toBeNull()
  })

  it('does not replace a supplied message with an unnamed loader', () => {
    const { result } = renderHook(() => useLoadingScreen(), { wrapper: BCSCLoadingProvider })
    let stopSecond!: () => void
    act(() => {
      result.current.startLoading('First')
      stopSecond = result.current.startLoading()
    })
    expect(result.current.loadingMessage).toBe('First')
    act(() => stopSecond())
    expect(result.current.loadingMessage).toBe('First')
  })

  it('retains the other loader when the earlier token is released first', () => {
    const { result } = renderHook(() => useLoadingScreen(), { wrapper: BCSCLoadingProvider })
    let stopFirst!: () => void
    act(() => {
      stopFirst = result.current.startLoading('First')
      result.current.startLoading('Second')
    })
    act(() => stopFirst())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.loadingMessage).toBe('Second')
  })

  it('keeps a shown loader up through the commit its release is batched with, then drops it before paint', () => {
    // After `await handleSuccessfulAuth()` the release and the root route change land in one commit. The
    // route change has to render beneath the overlay, so the root cuts instead of sliding from a hidden screen
    const renders: { phase: string; isLoading: boolean }[] = []
    let startLoading!: (message?: string) => () => void
    let setPhase!: (phase: string) => void
    const Probe = () => {
      const context = useLoadingScreen()
      const [phase, setPhaseState] = useState('auth')
      startLoading = context.startLoading
      setPhase = setPhaseState
      renders.push({ phase, isLoading: context.isLoading })
      return null
    }
    render(
      <BCSCLoadingProvider>
        <Probe />
      </BCSCLoadingProvider>
    )
    let stop!: () => void
    act(() => {
      stop = startLoading()
    })
    expect(renders[renders.length - 1]).toEqual({ phase: 'auth', isLoading: true })

    act(() => {
      stop()
      setPhase('main')
    })

    const mainRenders = renders.filter(({ phase }) => phase === 'main')
    expect(mainRenders[0]).toEqual({ phase: 'main', isLoading: true })
    expect(mainRenders[mainRenders.length - 1]).toEqual({ phase: 'main', isLoading: false })
  })

  it('drops a loader released before it was shown without ever showing it', () => {
    const renders: boolean[] = []
    let startLoading!: (message?: string) => () => void
    const Probe = () => {
      const context = useLoadingScreen()
      startLoading = context.startLoading
      renders.push(context.isLoading)
      return null
    }
    render(
      <BCSCLoadingProvider>
        <Probe />
      </BCSCLoadingProvider>
    )

    act(() => startLoading()())

    expect(renders).not.toContain(true)
  })
})
