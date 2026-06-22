// Manual mock for @notifee/react-native (auto-applied for node_modules by Jest).
// Re-uses notifee's official jest mock for the default export (createTriggerNotification,
// cancelTriggerNotifications, createChannel, etc.) and re-declares the named enums we consume.
import notifeeMock from '@notifee/react-native/jest-mock'

export default notifeeMock

export const TriggerType = {
  TIMESTAMP: 0,
  INTERVAL: 1,
}

export const AndroidImportance = {
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
}
