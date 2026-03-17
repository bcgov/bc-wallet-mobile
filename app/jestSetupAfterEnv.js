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
