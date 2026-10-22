import { useEffect } from 'react'
import { InterruptionReason } from 'react-native-vision-camera'

/**
 * Dev-only camera event simulation, to see how camera failures look without a failing camera.
 * Its call sites are commented out: follow the "Note: ... to simulate camera errors" comments in
 * `MaskedCamera.tsx` and `useCameraRecovery.ts`, change a value below, and reload Metro. Revert the
 * call sites and keep every value off when committing (a test checks the values); release builds
 * ignore them regardless.
 *
 * The simulation fakes only the events the app sees: the real camera keeps running, so the preview
 * stays live where a real interruption or reset would freeze it. Needs a camera, so use a device or
 * the Android emulator (the iOS simulator has none).
 */
const DEBUG_SIMULATE_CAMERA_EVENTS = {
  // Every camera screen: interrupted 5 s after it mounts, for this many seconds (0 = off). The
  // "Camera paused" overlay shows throughout; 8 s or more also shows the camera error modal.
  interruptionSeconds: 0,
  // MaskedCamera: the camera never reports that it started. The shutter stays disabled, and the
  // camera error modal shows after 8 s.
  neverStarts: false,
  // MaskedCamera: every photo capture fails as if the session weren't running (iOS -11803). The
  // first tap shows the inline notice; the second in a row shows the camera error modal.
  notReadyCapture: false,
  // MaskedCamera: iOS media services resets, 4 s after mount, 1 s apart (0 = off). 1 is waited out
  // silently; 2 shows the camera error modal. On Android even 1 shows it, since Android never gets this.
  mediaServicesResets: 0,
}

export const SIMULATE_CAMERA_EVENTS: Readonly<typeof DEBUG_SIMULATE_CAMERA_EVENTS> = __DEV__
  ? DEBUG_SIMULATE_CAMERA_EVENTS
  : { interruptionSeconds: 0, neverStarts: false, notReadyCapture: false, mediaServicesResets: 0 }

const SIMULATED_INTERRUPTION_DELAY_MS = 5000
const SIMULATED_RESET_DELAY_MS = 4000

/**
 * Simulates an interruption (`interruptionSeconds`) through the given `<Camera>` interruption callbacks.
 */
export const useSimulatedCameraInterruption = (
  onInterruptionStarted: (reason: InterruptionReason) => void,
  onInterruptionEnded: () => void
) => {
  useEffect(() => {
    if (!SIMULATE_CAMERA_EVENTS.interruptionSeconds) {
      return
    }

    const start = setTimeout(
      () => onInterruptionStarted('video-device-in-use-by-another-client'),
      SIMULATED_INTERRUPTION_DELAY_MS
    )
    const end = setTimeout(
      onInterruptionEnded,
      SIMULATED_INTERRUPTION_DELAY_MS + SIMULATE_CAMERA_EVENTS.interruptionSeconds * 1000
    )

    return () => {
      clearTimeout(start)
      clearTimeout(end)
    }
  }, [onInterruptionEnded, onInterruptionStarted])
}

/**
 * Simulates iOS media services resets (`mediaServicesResets`) through the given camera `onError` handler.
 */
export const useSimulatedMediaServicesResets = (onError: (error: Error) => void) => {
  useEffect(() => {
    const timers = Array.from({ length: SIMULATE_CAMERA_EVENTS.mediaServicesResets }, (_, i) =>
      setTimeout(
        () =>
          onError(
            new Error(
              'Error Domain=AVFoundationErrorDomain Code=-11819 "Cannot Complete Action" UserInfo={NSLocalizedDescription=Cannot Complete Action}'
            )
          ),
        SIMULATED_RESET_DELAY_MS + i * 1000
      )
    )

    return () => timers.forEach(clearTimeout)
    // Scheduled once per mount; a changing handler identity must not schedule the resets again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * Throws the iOS "session not running" capture error when `notReadyCapture` is on. Call before capturing.
 */
export const throwIfSimulatingNotReadyCapture = () => {
  if (SIMULATE_CAMERA_EVENTS.notReadyCapture) {
    throw new Error('Error Domain=AVFoundationErrorDomain Code=-11803 "Cannot Record" UserInfo={}')
  }
}
