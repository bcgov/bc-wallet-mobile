/**
 * Settings interaction sweep — walks the BCSC Settings menu in the order the
 * rows render. Tests chain: each test assumes it starts on the Settings screen
 * and ends there, with Sign Out being the documented exception (lands on Home
 * via the AccountSelector after account re-selection).
 *
 * Pre-condition: the user is verified and resting on the Home tab.
 */
import { Timeouts } from '../../../src/constants.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const TabBar = new BaseScreen(BCSC_TestIDs.TabBar)
const Home = new BaseScreen(BCSC_TestIDs.Home)
const Settings = new BaseScreen(BCSC_TestIDs.Settings)
const AccountSelector = new BaseScreen(BCSC_TestIDs.AccountSelector)

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
})
