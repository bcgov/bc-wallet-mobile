/**
 * Re-export shim. The registry itself is app-owned and lives at `app/src/test-ids/registry.ts` —
 * both sides compile against that one file, so a key an e2e descriptor uses cannot be renamed or
 * deleted app-side without failing `tsc` here.
 *
 * This shim exists so the 12 e2e importers keep a package-local path. Import from it, not from the
 * app path directly.
 */
export { TESTID_PREFIX, TestIds } from '../../../app/src/test-ids/registry.js'
