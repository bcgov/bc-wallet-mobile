// organize-imports-ignore — import order defines test run order
/**
 * Verified BCSC E2E flow: straight-through onboarding (PIN auth, no detours),
 *
 * Run with: yarn wdio ... --suite verified
 */

// Note: `./verified/01-setup.spec.js` must be imported before any other `./verified/*.spec.js` imports to ensure proper test setup.
import './verified/01-setup.spec.js'
