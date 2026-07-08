import { TESTID_PREFIX } from '../../test-ids/registry.js'

/**
 * Wrap a testID **key** into the concrete selector string the app emits (`com.ariesbifold:id/<key>`).
 * React Native maps a component's `testID` to the iOS accessibility identifier and the Android
 * resource-id, so the **same** string selects the element on both platforms (the {@link BaseScreen}
 * engine only switches selector *syntax*).
 *
 * The prefix is imported from the shared {@link TESTID_PREFIX} registry rather than hardcoded here,
 * so there is exactly one definition of it shared with the app.
 *
 * Pass keys from the shared registry (not string literals):
 *
 * ```ts
 * import { TestIds } from '../testids/registry.js'
 * primary: bcsc(TestIds.onboarding.intro.continue)   // → 'com.ariesbifold:id/Continue'
 * ```
 *
 * For the rare element whose id genuinely differs per platform, pass a `{ ios, android }` pair as the
 * `TestId` instead of calling this helper.
 */
export const bcsc = (key: string): string => `${TESTID_PREFIX}${key}`
