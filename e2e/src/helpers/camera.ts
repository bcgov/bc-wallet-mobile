import { readFileSync } from 'node:fs'

import { isSauceLabs } from './sauce.js'

/**
 * Inject a static image into the device camera on SauceLabs RDC.
 * Requires `imageInjection: true` in the SauceLabs capability config
 * and the app must have Image Injection / Instrumentation enabled in Sauce Labs app settings.
 *
 * @param imagePathOrBase64 - Either an absolute file path to a JPG/PNG (max 5 MB)
 *   or a pre-encoded base64 string. File paths are read and base64-encoded automatically.
 */
export async function injectCameraImage(imagePathOrBase64: string): Promise<void> {
  if (!isSauceLabs()) {
    throw new Error(
      'Camera image injection is only supported on SauceLabs RDC. ' +
        'For local testing, use a test-mode flag in the app.'
    )
  }

  const base64Image = imagePathOrBase64.startsWith('/') ? readFileSync(imagePathOrBase64, 'base64') : imagePathOrBase64

  await driver.execute(`sauce:inject-image=${base64Image}`)
}
