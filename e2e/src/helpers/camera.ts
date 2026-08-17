import bwipjs from 'bwip-js'
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

/**
 * Whether this session can drive a CARD barcode (code-39 / PDF-417) from an injected image.
 *
 * Sauce-only because injection is, and Android-only because iOS decodes in the OS from metadata Sauce
 * synthesizes for QR alone — no injected image can ever fire a 1D or PDF-417 scan there. QR scanning
 * has no such limit and needs only {@link isSauceLabs}.
 */
export function canInjectCardBarcodes(): boolean {
  return isSauceLabs() && driver.isAndroid
}

/** Options for {@link composeScanTarget}: canvas defaults to a 1080p landscape frame. */
export interface ScanTargetOptions {
  /** Resize the asset to this fraction of canvas width (nearest-neighbor — 2D codes only; 1D assets
   *  are generated at final pixel size and must be composited as-is, so leave this unset for them). */
  widthFraction?: number
  canvasWidth?: number
  canvasHeight?: number
}

/**
 * Center a barcode/QR asset on a white canvas matching the camera-frame aspect and return base64 PNG.
 *
 * Sauce scales the injected image to FILL the landscape sensor frame, center-cropping the overflow —
 * a canvas already at the frame's aspect maps ~1:1, so the code's on-sensor size is predictable and
 * nothing is cropped away. The white surround doubles as an oversized quiet zone.
 *
 * @param source Asset filename under `e2e/assets/`, an absolute path, or a rendered image buffer.
 */
export async function composeScanTarget(source: string | Buffer, options: ScanTargetOptions = {}): Promise<string> {
  const { widthFraction, canvasWidth = 1920, canvasHeight = 1080 } = options
  const input = typeof source === 'string' ? resolveAssetPath(source) : source
  const asset = sharp(input)
  const { width, height } = await asset.metadata()
  if (!width || !height) {
    throw new Error(`composeScanTarget: could not read dimensions of ${typeof source === 'string' ? input : 'buffer'}`)
  }

  const scaled = widthFraction
    ? await asset.resize({ width: Math.round(widthFraction * canvasWidth), kernel: 'nearest' }).toBuffer()
    : await asset.toBuffer()
  const { width: w = width, height: h = height } = widthFraction ? await sharp(scaled).metadata() : { width, height }
  if (w > canvasWidth || h > canvasHeight) {
    throw new Error(`composeScanTarget: asset ${w}x${h} does not fit the ${canvasWidth}x${canvasHeight} canvas`)
  }

  const composed = await sharp({
    create: { width: canvasWidth, height: canvasHeight, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([{ input: scaled, gravity: 'center' }])
    .png()
    .toBuffer()
  return composed.toString('base64')
}

/** Compose a scan target ({@link composeScanTarget}) and inject it — the scanning counterpart to
 *  {@link injectPhoto}. */
export async function injectScanTarget(source: string | Buffer, options: ScanTargetOptions = {}): Promise<void> {
  await injectCameraImage(await composeScanTarget(source, options))
}

/** On-canvas size of a rendered QR — the size proven to decode on both platforms. */
const QR_TARGET_PX = 800
/**
 * On-canvas WIDTH of a rendered 1D code. Deliberately about a third of the frame: the serial screen
 * opens at 2× zoom, so a code much wider than this is center-cropped out of the analysed frame, and a
 * narrower one runs out of module width. ~4px/module here reads as ~8px/module after the zoom.
 */
const CODE39_TARGET_PX = 660

/**
 * Render a barcode at the INTEGER bwip-js scale that lands closest to `targetPx`.
 *
 * Never resized afterwards: a smoothing kernel blurs bar edges, and a merged narrow bar in a
 * checksum-free symbology like code-39 decodes as a SHORTER string with no error. Scaling at render
 * time keeps modules exactly square, and measuring first absorbs the payload-length variation that a
 * fixed scale would leave over- or undersized.
 */
async function renderCode(opts: { bcid: string; text: string; height?: number }, targetPx: number): Promise<Buffer> {
  const render = (scale: number): Promise<Buffer> => bwipjs.toBuffer({ backgroundcolor: 'FFFFFF', scale, ...opts })
  const { width = targetPx } = await sharp(await render(1)).metadata()
  return render(Math.max(1, Math.round(targetPx / width)))
}

/**
 * Render a QR for `text` and inject it — for codes minted at runtime (a live pairing code), which no
 * committed asset can carry.
 *
 * Inject BEFORE opening the scanner: swapping the image into a live camera leaves transition frames
 * where only part of it has landed, which the scanner reads as a malformed code.
 */
export async function injectQrCode(text: string, options: ScanTargetOptions = {}): Promise<void> {
  await injectScanTarget(await renderCode({ bcid: 'qrcode', text }, QR_TARGET_PX), options)
}

/**
 * Render `text` as a code-39 and inject it — the 1D counterpart to {@link injectQrCode}, for driving
 * the card-serial scanner with a value chosen by the test.
 *
 * ANDROID ONLY in effect: iOS decodes in the OS and Sauce synthesizes QR metadata only, so no injected
 * 1D code can ever fire there.
 *
 * UNLIKE {@link injectQrCode}, inject once the scanner is already up: the serial screen navigates on
 * the first frame it cannot resolve to a BC Services Card, so a code waiting in the feed leaves the
 * screen before a test can assert it ever opened.
 */
export async function injectCode39(text: string, options: ScanTargetOptions = {}): Promise<void> {
  await injectScanTarget(await renderCode({ bcid: 'code39', text, height: 12 }, CODE39_TARGET_PX), options)
}
