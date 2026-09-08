import { render } from '@testing-library/react-native'
import { Animated } from 'react-native'
import { BCAnimatedLoadingIcon } from './BCAnimatedLoadingIcon'

describe('BCAnimatedLoadingIcon', () => {
  afterEach(() => jest.restoreAllMocks())

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
        duration: 4000,
        useNativeDriver: true,
        isInteraction: false,
      })
    )
    expect(loop).toHaveBeenCalledWith(timing.mock.results[0].value)
    expect(start).toHaveBeenCalledTimes(1)
    view.rerender(<BCAnimatedLoadingIcon size={150} />)
    expect(start).toHaveBeenCalledTimes(1)

    view.unmount()
    expect(stop).toHaveBeenCalledTimes(1)
  })
})
