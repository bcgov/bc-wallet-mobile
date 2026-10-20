import { TOKENS, useServices } from '@bifold/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { InterruptionReason } from 'react-native-vision-camera'
import { isRecoverableCameraRuntimeError } from '../components/utils/camera'
// Note: uncomment the following line to simulate camera errors
// import { useSimulatedCameraInterruption } from './useCameraEventSimulation'

// A repeat of a recoverable runtime error inside this window means the session failed to restart
export const RECOVERABLE_ERROR_WINDOW_MS = 10_000

// How long a camera that should be running may stay not started or interrupted before it's reported
export const CAMERA_NOT_READY_TIMEOUT_MS = 8_000

/**
 * Tracks whether the camera session is interrupted. Android reports recoverable CameraX errors
 * (camera in use by another app, too many cameras open) this way while CameraX retries; iOS
 * reports AVCaptureSession interruptions (multitasking, system pressure, another client).
 *
 * Pass the callbacks to `<Camera>`, and call `clearInterruption` from `onStarted`: a session that
 * is running again is no longer interrupted, even if no interruption-ended event arrived.
 */
export const useCameraInterruption = (logTag: string) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [interruptionReason, setInterruptionReason] = useState<InterruptionReason | null>(null)

  const onInterruptionStarted = useCallback(
    (reason: InterruptionReason) => {
      logger.warn(`[${logTag}] Camera interrupted`, { reason })
      setInterruptionReason(reason)
    },
    [logTag, logger]
  )

  const onInterruptionEnded = useCallback(() => {
    logger.info(`[${logTag}] Camera interruption ended`)
    setInterruptionReason(null)
  }, [logTag, logger])

  const clearInterruption = useCallback(() => setInterruptionReason(null), [])

  // Note: uncomment the following line to simulate camera errors
  // useSimulatedCameraInterruption(onInterruptionStarted, onInterruptionEnded)

  return {
    isInterrupted: interruptionReason !== null,
    interruptionReason,
    onInterruptionStarted,
    onInterruptionEnded,
    clearInterruption,
  }
}

/**
 * Returns a check for camera `onError` errors that should be waited out rather than failed over:
 * the first recoverable runtime error (see `isRecoverableCameraRuntimeError`), while the session
 * restarts. A repeat inside `RECOVERABLE_ERROR_WINDOW_MS` means the restart failed, so it is not.
 */
export const useRecoverableCameraError = () => {
  const lastRecoverableErrorAtRef = useRef<number | null>(null)

  return useCallback((error: unknown) => {
    if (!isRecoverableCameraRuntimeError(error)) {
      return false
    }

    const now = Date.now()
    const previousAt = lastRecoverableErrorAtRef.current
    lastRecoverableErrorAtRef.current = now

    return previousAt === null || now - previousAt > RECOVERABLE_ERROR_WINDOW_MS
  }, [])
}

interface CameraNotReadyTimeoutOptions {
  /** Whether the camera should be running: screen focused, app in the foreground, device and permissions available */
  shouldBeRunning: boolean
  /** Whether the camera session has started (`onStarted` since the last `onStopped`) */
  isStarted: boolean
  interruptionReason: InterruptionReason | null
  /** Usually the screen's camera `onError` handler, so the user gets the error modal and can report */
  onTimeout: (error: Error) => void
}

/**
 * Reports a camera that should be running but stays unusable (never started, or interrupted) for
 * `CAMERA_NOT_READY_TIMEOUT_MS`. Without this, the user is left with a disabled shutter or the
 * interrupted overlay and no way to report it. Fires once per stretch of not being ready.
 */
export const useCameraNotReadyTimeout = ({
  shouldBeRunning,
  isStarted,
  interruptionReason,
  onTimeout,
}: CameraNotReadyTimeoutOptions) => {
  const onTimeoutRef = useRef(onTimeout)
  const isReady = isStarted && interruptionReason === null

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    if (!shouldBeRunning || isReady) {
      return
    }

    const timer = setTimeout(() => {
      const seconds = CAMERA_NOT_READY_TIMEOUT_MS / 1000
      const message = interruptionReason
        ? `Camera interrupted for ${seconds} s (${interruptionReason})`
        : `Camera did not start within ${seconds} s`
      onTimeoutRef.current(new Error(message))
    }, CAMERA_NOT_READY_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [interruptionReason, isReady, shouldBeRunning])
}
