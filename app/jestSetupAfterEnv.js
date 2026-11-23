/**
 * Jest setup file that runs after the test framework is installed.
 * Use this for beforeEach/afterEach hooks and other test lifecycle management.
 */

/* eslint-disable no-undef */

// =============================================================================
// Global Test Cleanup
// =============================================================================

/**
 * Cleanup after each test to prevent:
 * - "Cannot log after tests are done" warnings
 * - Timer-related memory leaks
 */
afterEach(() => {
  // Clear all pending timers to prevent dangling async operations
  jest.clearAllTimers()
})

/**
 * Each test starts from an empty BCSC store (the storage module is mocked in jestSetup.js), as it would with
 * Bifold's store, which every test builds afresh. Before each test, so a file's own beforeEach can seed it.
 * A file whose own mocks stop the store being built (e.g. a device-info mock without getBundleId) doesn't use
 * it, so it's skipped there.
 */
beforeEach(() => {
  let testing
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    testing = require('@/bcsc-theme/storage/testing')
  } catch {
    return
  }
  testing.resetBCSCStore()
})
