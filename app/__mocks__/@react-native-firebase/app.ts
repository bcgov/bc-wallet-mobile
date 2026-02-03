/**
 * Manual mock for @react-native-firebase/app (modular API).
 * Used by tests that import getApp() for Firebase messaging.
 */
export const getApp = jest.fn(() => ({ name: '[DEFAULT]' }))
