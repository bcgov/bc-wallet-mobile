import { TestIds } from '../test-ids/registry.js'
import { bcsc, defineScreen } from './core/index.js'

/**
 * Main stack screen objects. Services content and the full Settings/Contacts surfaces land later
 * with the verified journeys.
 */

const main = TestIds.main
const { common } = TestIds

/**
 * The bottom tab bar (visible on every tab). Note the Services tab redirects unverified users to
 * `MainVerifyPrompt` instead of opening Services — that redirect is itself a gating checkpoint.
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

/**
 * The no-skip verify prompt (`MainVerifyPrompt`) — where the tab listeners send unverified users
 * who tap Services (TabStack) or PairingCode (QRCoreStack). Continue is its only body testID;
 * the screen is otherwise distinguished by its "Verify your account" title copy. `back` (header)
 * returns to the previously focused tab (the gated tab press was prevented).
 */
export const MainVerifyPromptScreen = defineScreen({
  self: bcsc(main.verifyPrompt.continue),
  primary: bcsc(main.verifyPrompt.continue),
  back: bcsc(common.back),
})

/**
 * Wallet tab — currently modeling the EMPTY credential wallet (the unverified/fresh state).
 * `self` is the BCSC empty-state container; `loading` is the shared agent/credentials gate spinner
 * (the Credo agent boots for any authenticated user, verified or not — allow a generous wait).
 * The verified journeys extend this for the populated state.
 */
export const WalletScreen = defineScreen({
  self: bcsc(main.wallet.empty),
  elements: {
    loading: bcsc(main.wallet.loading),
    empty: bcsc(main.wallet.empty),
    emptyLearnMore: bcsc(main.wallet.emptyLearnMore),
  },
})

/**
 * Services catalogue tab — opens only for VERIFIED users (unverified taps redirect to
 * MainVerifyPrompt, covered in the unverified journey). `self`/`search` is the sticky-header catalogue
 * search field (always present once loaded), so it is the "Services opened, not gated" marker. Deeper
 * service-login coverage is modeled separately.
 */
export const ServicesScreen = defineScreen({
  self: bcsc(main.services.search),
  inputs: {
    search: bcsc(main.services.search),
  },
  elements: {
    loading: bcsc(main.services.loading),
  },
})

/**
 * QRCore — the bottom-tab navigator the scan FAB opens (Scanner / [Display, dev-mode only] /
 * PairingCode). `self` is the Scanner tab button; `torch` only renders once camera permission is
 * granted, making it the scanner-ready marker. `back` (header) pops the whole QRCore screen back
 * to the main tabs. PairingCode is verification-gated → MainVerifyPrompt.
 */
export const QRCoreScreen = defineScreen({
  self: bcsc(main.qrCore.scannerTab),
  back: bcsc(common.back),
  links: {
    scannerTab: bcsc(main.qrCore.scannerTab),
    pairingCodeTab: bcsc(main.qrCore.pairingCodeTab),
  },
  elements: {
    torch: bcsc(main.qrCore.torchToggle),
    displayTab: bcsc(main.qrCore.displayTab),
  },
})

/**
 * Main settings menu (`SettingsContent.tsx`). `self` is the always-present AppSecurity row. The
 * unverified-safe rows are exposed as `links`; the `isVerified`-gated `profile` (→ AccountDetails) and
 * `forgetPairings` render only when VERIFIED, so their absence is the unverified-gating assert.
 */
export const SettingsScreen = defineScreen({
  self: bcsc(main.settings.appSecurity),
  back: bcsc(common.back),
  links: {
    appSecurity: bcsc(main.settings.appSecurity),
    changePin: bcsc(main.settings.changePin),
    autoLock: bcsc(main.settings.autoLock),
    analytics: bcsc(main.settings.analyticsOptIn),
    removeAccount: bcsc(main.settings.removeAccount),
    help: bcsc(main.settings.help),
    contactUs: bcsc(main.settings.contactUs),
    privacy: bcsc(main.settings.privacy),
  },
  elements: {
    profile: bcsc(main.settings.profile), // verified-only
    forgetPairings: bcsc(main.settings.forgetPairings), // verified-only
  },
})
