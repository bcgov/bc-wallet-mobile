/**
 * BCSC Settings tests — walks the Settings menu in the order the rows render.
 * Tests chain: each test assumes it starts on the Settings screen and ends
 * there, with Sign Out being the documented exception (lands on Home via the
 * AccountSelector after account re-selection).
 *
 * Pre-condition: the user is verified and resting on the Home tab.
 */
import { randomBytes } from 'node:crypto'

import { Timeouts } from '../../../src/constants.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const TabBar = new BaseScreen(BCSC_TestIDs.TabBar)
const Home = new BaseScreen(BCSC_TestIDs.Home)
const Settings = new BaseScreen(BCSC_TestIDs.Settings)
const AccountSelector = new BaseScreen(BCSC_TestIDs.AccountSelector)
const MainAppSecurity = new BaseScreen(BCSC_TestIDs.MainAppSecurity)
const EditNickname = new BaseScreen(BCSC_TestIDs.EditNickname)
const AutoLock = new BaseScreen(BCSC_TestIDs.AutoLock)
const Forget = new BaseScreen(BCSC_TestIDs.ForgetAllPairings)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)

/**
 * Nickname written by the Edit Nickname test and read by the Sign Out test so
 * we can both locate the correct account card on AccountSelector and
 * cross-check that the rename round-tripped through logout.
 */
let newNickname = ''

/**
 * Tap the account card matching the given nickname on the AccountSelector
 * screen. Cards are rendered by `CardButton.tsx` with a default testID of
 * `com.ariesbifold:id/CardButton-${title}`.
 */
async function tapAccountCard(nickname: string): Promise<void> {
  const testId = `com.ariesbifold:id/CardButton-${nickname}`
  const selector = driver.isIOS ? `~${testId}` : `android=new UiSelector().resourceId("${testId}")`
  const card = await $(selector)
  await card.waitForDisplayed({ timeout: Timeouts.elementVisible })
  await card.click()
}

