/**
 * @deprecated The engine moved to `screens/core/BaseScreen.ts` during the v4.1 e2e rework (FND-1).
 *
 * This re-export keeps existing `*.spec.ts` imports (`../../src/screens/BaseScreen.js`) working
 * while specs migrate to the action-based screen-object DSL (`screens/core/defineScreen.ts` +
 * per-stack descriptors under `screens/<stack>/`). New code should import from `screens/core`.
 */
export * from './core/BaseScreen.js'
