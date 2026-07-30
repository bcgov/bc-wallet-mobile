import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import sharp from 'sharp'
import { isSauceLabs } from './sauce.js'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png']

/** White (`#FFFFFF`) — matches app guidance for card-on-background scans. */
const DEFAULT_PAD_IMAGE_BACKGROUND: sharp.Color = { r: 255, g: 255, b: 255, alpha: 1 }

export interface ImagePadding {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

/** A rectangle of the source image to cover with opaque white, normalized 0–1 in both axes. */
export interface ImageMaskRegion {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Add whitespace padding around an image so it aligns with a scanner target
 * area after Sauce Labs scales it to fill the camera frame.
 *
 * Padding values are in **pixels**. The background colour defaults to white
 * (`#FFFFFF`) to match the app's "place card on white background" guidance.
 *
 * @returns base64-encoded PNG of the padded image.
 */
export async function padImage(
  image: string | Buffer,
  padding: ImagePadding,
  background: sharp.Color = DEFAULT_PAD_IMAGE_BACKGROUND
): Promise<string> {
  const buf = await sharp(image)
    .extend({
      top: padding.top ?? 0,
      right: padding.right ?? 0,
      bottom: padding.bottom ?? 0,
      left: padding.left ?? 0,
      background,
    })
    .png()
    .toBuffer()
  return buf.toString('base64')
}

/**
 * Cover regions of an image with opaque white so no barcode on it can decode.
 *
 * Needed because Sauce's Android injection replaces the WHOLE camera pipeline — including the
 * frame stream vision-camera's code scanner (MLKit) reads — so a decodable barcode on an injected
 * evidence image is scanned exactly as if a real card were held to the camera, and the app REACTS
 * to it (e.g. the non-BCSC evidence flow asks the backend about a scanned serial and reroutes into
 * card setup on a match). Masking keeps the picture looking like the document while making it
 * undecodable. iOS injection cannot synthesize code-39/PDF-417 scans at all, so masking there is a
 * harmless no-op in effect.
 */
export async function maskImageRegions(imagePath: string, masks: readonly ImageMaskRegion[]): Promise<Buffer> {
  const image = sharp(imagePath)
  const { width, height } = await image.metadata()
  if (!width || !height) {
    throw new Error(`maskImageRegions: could not read dimensions of ${imagePath}`)
  }
  const overlays: sharp.OverlayOptions[] = masks.map((mask) => ({
    input: {
      create: {
        width: Math.max(1, Math.round(mask.width * width)),
        height: Math.max(1, Math.round(mask.height * height)),
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    },
    left: Math.round(mask.x * width),
    top: Math.round(mask.y * height),
  }))
  return image.composite(overlays).toBuffer()
}

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
 * Inject a photo (ID card, selfie, evidence) into the device camera.
 *
 * Convenience wrapper — resolves from `e2e/assets/`, optionally masks barcode regions
 * ({@link maskImageRegions} — REQUIRED for any image carrying a decodable barcode when a code
 * scanner is live behind the capture screen), pads, and delegates to {@link injectCameraImage}.
 */
export async function injectPhoto(
  imagePathOrName: string,
  padding: ImagePadding,
  masks: readonly ImageMaskRegion[] = []
): Promise<void> {
  const resolved = resolveAssetPath(imagePathOrName)
  const source = masks.length > 0 ? await maskImageRegions(resolved, masks) : resolved
  const padded = await padImage(source, padding)
  await injectCameraImage(padded)
}
