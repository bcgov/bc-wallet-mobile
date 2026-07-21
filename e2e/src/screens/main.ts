import { TestIds } from '../test-ids/registry.js'
import { bcsc, defineScreen } from './core/index.js'

/**
 * Main stack screen objects — the minimal entry set the arrange flows (FND-5) need.
 * MAIN-1..4 expand this module (Services/Wallet/QRCore/Settings/Contacts descriptors).
 */

const main = TestIds.main

/**
 * The bottom tab bar (visible on every tab). Note the Services tab redirects unverified users to
 * `MainVerifyPrompt` instead of opening Services — that redirect is itself a MAIN-1 checkpoint.
 */
export const TabBar = defineScreen({
  self: bcsc(main.tabBar.home),
  links: {
    home: bcsc(main.tabBar.home),
    services: bcsc(main.tabBar.services),
    wallet: bcsc(main.tabBar.wallet),
  },
})

/**
 * Home tab. `self` is the floating scan FAB: Home's body content is verification-gated, but the
 * FAB renders for verified AND unverified users — making it the reliable arrival marker after
 * `skipToHome()` / `unlockWithPin()`. `menu` opens Settings from the tab header.
 */
export const HomeScreen = defineScreen({
  self: bcsc(main.scan.fab),
  menu: bcsc(main.header.settings),
  links: {
    scanFab: bcsc(main.scan.fab),
  },
})
