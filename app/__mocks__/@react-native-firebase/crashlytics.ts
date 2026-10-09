/**
 * Manual mock for @react-native-firebase/crashlytics (modular API).
 * Like RNFB, it installs its JS crash handler on import.
 */
const mockCrashlyticsInstance = {}

export const getCrashlytics = jest.fn(() => mockCrashlyticsInstance)
export const setCrashlyticsCollectionEnabled = jest.fn(() => Promise.resolve(null))
export const deleteUnsentReports = jest.fn(() => Promise.resolve())
export const recordError = jest.fn()
export const log = jest.fn()
export const crash = jest.fn()

// Jest has no ErrorUtils unless the test defines one
if (typeof ErrorUtils !== 'undefined') {
  ErrorUtils.setGlobalHandler(jest.fn())
}
