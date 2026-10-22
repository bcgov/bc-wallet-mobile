import { act, renderHook } from '@testing-library/react-native'
import { InterruptionReason } from 'react-native-vision-camera'

import { CAMERA_NOT_READY_TIMEOUT_MS, useCameraNotReadyTimeout } from './useCameraRecovery'

type Props = {
  shouldBeRunning: boolean
  isStarted: boolean
  interruptionReason: InterruptionReason | null
}

describe('useCameraNotReadyTimeout', () => {
  const onTimeout = jest.fn()

  const renderTimeout = (initialProps: Props) =>
    renderHook((props: Props) => useCameraNotReadyTimeout({ ...props, onTimeout }), { initialProps })

  const advance = (ms: number) =>
    act(() => {
      jest.advanceTimersByTime(ms)
    })

  beforeEach(() => {
    jest.useFakeTimers()
    onTimeout.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('reports a camera that has not started within the timeout', () => {
    renderTimeout({ shouldBeRunning: true, isStarted: false, interruptionReason: null })

    advance(CAMERA_NOT_READY_TIMEOUT_MS - 1)
    expect(onTimeout).not.toHaveBeenCalled()

    advance(1)
    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(onTimeout.mock.calls[0][0].message).toBe('Camera did not start within 8 s')
  })

  it('does not report a camera that starts in time', () => {
    const { rerender } = renderTimeout({ shouldBeRunning: true, isStarted: false, interruptionReason: null })

    advance(CAMERA_NOT_READY_TIMEOUT_MS - 1000)
    rerender({ shouldBeRunning: true, isStarted: true, interruptionReason: null })
    advance(CAMERA_NOT_READY_TIMEOUT_MS * 2)

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('reports an interruption that outlasts the timeout, with its reason', () => {
    renderTimeout({
      shouldBeRunning: true,
      isStarted: true,
      interruptionReason: 'video-device-in-use-by-another-client',
    })

    advance(CAMERA_NOT_READY_TIMEOUT_MS)

    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(onTimeout.mock.calls[0][0].message).toBe(
      'Camera interrupted for 8 s (video-device-in-use-by-another-client)'
    )
  })

  it('does not report an interruption that ends in time', () => {
    const { rerender } = renderTimeout({ shouldBeRunning: true, isStarted: true, interruptionReason: 'unknown' })

    advance(CAMERA_NOT_READY_TIMEOUT_MS - 1000)
    rerender({ shouldBeRunning: true, isStarted: true, interruptionReason: null })
    advance(CAMERA_NOT_READY_TIMEOUT_MS * 2)

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('does not time out while the camera is not supposed to run (unfocused, backgrounded)', () => {
    const { rerender } = renderTimeout({ shouldBeRunning: false, isStarted: false, interruptionReason: null })

    advance(CAMERA_NOT_READY_TIMEOUT_MS * 2)
    expect(onTimeout).not.toHaveBeenCalled()

    // The timeout starts over once the camera should run again
    rerender({ shouldBeRunning: true, isStarted: false, interruptionReason: null })
    advance(CAMERA_NOT_READY_TIMEOUT_MS - 1)
    expect(onTimeout).not.toHaveBeenCalled()
    advance(1)
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('reports once per stretch of not being ready', () => {
    const { rerender } = renderTimeout({ shouldBeRunning: true, isStarted: false, interruptionReason: null })

    advance(CAMERA_NOT_READY_TIMEOUT_MS * 3)
    expect(onTimeout).toHaveBeenCalledTimes(1)

    rerender({ shouldBeRunning: true, isStarted: true, interruptionReason: null })
    rerender({ shouldBeRunning: true, isStarted: false, interruptionReason: null })
    advance(CAMERA_NOT_READY_TIMEOUT_MS)
    expect(onTimeout).toHaveBeenCalledTimes(2)
  })

  it('calls the latest onTimeout handler', () => {
    const latest = jest.fn()
    const { rerender } = renderHook(
      ({ handler }: { handler: (error: Error) => void }) =>
        useCameraNotReadyTimeout({
          shouldBeRunning: true,
          isStarted: false,
          interruptionReason: null,
          onTimeout: handler,
        }),
      { initialProps: { handler: onTimeout } }
    )

    rerender({ handler: latest })
    advance(CAMERA_NOT_READY_TIMEOUT_MS)

    expect(onTimeout).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledTimes(1)
  })
})
