import { isSauceLabs } from './sauce.js'

/**
 * Inject a static image into the device camera.
 * On SauceLabs, uses the sauce:options image injection capability.
 * Locally, this requires app-level mocking or platform-specific setup.
 */
export async function injectCameraImage(imageUrl: string): Promise<void> {
  if (isSauceLabs()) {
    await driver.execute(`sauce:inject-image=${imageUrl}`)
  } else {
    // Local camera injection requires platform-specific setup:
    // - iOS: XCUITest camera mock or test-mode flag in the app
    // - Android: Virtual camera via ADB or test-mode flag in the app
    throw new Error('Local camera injection is not yet implemented. Use a test-mode flag in the app or run on SauceLabs.')
  }
}
