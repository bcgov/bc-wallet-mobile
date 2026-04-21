// organize-imports-ignore — import order defines test run order
/**
 * Migration suite: v3 → v4 upgrade flow.
 *
 * Starts the v3 BC Services Card app, completes onboarding + in-person
 * verification, then upgrades to v4 and verifies the app unlocks with
 * the PIN created in v3.
 *
 * Prerequisites:
 * - V3 app uploaded to Sauce Labs storage (set as initial `appium:app`)
 * - V4 app uploaded to Sauce Labs storage
 * - SiteMinder credentials in `local.env` (for in-person verification approval)
 *
 * Run with: yarn wdio configs/sauce/wdio.<platform>.sauce.migration.conf.ts --suite migration
 */
import './v3-onboarding.spec.js'
import './upgrade.spec.js'
import './v4-unlock.spec.js'