describe('Settings', () => {
  it('opens the Settings menu from the Home tab', async () => {
    await Home.waitFor('SettingsMenuButton')
    await TabBar.tap('SettingsMenuButton')
    await Settings.waitFor('AutoLock')
  })

  it('edits the account nickname and verifies it persists', async () => {
    // 7 lowercase-hex chars — unique per run so later assertions can't
    // pass against a stale pre-existing value. Stored in the module-level
    // `newNickname` so the Sign Out test can cross-check that the rename
    // survives logout and shows up on the AccountSelector.
    newNickname = randomBytes(4).toString('hex').slice(0, 7)

    await Settings.tap('EditNickname')
    await EditNickname.waitFor('SaveAndContinue')

    // Platform-specific input handling — the onboarding Nickname spec
    // uses this same split because the Android TextInput sits inside a
    // pressable wrapper while iOS exposes the TextInput directly.
    if (driver.isAndroid) {
      await EditNickname.tap('AccountNicknameInput')
      await EditNickname.type('AccountNicknameInput', newNickname, {
        tapFirst: true,
        characterByCharacter: false,
      })
    } else {
      await EditNickname.tap('AccountNicknamePressable')
      await EditNickname.type('AccountNicknamePressable', newNickname, { tapFirst: true })
    }
    await EditNickname.dismissKeyboard()

    // Save — EditNicknameScreen calls navigation.goBack() on success, so
    // we land back on Settings without any further interaction.
    await EditNickname.tap('SaveAndContinue')
    await Settings.waitFor('AutoLock')

    // Re-open Edit Nickname and verify the new value is rendered in the
    // input. `findByText` matches the TextInput's text on Android and its
    // value on iOS.
    await Settings.tap('EditNickname')
    const nicknameText = await EditNickname.findByText(newNickname)
    await nicknameText.waitForDisplayed({ timeout: Timeouts.elementVisible })
    await EditNickname.tap('BackButton')
    await Settings.waitFor('AutoLock')
  })

  it('signs out, re-selects the renamed account, and lands on Home', async () => {
    // Exception to "stay on Settings": logout() dispatches
    // SELECT_ACCOUNT: undefined + DID_AUTHENTICATE: false, routing to the
    // AccountSelector. After tapping the account card, unlockApp() runs and
    // we end up back on Home. This test also cross-checks that the nickname
    // rename from the previous test survives logout — the card on
    // AccountSelector must carry the new nickname.
    await Settings.tap('SignOut')
    // Anchor on the AuthStack header's SettingsMenuButton (rendered by
    // `createAuthSettingsHeaderButton`) rather than the localized
    // "Continue as:" heading — testID-based, not text-based, so copy
    // changes can't silently break the test.
    await AccountSelector.waitFor('SettingsMenuButton', Timeouts.screenTransition)
    await tapAccountCard(newNickname)
    await Home.waitFor('SettingsMenuButton')
  })

  it('opens App Security and returns to Settings', async () => {
    // Previous test (Sign Out) ended on Home as its documented exception,
    // so re-open Settings before walking into the App Security row.
    await TabBar.tap('SettingsMenuButton')
    await Settings.waitFor('AutoLock')
    await Settings.tap('AppSecurity')
    await MainAppSecurity.waitFor('LearnMoreButton')
    await MainAppSecurity.tap('BackButton')
    await Settings.waitFor('AutoLock')
  })

  it('changes Auto Lock time to a different option and verifies the row updates', async () => {
    // The row's end-adornment ("5 min" / "3 min" / "1 min") reflects the
    // current `autoLockTime`. Probe to see which one is visible so the
    // test works regardless of what the previous run left behind.
    let current: '5 min' | '3 min' | '1 min' | null = null
    for (const label of ['5 min', '3 min', '1 min'] as const) {
      const el = await Settings.findByText(label)
      if (await el.isDisplayed().catch(() => false)) {
        current = label
        break
      }
    }
    if (!current) {
      throw new Error('Could not determine current Auto Lock value from the Settings row')
    }

    // Cycle to the next option so we always pick something different
    // from the current value: 5 → 3 → 1 → 5.
    const next = {
      '5 min': { tapKey: 'AutoLockTime3' as const, expected: '3 min' },
      '3 min': { tapKey: 'AutoLockTime1' as const, expected: '1 min' },
      '1 min': { tapKey: 'AutoLockTime5' as const, expected: '5 min' },
    }[current]

    await Settings.tap('AutoLock')
    await AutoLock.waitFor(next.tapKey)
    await AutoLock.tap(next.tapKey)
    await AutoLock.tap('BackButton')
    await Settings.waitFor('AutoLock')
    const adornment = await Settings.findByText(next.expected)
    await adornment.waitForDisplayed({ timeout: Timeouts.elementVisible })
  })

  it('forgets all pairings, dismisses the success alert, and returns to Settings', async () => {
    await Settings.tap('ForgetPairings')
    await Forget.waitFor('ForgetAllPairings')
    await Forget.tap('ForgetAllPairings')
    // After the network call, ForgetAllPairingsScreen fires an RN
    // `Alert.alert` titled "Success" via `useAlerts.forgetPairingsAlert`
    // and then `navigation.goBack()`. On Android RN renders Alert.alert
    // as an app-owned AlertDialog widget, not a true system alert, so
    // `driver.acceptAlert()` can't see it — dismiss by tapping the OK
    // button by visible text. `_createBasicAlert` (useAlerts.tsx:62-74)
    // passes `actions: [{ text: t('Global.OK') }]` explicitly, so the
    // button label is the literal "OK" on both platforms.
    const successHeading = await Forget.findByText('Success')
    await successHeading.waitForDisplayed({ timeout: Timeouts.screenTransition })
    const okButton = await Forget.findByText('OK')
    await okButton.click()
    await Settings.waitFor('AutoLock')
  })

  it('toggles Analytics Opt In to the opposite state', async () => {
    // Scroll the Analytics Opt In row into view so its ON/OFF end-adornment
    // is observable before and after the tap.
    await Settings.waitFor('AnalyticsOptIn')

    // SettingsContent.tsx renders `endAdornmentText` as "ON" or "OFF"
    // based on `store.bcsc.analyticsOptIn`. Probe which one is currently
    // visible to determine the starting state.
    const onBefore = await Settings.findByText('ON')
    const isCurrentlyOn = await onBefore.isDisplayed().catch(() => false)

    await Settings.tap('AnalyticsOptIn')

    // Verify the adornment flipped to the opposite value.
    const expectedAfter = isCurrentlyOn ? 'OFF' : 'ON'
    const after = await Settings.findByText(expectedAfter)
    await after.waitForDisplayed({ timeout: Timeouts.elementVisible })
  })

  it('shows the Remove Account confirmation and cancels', async () => {
    await Settings.tap('RemoveAccount')
    // SettingsContent.tsx `onPressRemoveAccount` calls `emitAlert` which
    // routes through `showAlert` → RN `Alert.alert` with the
    // `Alerts.CancelMobileCardSetup` strings: title "Are you sure?",
    // Cancel + destructive "Reset App" buttons. On Android this is an
    // app-owned AlertDialog, not a system alert — match by text.
    const heading = await Settings.findByText('Are you sure?')
    await heading.waitForDisplayed({ timeout: Timeouts.elementVisible })
    // Android Material upper-cases AlertDialog button labels.
    const cancelLabel = driver.isIOS ? 'Cancel' : 'CANCEL'
    const cancelButton = await Settings.findByText(cancelLabel)
    await cancelButton.click()
    await Settings.waitFor('AutoLock')
  })

  it('opens Help in the in-app WebView and returns to Settings', async () => {
    // Scroll to the bottom of Settings first so the Information section
    // rows are within scroll range. `Settings.tap` then auto-scrolls
    // back up to find the Help row.
    await Settings.scrollTo('Analytics')
    await Settings.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
    await Settings.waitFor('AutoLock')
  })
})
