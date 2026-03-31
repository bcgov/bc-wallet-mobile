const mockMessagingInstance = {
  setBackgroundMessageHandler: jest.fn(),
  onMessage: jest.fn(),
  requestPermission: jest.fn(),
  hasPermission: jest.fn().mockResolvedValue(1), // 1 = authorized
  getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
  onNotificationOpenedApp: jest.fn(),
  getInitialNotification: jest.fn().mockResolvedValue(null),
}

// Modular API (v22+)
const getMessaging = jest.fn(() => mockMessagingInstance)
const getToken = jest.fn(() => Promise.resolve('mock-fcm-token'))
const onMessage = jest.fn(() => jest.fn())
const onNotificationOpenedApp = jest.fn(() => jest.fn())
const getInitialNotification = jest.fn(() => Promise.resolve(null))
const setBackgroundMessageHandler = jest.fn(() => {})
const hasPermission = jest.fn(() => Promise.resolve(1))
const requestPermission = jest.fn(() => Promise.resolve(1))
const isDeviceRegisteredForRemoteMessages = jest.fn(() => true)
const registerDeviceForRemoteMessages = jest.fn(() => Promise.resolve())
const getAPNSToken = jest.fn(() => Promise.resolve(null))

export const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
  EPHEMERAL: 3,
}

export {
  getAPNSToken,
  getInitialNotification,
  getMessaging,
  getToken,
  hasPermission,
  isDeviceRegisteredForRemoteMessages,
  onMessage,
  onNotificationOpenedApp,
  registerDeviceForRemoteMessages,
  requestPermission,
  setBackgroundMessageHandler,
}

// Default export for backward compatibility (namespaced API - deprecated)
const messaging = Object.assign(
  jest.fn(() => mockMessagingInstance),
  {
    AuthorizationStatus,
  }
)

export default messaging
