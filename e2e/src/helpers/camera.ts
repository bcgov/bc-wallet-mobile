import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { isSauceLabs } from './sauce.js'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png']

/**
 * Resolve an image path relative to the `e2e/assets/` directory.
 * Absolute paths are returned as-is; relative names are resolved from `assets/`.
 */
export function resolveAssetPath(pathOrName: string): string {
  if (pathOrName.startsWith('/')) return pathOrName
  return resolve(join(process.cwd(), 'assets', pathOrName))
}

/**
 * Read an image file and return its base64 encoding.
 * If the input does not start with `/` it is assumed to already be a base64 string.
 *
 * Validates:
 * - File exists
 * - File extension is JPG, JPEG, or PNG (Sauce Labs requirement)
 * - File size ≤ 5 MB (Sauce Labs limit)
 */
export function toBase64Image(pathOrBase64: string): string {
  if (!pathOrBase64.startsWith('/')) return pathOrBase64

  if (!existsSync(pathOrBase64)) {
    throw new Error(`Image file not found: ${pathOrBase64}`)
  }

  const ext = pathOrBase64.slice(pathOrBase64.lastIndexOf('.')).toLowerCase()
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported image format "${ext}". Sauce Labs accepts: ${SUPPORTED_EXTENSIONS.join(', ')}`)
  }

  const { size } = statSync(pathOrBase64)
  if (size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image exceeds Sauce Labs 5 MB limit (${(size / 1024 / 1024).toFixed(1)} MB): ${pathOrBase64}`)
  }

  return readFileSync(pathOrBase64, 'base64')
}

/**
 * Inject a static image into the device camera on Sauce Labs RDC.
 *
 * The injected image replaces the live camera feed for both still capture
 * (`AVCapturePhotoOutput` / `ACTION_IMAGE_CAPTURE`) and video frame output
 * (`AVCaptureVideoDataOutput` / `camera2`). This means the same call works
 * for photo capture, QR code scanning, and video recording scenarios.
 *
 * **Prerequisites (Sauce Labs):**
 * - `sauceLabsImageInjectionEnabled: true` in `sauce:options`
 * - App uploaded to Sauce Storage with instrumentation enabled
 *
 * @param imagePathOrBase64 Absolute path to a JPG/PNG (≤ 5 MB), a filename
 *   inside `e2e/assets/`, or a pre-encoded base64 string.
 *
 * @see https://docs.saucelabs.com/mobile-apps/features/camera-image-injection/
 */
export async function injectCameraImage(imagePathOrBase64: string): Promise<void> {
  if (!isSauceLabs()) {
    throw new Error(
      'Camera image injection is only supported on Sauce Labs RDC. ' +
        'For local testing, use a test-mode flag or mock camera in the app.'
    )
  }

  const base64 = toBase64Image(imagePathOrBase64)
  await driver.execute(`sauce:inject-image=${base64}`)
}

/**
 * Inject a QR code image into the device camera.
 *
 * Resolves `imagePathOrName` from `e2e/assets/` when a relative name is given
 * (e.g. `'qr-invite.png'` → `e2e/assets/qr-invite.png`).
 *
 * **Tip:** If the app's QR scanner defines a small target area, add padding
 * (whitespace border) around the QR code image so it fits within the scan
 * region after Sauce Labs scales it to the camera resolution.
 */
export async function injectQRCode(imagePathOrName: string): Promise<void> {
  const resolved = resolveAssetPath(imagePathOrName)
  await injectCameraImage(resolved)
}

/**
 * Inject a photo (ID card, selfie, evidence) into the device camera.
 *
 * Convenience wrapper — resolves from `e2e/assets/` and delegates to
 * {@link injectCameraImage}.
 */
export async function injectPhoto(imagePathOrName: string): Promise<void> {
  const resolved = resolveAssetPath(imagePathOrName)
  await injectCameraImage(resolved)
}
