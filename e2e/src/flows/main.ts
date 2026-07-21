import { Timeouts } from '../constants.js'
import { HomeScreen } from '../screens/main.js'

/** Main-stack navigation arranges (FND-5). Expanded by MAIN-1/2 as their descriptors land. */

/**
 * Open Settings from the Home tab header. Arrival assertion lands with MAIN-2's settings
 * descriptors — until then callers assert their own target screen.
 */
export async function openSettings(): Promise<void> {
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await HomeScreen.tap('menu')
}

/**
 * Open the QRCore scanner via the floating scan FAB (Home/Wallet tabs; not verification-gated).
 * Expect an OS camera-permission prompt on first use — handle with `helpers/alerts`.
 */
export async function openScanner(): Promise<void> {
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await HomeScreen.link('scanFab')
}
