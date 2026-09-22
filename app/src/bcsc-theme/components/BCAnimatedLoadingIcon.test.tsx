import { render } from '@testing-library/react-native'
import { Animated } from 'react-native'
import { BCAnimatedLoadingIcon } from './BCAnimatedLoadingIcon'

describe('BCAnimatedLoadingIcon', () => {
  afterEach(() => jest.restoreAllMocks())

  it('does not animate while inactive, stops when hidden, and can start again', () => {
    const start = jest.fn()
    const stop = jest.fn()
    const loop = jest.spyOn(Animated, 'loop').mockReturnValue({ start, stop, reset: jest.fn() })
    const view = render(<BCAnimatedLoadingIcon size={113} active={false} />)
    expect(loop).not.toHaveBeenCalled()
    view.rerender(<BCAnimatedLoadingIcon size={113} active />)
    expect(start).toHaveBeenCalledTimes(1)
    view.rerender(<BCAnimatedLoadingIcon size={113} active={false} />)
    expect(stop).toHaveBeenCalledTimes(1)
    view.rerender(<BCAnimatedLoadingIcon size={113} active />)
    expect(start).toHaveBeenCalledTimes(2)
    view.unmount()
    expect(stop).toHaveBeenCalledTimes(2)
  })

  it('loops a single native timing without blocking interactions and stops on unmount', () => {
    const start = jest.fn()
    const stop = jest.fn()
    const timing = jest.spyOn(Animated, 'timing')
    const loop = jest.spyOn(Animated, 'loop').mockReturnValue({ start, stop, reset: jest.fn() })

    const view = render(<BCAnimatedLoadingIcon size={113} />)

    expect(timing).toHaveBeenCalledTimes(1)
    expect(timing).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        toValue: 1,
        useNativeDriver: true,
        isInteraction: false,
      })
    )
    expect(loop).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledTimes(1)
    view.rerender(<BCAnimatedLoadingIcon size={150} />)
    expect(start).toHaveBeenCalledTimes(1)

    view.unmount()
    expect(stop).toHaveBeenCalledTimes(1)
  })
})
