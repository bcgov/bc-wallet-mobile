import { BCAnimatedLoadingIcon } from '@/bcsc-theme/components/BCAnimatedLoadingIcon'
import { testIdWithKey } from '@bifold/core'
import { act, render, renderHook } from '@testing-library/react-native'
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

  it('uses one layout for loaders with and without progress and stops the loop when idle', () => {
    const stop = jest.fn()
    const start = jest.fn()
    jest.spyOn(Animated, 'loop').mockReturnValue({ start, stop, reset: jest.fn() })
    const App = ({ progress, show = true }: { progress?: number; show?: boolean }) => (
      <BCSCLoadingProvider>
        {show && <LoadingScreen message="Preparing" statusMessage="Starting" progressPercent={progress} />}
      </BCSCLoadingProvider>
    )
    const view = render(<App />)
    const illustration = view.UNSAFE_getByType(BCAnimatedLoadingIcon)
    expect(view.getByText('Preparing')).toBeTruthy()
    expect(view.queryByRole('progressbar')).toBeNull()
    expect(start).toHaveBeenCalledTimes(1)

    view.rerender(<App progress={50} />)
    expect(view.getByRole('progressbar', { name: 'Starting' })).toBeTruthy()
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
      stopSecond = result.current.startLoading('Second', { progressPercent: 50 })
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

  it('does not replace a supplied message with an unnamed loader and supports updating it', () => {
    const { result } = renderHook(() => useLoadingScreen(), { wrapper: BCSCLoadingProvider })
    let stopSecond!: () => void
    act(() => {
      result.current.startLoading('First')
      stopSecond = result.current.startLoading()
    })
    expect(result.current.loadingMessage).toBe('First')
    act(() => result.current.updateLoadingMessage('Updated'))
    expect(result.current.loadingMessage).toBe('Updated')
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

  it('updates status and progress without restarting the illustration or losing the other loader', () => {
    const App = ({ progress }: { progress?: number }) => (
      <BCSCLoadingProvider>
        <LoadingScreen message="Other work" />
        {progress !== undefined && (
          <LoadingScreen message="Submitting" statusMessage={`Stage ${progress}`} progressPercent={progress} />
        )}
      </BCSCLoadingProvider>
    )
    const view = render(<App progress={25} />)
    const illustration = view.UNSAFE_getByType(BCAnimatedLoadingIcon)
    expect(view.getByRole('progressbar', { name: 'Stage 25' })).toBeTruthy()
    view.rerender(<App progress={50} />)
    expect(view.getByRole('progressbar', { name: 'Stage 50' })).toBeTruthy()
    expect(view.UNSAFE_getByType(BCAnimatedLoadingIcon)).toBe(illustration)
    view.rerender(<App />)
    expect(view.getByText('Other work')).toBeTruthy()
    expect(view.queryByRole('progressbar')).toBeNull()
    expect(view.UNSAFE_getByType(BCAnimatedLoadingIcon)).toBe(illustration)
  })
})
