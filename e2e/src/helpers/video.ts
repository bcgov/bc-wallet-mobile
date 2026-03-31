import { existsSync, readFileSync } from 'node:fs'

import { injectCameraImage, resolveAssetPath, toBase64Image } from './camera.js'
import { isSauceLabs } from './sauce.js'

/**
 * Inject an image that the device camera will deliver as video frames.
 *
 * Under the hood this calls the same Sauce Labs `sauce:inject-image` endpoint
 * used for still photos. The distinction is semantic: Sauce Labs feeds the
 * injected image into `AVCaptureVideoDataOutput` (iOS) and `camera2` /
 * `cameraX` (Android), so the app's video recorder or liveness detector
 * receives the image as its camera frames.
 *
 * @param imagePathOrName Absolute path, filename in `e2e/assets/`, or base64.
 *
 * @see https://docs.saucelabs.com/mobile-apps/features/camera-image-injection/
 */
export async function injectVideoFrame(imagePathOrName: string): Promise<void> {
  const resolved = resolveAssetPath(imagePathOrName)
  await injectCameraImage(resolved)
}

export interface SustainedInjectionOptions {
  /** Total duration to keep re-injecting, in milliseconds (default 10 000). */
  durationMs?: number
  /** Pause between injections, in milliseconds (default 2 000). */
  intervalMs?: number
  /**
   * Optional callback fired after each injection with the current iteration
   * index. Useful for logging or Sauce annotations.
   */
  onTick?: (iteration: number) => void | Promise<void>
}

/**
 * Repeatedly inject an image into the camera feed over a period of time.
 *
 * Useful for **video recording** and **liveness detection** flows where the
 * app continuously reads from the camera and may need the injected image
 * refreshed to maintain a stable feed.
 *
 * ```ts
 * // Start recording, keep injecting a face image for 8 seconds
 * await TakeVideo.tap('StartRecordingButton')
 * await sustainedFrameInjection('selfie-liveness.png', { durationMs: 8_000 })
 * ```
 *
 * @param imagePathOrName Absolute path, filename in `e2e/assets/`, or base64.
 * @param opts Duration and interval configuration.
 */
export async function sustainedFrameInjection(
  imagePathOrName: string,
  opts: SustainedInjectionOptions = {}
): Promise<void> {
  const { durationMs = 10_000, intervalMs = 2_000, onTick } = opts
  const iterations = Math.max(1, Math.ceil(durationMs / intervalMs))

  const resolved = resolveAssetPath(imagePathOrName)
  const base64 = toBase64Image(resolved)

  for (let i = 0; i < iterations; i++) {
    await injectCameraImage(base64)
    await onTick?.(i)

    if (i < iterations - 1) {
      await driver.pause(intervalMs)
    }
  }
}

/**
 * Push a video file to the device's media storage.
 *
 * This is for flows where the app allows **picking a video from the gallery**
 * instead of recording one live. The file is base64-encoded and transferred
 * via Appium's `pushFile` command.
 *
 * Works on both Sauce Labs RDC and local devices/emulators.
 *
 * @param videoPath Absolute path to the video file on the host machine.
 * @param remoteName Filename to use on the device (default `'test-video.mp4'`).
 * @returns The remote path where the file was written.
 */
export async function pushVideoToDevice(videoPath: string, remoteName = 'test-video.mp4'): Promise<string> {
  if (!existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`)
  }

  const base64 = readFileSync(videoPath, 'base64')

  if (driver.isIOS) {
    if (isSauceLabs()) {
      const remotePath = `@com.apple.Photos:test/${remoteName}`
      await driver.pushFile(remotePath, base64)
      return remotePath
    }
    const remotePath = `/private/var/mobile/Media/DCIM/100APPLE/${remoteName}`
    await driver.pushFile(remotePath, base64)
    return remotePath
  }

  const remotePath = `/sdcard/DCIM/${remoteName}`
  await driver.pushFile(remotePath, base64)

  // Trigger Android's media scanner so the file appears in the gallery
  await driver.execute('mobile: shell', {
    command: `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${remotePath}`,
  })

  return remotePath
}
