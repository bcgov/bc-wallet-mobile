// Manual mock for @notifee/react-native. Tests that exercise notifee opt in with
// `jest.mock('@notifee/react-native')`, which resolves to this file. It re-uses notifee's official jest
// mock for the default export (createTriggerNotification, cancelTriggerNotifications, createChannel, etc.)
// and re-declares the named enums we consume.
// @ts-expect-error notifee's official jest mock ships no type declarations
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
