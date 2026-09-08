import { render } from '@testing-library/react-native'
import { Animated } from 'react-native'
import { StartupLoadingScreenContent } from './StartupLoadingScreenContent'

jest.mock('./BCAnimatedLoadingIcon', () => ({ BCAnimatedLoadingIcon: () => null }))

describe('StartupLoadingScreenContent progress', () => {
  afterEach(() => jest.restoreAllMocks())

  it('advances to two-thirds once without looping or restarting on status changes', () => {
    const start = jest.fn()
    const stop = jest.fn()
    const timing = jest.spyOn(Animated, 'timing').mockReturnValue({ start, stop, reset: jest.fn() })
    const loop = jest.spyOn(Animated, 'loop')
    const view = render(<StartupLoadingScreenContent statusMessage="Starting..." />)

    expect(timing).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: (2 / 3) * 100, useNativeDriver: true, isInteraction: false })
    )
    expect(loop).not.toHaveBeenCalled()
    expect(start).toHaveBeenCalledTimes(1)

    view.rerender(<StartupLoadingScreenContent statusMessage="Loading your account..." />)
    expect(timing).toHaveBeenCalledTimes(1)

    view.unmount()
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('advances to supplied stages, including completion', () => {
    const timing = jest
      .spyOn(Animated, 'timing')
      .mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() })
    const view = render(<StartupLoadingScreenContent progress={1 / 3} />)

    expect(timing).toHaveBeenLastCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: (1 / 3) * 100 })
    )

    view.rerender(<StartupLoadingScreenContent progress={2 / 3} />)
    expect(timing).toHaveBeenLastCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: (2 / 3) * 100 })
    )

    view.rerender(<StartupLoadingScreenContent progress={1} />)
    expect(timing).toHaveBeenLastCalledWith(expect.any(Animated.Value), expect.objectContaining({ toValue: 100 }))
  })
})
