import { Timeouts } from '../../../src/constants.js'
import { annotate, isSauceLabs } from '../../../src/helpers/sauce.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'
import { migrationContext } from './migration-context.js'

/**
 * Unlock the v4 app after upgrading from v3.
 *
 * After in-place upgrade, v4 should detect the existing keychain/secure-storage
 * data from v3 and present the PIN unlock screen (EnterPIN) rather than the
 * fresh onboarding flow (AccountSetup).
 *
 * This spec enters the same PIN that was created during v3 onboarding and
 * verifies the app lands on the Home screen.
 *
 * NOTE: skipped on Sauce iOS because the upgrade spec it depends on is
 * skipped there (see upgrade.spec.ts for details).
 */

const AccountSelector = new BaseScreen(BCSC_TestIDs.AccountSelector)
const EnterPIN = new BaseScreen(BCSC_TestIDs.EnterPIN)
const Home = new BaseScreen(BCSC_TestIDs.Home)
const TabBar = new BaseScreen(BCSC_TestIDs.TabBar)

describe('V4 Unlock After Migration', () => {
  before(function () {
    if (isSauceLabs() && driver.isIOS) {
      console.log('[migration] Skipping iOS v4 unlock on Sauce — depends on upgrade spec')
      this.skip()
    }
  })

  it('should display account selector screen and select account by nickname', async () => {
    const nickname = migrationContext.user.username

    await annotate('Migration: V4 unlock')
    const nicknameBtn = await AccountSelector.findByTestId(`com.ariesbifold:id/CardButton-${nickname}`)
    await nicknameBtn.tap()
  })

  it('should enter the PIN from v3 and unlock', async () => {
    const { pin } = migrationContext

    await EnterPIN.waitFor('PINInput')
    await EnterPIN.type('PINInput', pin)
  })

  it('should land on the Home screen', async () => {
    await Home.waitFor('SettingsMenuButton', Timeouts.SCREEN_TRANSITION)
    await TabBar.waitFor('Home')
    await annotate('Migration: SUCCESS — v4 unlocked with v3 PIN')
    console.log('[migration] v4 app unlocked successfully with v3 PIN')
  })
})
