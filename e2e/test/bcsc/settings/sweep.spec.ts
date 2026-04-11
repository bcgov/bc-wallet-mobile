/**
 * Settings interaction sweep — walks the BCSC Settings menu in the order the
 * rows render. Tests chain: each test assumes it starts on the Settings screen
 * and ends there, with Sign Out being the documented exception (lands on Home
 * via the AccountSelector after account re-selection).
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

/**
 * Tap any "Continue as" card on the AccountSelector screen. Each card's testID
 * is `com.ariesbifold:id/CardButton-${nickname}` (see
 * `CardButton.tsx` default testID and `AccountSelectorScreen.tsx`); the
 * nickname is fixture-dependent, so we match the prefix.
 */
async function tapAnyAccountCard(): Promise<void> {
  const selector = driver.isIOS
    ? '-ios predicate string:name BEGINSWITH "com.ariesbifold:id/CardButton-"'
    : 'android=new UiSelector().resourceIdMatches("com\\.ariesbifold:id/CardButton-.*")'
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

  it('signs out, re-selects the account, and lands on Home', async () => {
    // Exception to "stay on Settings": logout() dispatches
    // SELECT_ACCOUNT: undefined + DID_AUTHENTICATE: false, routing to the
    // AccountSelector. After tapping the account card, unlockApp() runs and
    // we end up back on Home.
    await Settings.tap('SignOut')
    const continueAs = await AccountSelector.findByText('Continue as:')
    await continueAs.waitForDisplayed({ timeout: Timeouts.screenTransition })
    await tapAnyAccountCard()
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

  it('edits the account nickname and verifies it persists', async () => {
    // 7 lowercase-hex chars — unique per run so the re-open verification
    // can't pass against a stale pre-existing value.
    const NEW_NICKNAME = randomBytes(4).toString('hex').slice(0, 7)

    await Settings.tap('EditNickname')
    await EditNickname.waitFor('SaveAndContinue')

    // Platform-specific input handling — the onboarding Nickname spec
    // uses this same split because the Android TextInput sits inside a
    // pressable wrapper while iOS exposes the TextInput directly.
    if (driver.isAndroid) {
      await EditNickname.tap('AccountNicknameInput')
      await EditNickname.type('AccountNicknameInput', NEW_NICKNAME, {
        tapFirst: true,
        characterByCharacter: false,
      })
    } else {
      await EditNickname.tap('AccountNicknamePressable')
      await EditNickname.type('AccountNicknamePressable', NEW_NICKNAME, { tapFirst: true })
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
    const nicknameText = await EditNickname.findByText(NEW_NICKNAME)
    await nicknameText.waitForDisplayed({ timeout: Timeouts.elementVisible })
    await EditNickname.tap('BackButton')
    await Settings.waitFor('AutoLock')
  })

  it('changes Auto Lock time to 3 minutes and verifies the row updates', async () => {
    await Settings.tap('AutoLock')
    await AutoLock.waitFor('AutoLockTime3')
    await AutoLock.tap('AutoLockTime3')
    await AutoLock.tap('BackButton')
    await Settings.waitFor('AutoLock')
    // SettingsActionCard renders the current auto-lock minutes as its
    // `endAdornmentText` ("3 min") — see SettingsContent.tsx. Match the
    // literal text to confirm the store update propagated to the UI.
    const adornment = await Settings.findByText('3 min')
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
    // button by visible text. Android Material upper-cases it.
    const successHeading = await Forget.findByText('Success')
    await successHeading.waitForDisplayed({ timeout: Timeouts.screenTransition })
    const okLabel = driver.isIOS ? 'Okay' : 'OK'
    const okButton = await Forget.findByText(okLabel)
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
})
