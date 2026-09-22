import assert from 'node:assert/strict'
import { TEST_PIN, Timeouts } from '../../../src/constants.js'
import {
  recoverFromFailedDeviceAuth,
  relaunchApp,
  selectAccountLandingIfPresent,
  unlockWithDeviceAuth,
  unlockWithPin,
} from '../../../src/flows/auth.js'
import { reachSecureApp } from '../../../src/flows/onboarding.js'
import { failBiometric, matchBiometric } from '../../../src/helpers/biometrics.js'
import { isDeviceSecurityLane } from '../../../src/helpers/sauce.js'
import { describeCurrentScreen } from '../../../src/helpers/screens.js'
import { AccountLandingScreen, ConfirmDeviceAuthScreen } from '../../../src/screens/auth.js'
import { AppSecurityScreen, HomeScreen, SettingsScreen, SwitchToPinScreen } from '../../../src/screens/main.js'
import { OnboardingSecureAppScreen, VerifyPromptScreen } from '../../../src/screens/onboarding.js'

/**
 * Device-authentication journey — the app's other security method, end to end.
 *
 * Runs ONLY on the device-auth lane: a Sauce RDC session whose device carries a screen lock
 * (`setupDeviceLock`) and biometric interception (`biometricsInterception`). The lock is what makes
 * the app offer the option at all — `KeyguardManager.isDeviceSecure` / `canEvaluatePolicy` — and
 * interception is what answers the app's own prompts (`sauce:biometrics-authenticate`). A mocked
 * answer drives exactly the path a real match does: the app binds no key to the sensor, so success
 * means "read the stored hash and rotate the wallet key" either way.
 *
 * Ordered, state-carrying checkpoints: onboard on device auth → relaunch/unlock through the
 * interstitial → a failed match, then the retry → the interstitial's "do not show me this again" →
 * Settings: switch to a PIN (the Change PIN row appears) → relaunch and unlock with that PIN →
 * switch back to device auth (the row disappears) → a final relaunch unlocks on device auth again.
 * Out of scope: "App reset for security", which the app shows when the OS lock is removed after
 * enrolment — the cloud cannot remove a lock mid-session.
 */

/** The availability gate resolves asynchronously, so the option lands after the screen does. */
const DEVICE_AUTH_OPTION_WAIT_MS = 15_000

async function expectDeviceAuthOption(): Promise<void> {
  const deadline = Date.now() + DEVICE_AUTH_OPTION_WAIT_MS
  do {
    if (await OnboardingSecureAppScreen.isVisible('deviceAuth')) return
  } while (Date.now() < deadline)
  throw new Error(
    `The device-auth option never rendered on the secure-app step — the OS does not call this device secure. On screen: ${await describeCurrentScreen()}`
  )
}

describe('Device-auth journey: onboarding, unlock and the security switch', () => {
  before(function () {
    if (!isDeviceSecurityLane()) {
      return this.skip()
    }
  })

  it('onboards on device authentication and skips to unverified Home', async () => {
    await reachSecureApp()
    await expectDeviceAuthOption()
    await OnboardingSecureAppScreen.link('deviceAuth')
    await matchBiometric() // "Authenticate to secure your app"
    await VerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await VerifyPromptScreen.tap('secondary')
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('relaunches and unlocks through the device-auth interstitial', async () => {
    await unlockWithDeviceAuth({ relaunch: true, interstitial: 'expect' }) // "Unlock your app"
  })

  it('stays locked on a failed match and unlocks on the retry', async () => {
    await relaunchApp()
    await selectAccountLandingIfPresent()
    await AccountLandingScreen.tap('primary')
    await ConfirmDeviceAuthScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await ConfirmDeviceAuthScreen.tap('primary')

    await failBiometric()
    if (await HomeScreen.isPresent(Timeouts.ELEMENT_VISIBLE)) {
      throw new Error('A failed device-auth match unlocked the app')
    }
    await recoverFromFailedDeviceAuth()
  })

  it('hides the interstitial once "do not show me this again" is ticked', async () => {
    await unlockWithDeviceAuth({ relaunch: true, interstitial: 'expect', hideInterstitial: true })
    await unlockWithDeviceAuth({ relaunch: true, interstitial: 'absent' })
  })

  it('switches to a PIN from App Security and the Change PIN row appears', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.equal(await SettingsScreen.isVisible('changePin'), false, 'Change PIN must be absent for a device-auth account')

    await SettingsScreen.link('appSecurity')
    await AppSecurityScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.ok(await AppSecurityScreen.isVisible('deviceAuth'), 'the device-auth card must render on a locked device')
    await AppSecurityScreen.link('pin')

    await SwitchToPinScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SwitchToPinScreen.fill('pin', TEST_PIN)
    await SwitchToPinScreen.fill('confirmPin', TEST_PIN)
    await SwitchToPinScreen.link('understand')
    await SwitchToPinScreen.tapWhenEnabled('primary')

    // Success pops both the form and App Security.
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.waitFor('changePin', Timeouts.SCREEN_TRANSITION)
  })

  it('relaunches and unlocks with the PIN', async () => {
    // AccountLanding → EnterPIN → Home, no interstitial and no prompt: the PIN is the live method.
    await unlockWithPin(TEST_PIN, { relaunch: true })
  })

  it('switches back to device authentication and unlocks with it after a relaunch (terminal)', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.link('appSecurity')
    await AppSecurityScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await AppSecurityScreen.link('deviceAuth')
    await matchBiometric() // "Authenticate to change your security method"

    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.equal(await SettingsScreen.isVisible('changePin'), false, 'Change PIN must disappear once the method is device auth again')
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)

    // The checkbox was ticked earlier, so the interstitial must stay hidden.
    await unlockWithDeviceAuth({ relaunch: true, interstitial: 'absent' })
  })
})
