/**
 * Re-export shim. The registry itself is app-owned and lives at `app/src/test-ids/registry.ts` —
 * both sides compile against that one file, so a key an e2e descriptor uses cannot be renamed or
 * deleted app-side without failing `tsc` here.
 *
 * This shim exists so the 12 e2e importers keep a package-local path. Import from it, not from the
 * app path directly.
 *
 * Default import, NOT `export { TESTID_PREFIX, TestIds } from`: `app/` has no `"type"` field so the
 * registry is CommonJS-scoped, while this package is ESM. A named re-export across that boundary
 * typechecks but throws "does not provide an export named" at spec load — Node cannot see named
 * exports through the transpiled CJS. The default is the whole `module.exports`; destructuring it
 * keeps the literal types intact.
 */
import registry from '../../../app/src/test-ids/registry.js'

export const { TESTID_PREFIX, TestIds } = registry
