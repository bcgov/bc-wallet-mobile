/**
 * Core screen-object engine + DSL.
 *
 * - {@link BaseScreen} — low-level selector engine (scroll-retry, per-platform selectors).
 * - {@link defineScreen} — action-based descriptor layer built on top of it.
 * - {@link bcsc} — helper for `com.ariesbifold:id/<key>` test IDs.
 */
export * from './BaseScreen.js'
export * from './defineScreen.js'
export * from './appId.js'
