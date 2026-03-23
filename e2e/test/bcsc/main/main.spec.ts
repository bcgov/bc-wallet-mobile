// organize-imports-ignore — import order defines test run order
/**
 * Main stack E2E flow: runs tab navigation, settings, and account management.
 * Run with: wdio ... --spec test/bcsc/main/main.spec.ts
 */
import './tabs/navigation.spec.js'
import './settings/settings.spec.js'
