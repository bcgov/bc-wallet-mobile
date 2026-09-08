// organize-imports-ignore — import order defines test run order
/**
 * Migration suite: the upgrade from the v3 BC Services Card app to v4.
 *
 * The same shape as the other two upgrade lanes (previous release → current, 4.0.3 → current):
 * set up on the old build, install the current one over it, prove the data survived. It keeps its
 * own suite because the old build is a different app lineage — its own binaries and testIDs
 * (`src/v3TestIDs.ts`) — and because it runs Android-only in CI.
 *
 * Starts the v3 app, completes onboarding + in-person verification, then upgrades to v4 and
 * verifies the app unlocks with the PIN created in v3.
 *
 * Prerequisites:
 * - V3 app uploaded to Sauce Labs storage (set as initial `appium:app`)
 * - V4 app uploaded to Sauce Labs storage
 * - SiteMinder credentials in `.env.e2e` (SM_USER / SM_PASSWORD — for in-person verification approval)
 *
 * Run with: yarn wdio configs/sauce/wdio.<platform>.sauce.migration.conf.ts --suite migration
 */
import './v3-onboarding.spec.js'
import './v3-to-v4-upgrade.spec.js'
import './v4-unlock.spec.js'
