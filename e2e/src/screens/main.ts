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
    logInFromComputer: bcsc(main.pairing.logInFromComputer), // verified-only PairingCodeCard
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
    editProfile: bcsc(main.settings.editProfile), // verified-only (nickname pencil in the ProfileCard)
    forgetPairings: bcsc(main.settings.forgetPairings), // verified-only (isVisible spans links → absence assert still works)
    addDevice: bcsc(main.settings.addDevice), // verified-only (transferer QR entry — Main-stack settings only)
  },
  elements: {
    profile: bcsc(main.settings.profile), // verified-only (absence assert unverified)
  },
})

/** App Security (`MainChangeSecurity` → SecurityMethodSelector). `self` is the always-present
 *  `ChoosePINButton`; return via header `back`. */
export const AppSecurityScreen = defineScreen({
  self: bcsc(main.appSecurity.choosePin),
  back: bcsc(common.back),
})

/**
 * Change-PIN form (`isChangingExistingPIN`). `self` is `current` (EnterCurrentPIN) — NOT `submit`,
 * whose testID collides with the Settings ChangePIN row. `understand` is the "I understand" gate.
 * Mismatch / unchecked-box errors have no testID, so a blocked submit is asserted by staying on-screen.
 */
export const ChangePinScreen = defineScreen({
  self: bcsc(main.changePin.current),
  primary: bcsc(main.changePin.submit),
  back: bcsc(common.back),
  inputs: {
    current: bcsc(main.changePin.current),
    newPin: bcsc(main.changePin.newPin),
    confirm: bcsc(main.changePin.confirm),
  },
  links: {
    understand: bcsc(main.changePin.understand),
  },
})

/** AutoLock (`MainAutoLock`). Each time-option row saves immediately on tap (no confirm button);
 *  `self`/`time5` is the default-selected row. */
export const AutoLockScreen = defineScreen({
  self: bcsc(main.autoLock.time5),
  back: bcsc(common.back),
  links: {
    time5: bcsc(main.autoLock.time5),
    time3: bcsc(main.autoLock.time3),
    time1: bcsc(main.autoLock.time1),
  },
})

/** Main privacy screen. `self`/`learnMore` is the Learn More CardButton — assert it, then `back`
 *  (tapping it would navigate onward to a webview). */
export const MainPrivacyPolicyScreen = defineScreen({
  self: bcsc(main.privacyPolicy.learnMore),
  back: bcsc(common.back),
})

/** Contact Us. `self` is the toll-free-number link (its testID is derived from the visible number);
 *  return via `back`. */
export const MainContactUsScreen = defineScreen({
  self: bcsc(main.contactUs.tollFree),
  back: bcsc(common.back),
})

/** Remove-account confirmation (shared DestructiveConfirmationScreen). `primary`
 *  (`ConfirmDestructiveAction`) runs the factory reset; header `back` is the cancel affordance. */
export const RemoveAccountConfirmScreen = defineScreen({
  self: bcsc(main.removeAccount.confirm),
  primary: bcsc(main.removeAccount.confirm),
  back: bcsc(common.back),
})

/** The Main-stack in-app WebView (`MainWebView`, opened by the Settings Help row). No content testID;
 *  pop via the header `back` (mirrors the other stacks' webview descriptors). */
export const MainWebViewScreen = defineScreen({
  self: bcsc(common.back),
  back: bcsc(common.back),
})

/** Edit-nickname form (`EditNickname`, verified-only; reached from the ProfileCard pencil). iOS types
 *  into the pressable wrapper (InputWithValidation). `primary` saves and returns; validation is
 *  length-only, surfacing on `error`. Saving updates the Settings ProfileCard name. */
export const EditNicknameScreen = defineScreen({
  self: { ios: bcsc(main.editNickname.pressable), android: bcsc(main.editNickname.input) },
  primary: bcsc(main.editNickname.save),
  back: bcsc(common.back),
  inputs: {
    nickname: { ios: bcsc(main.editNickname.pressable), android: bcsc(main.editNickname.input) },
  },
  elements: {
    error: bcsc(main.editNickname.error),
  },
})

/** Forget-all-pairings confirmation (`ForgetAllPairings`, verified-only). Its single Critical button is
 *  both the arrival marker and the confirm (`primary`); on confirm a native "Success"/OK alert fires
 *  (dismiss with `acceptSystemAlert`) and the app returns to Settings. Header `back` cancels. */
export const ForgetPairingsScreen = defineScreen({
  self: bcsc(main.forgetPairingsScreen.confirm),
  primary: bcsc(main.forgetPairingsScreen.confirm),
  back: bcsc(common.back),
})

/** Manual pairing-code entry (`ManualPairingCode`, verified-only, reached from Home's LogInFromComputer
 *  card). `self`/input is the code field — there is NO submit button; entering 6 chars AUTO-SUBMITS and
 *  navigates to PairingConfirmation. */
export const ManualPairingScreen = defineScreen({
  self: bcsc(main.pairing.manualCodeInput),
  back: bcsc(common.back),
  inputs: {
    code: bcsc(main.pairing.manualCodeInput),
  },
})

/** Pairing confirmation (`PairingConfirmation`) — the shared success screen for the manual-code and
 *  deep-link logins (no header/back). `self`/`bookmark` (`BookmarkService`) renders in BOTH cases.
 *  `primary` (`Close`) resets to the tabs, but it is NOT rendered on the iOS app-switch (deep-link)
 *  confirmation — there an up-arrow guides the user back to the browser, and sending the app to the
 *  background fires the reset to Home. So use `Close` only for the manual-code flow; background out of
 *  the deep-link one. */
export const PairingConfirmationScreen = defineScreen({
  self: bcsc(main.pairing.bookmark),
  primary: bcsc(main.pairing.confirmationClose),
  links: {
    bookmark: bcsc(main.pairing.bookmark),
  },
})

/** Service-login screen (`ServiceLogin`) — where a login deep link lands. `primary` (Continue) →
 *  PairingConfirmation; `secondary` (Cancel) returns to Home (the reliable exit on a cold-start deep
 *  link, which has no back stack). */
export const ServiceLoginScreen = defineScreen({
  self: bcsc(main.serviceLogin.continue),
  primary: bcsc(main.serviceLogin.continue),
  secondary: bcsc(main.serviceLogin.cancel),
  back: bcsc(common.back),
})

/** Transfer QR information (`TransferAccountQRInformation`, verified-only, reached via Settings →
 *  AddDevice). `self`/`primary` is the GetQRCode button → the QR display. */
export const TransferQRInformationScreen = defineScreen({
  self: bcsc(main.transfer.getQrCode),
  primary: bcsc(main.transfer.getQrCode),
  back: bcsc(common.back),
})

/** Transfer QR display (`TransferAccountQRDisplay`) — shows the QR (no testID) with a `self`/`primary`
 *  regenerate button (`GetNewQRCode`). Header `back` returns to the QR information screen. */
export const TransferQRDisplayScreen = defineScreen({
  self: bcsc(main.transfer.newQrCode),
  primary: bcsc(main.transfer.newQrCode),
  back: bcsc(common.back),
})
