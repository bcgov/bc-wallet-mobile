import { PersistentStorage } from '@bifold/core'
import { Agent, ConnectionRecord, ConnectionType } from '@credo-ts/core'
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging'
import { Platform } from 'react-native'
import { Config } from 'react-native-config'
import { checkNotifications, PermissionStatus, requestNotifications, RESULTS } from 'react-native-permissions'
import { BCLocalStorageKeys } from '../store'

const REQUEST_NOTIFICATIONS_TIMEOUT_MS = 2000

export const enum NotificationPermissionStatus {
  DENIED = 'denied',
  GRANTED = 'granted',
  UNKNOWN = 'unknown',
  BLOCKED = 'blocked',
}

/**
 * Permissions Section
 */

/**
 * Requests device notification permissions
 *
 * TODO (MD): Workaround for a known React Native issue where `requestNotifications` may hang indefinitely
 * on Android if the user previously denied the permission prompt `twice`. Update to standard implementation
 * when using React Native version 0.81.x or later.
 *
 * @see
 * Issue: https://github.com/facebook/react-native/pull/53898
 * Fixed in: https://github.com/reactwg/react-native-releases/issues/1151 V0.81.x
 * Commit: https://github.com/facebook/react-native/commit/447a7a3527e3e38e4c3ceb330d12d77afe7bc0b4
 *
 * @example previously:
 * const { status } = await requestNotifications()
 * return status
 */
const requestNotificationPermission = async (): Promise<PermissionStatus> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(NotificationPermissionStatus.BLOCKED)
    }, REQUEST_NOTIFICATIONS_TIMEOUT_MS)

    requestNotifications()
      .then(({ status }) => {
        resolve(status)
      })
      .finally(() => {
        clearTimeout(timeout)
      })
  })
}

const formatPermissionIos = (permission: FirebaseMessagingTypes.AuthorizationStatus): NotificationPermissionStatus => {
  switch (permission) {
    case messaging.AuthorizationStatus.AUTHORIZED:
      return NotificationPermissionStatus.GRANTED
    case messaging.AuthorizationStatus.DENIED:
      return NotificationPermissionStatus.DENIED
    case messaging.AuthorizationStatus.PROVISIONAL:
      return NotificationPermissionStatus.GRANTED
    default:
      return NotificationPermissionStatus.UNKNOWN
  }
}

const formatPermissionAndroid = (permission: PermissionStatus): NotificationPermissionStatus => {
  switch (permission) {
    case RESULTS.GRANTED:
      return NotificationPermissionStatus.GRANTED
    case RESULTS.DENIED:
      return NotificationPermissionStatus.DENIED
    case RESULTS.BLOCKED: // TODO (MD): Return BLOCKED status when using react-native V0.81.x
      return NotificationPermissionStatus.DENIED
    default:
      return NotificationPermissionStatus.UNKNOWN
  }
}

const requestPermission = async (): Promise<NotificationPermissionStatus> => {
  // IOS doesn't need the extra permission logic like android
  if (Platform.OS === 'ios') {
    const permission = await messaging().requestPermission()
    return formatPermissionIos(permission)
  }

  const { status } = await checkNotifications()

  if (status !== RESULTS.GRANTED) {
    const result = await requestNotificationPermission()

    return formatPermissionAndroid(result)
  }
  return formatPermissionAndroid(status)
}

/**
 * Helper Functions Section
 */

const getMediatorConnection = async (agent: Agent): Promise<ConnectionRecord | undefined> => {
  const connections: ConnectionRecord[] = await agent.connections.getAll()
  const mediators = connections.filter((r) => r.connectionTypes.includes(ConnectionType.Mediator))
  if (mediators.length < 1) {
    agent.config.logger.warn(`Mediator connection not found`)
    return undefined
  }

  // get most recent mediator connection
  const latestMediator = mediators.reduce((acc, cur) => {
    if (!acc.updatedAt) {
      if (!cur.updatedAt) {
        return acc.createdAt > cur.createdAt ? acc : cur
      } else {
        return acc.createdAt > cur.updatedAt ? acc : cur
      }
    }

    if (!cur.updatedAt) {
      return acc.updatedAt > cur.createdAt ? acc : cur
    } else {
      return acc.updatedAt > cur.updatedAt ? acc : cur
    }
  }, mediators[0])

  return latestMediator
}

/**
 * Checks wether the user denied permissions on the info modal
 * @returns {Promise<boolean>}
 */
const isUserDenied = async (): Promise<boolean> => {
  return (await PersistentStorage.fetchValueForKey<boolean>(BCLocalStorageKeys.UserDeniedPushNotifications)) ?? false
}

/**
 * Uses the discover didcomm protocol to check with the mediator if it supports the firebase push notification protocol
 * @param agent - The active aries agent
 * @returns {Promise<boolean>}
 */
const isMediatorCapable = async (agent: Agent): Promise<boolean | undefined> => {
  if (Config.MEDIATOR_USE_PUSH_NOTIFICATIONS !== 'true') {
    return false
  }

  const mediator = await getMediatorConnection(agent)
  if (!mediator) return

  const response = await agent.discovery.queryFeatures({
    awaitDisclosures: true,
    connectionId: mediator.id,
    protocolVersion: 'v1',
    queries: [
      {
        featureType: 'protocol',
        match: 'https://didcomm.org/push-notifications-fcm/1.0',
      },
    ],
  })
  if (response.features && response.features?.length > 0) {
    return true
  }
  return false
}

/**
 * Checks if the device token is already registered by checking the permission was granted and the storage key was used
 * @param token - If defined will use this token instead of fetching with firebase
 * @returns {Promise<boolean>}
 */
const isRegistered = async (): Promise<boolean> => {
  const authorized = (await messaging().hasPermission()) === messaging.AuthorizationStatus.AUTHORIZED
  const tokenValue = await PersistentStorage.fetchValueForKey<string>(BCLocalStorageKeys.DeviceToken)

  // Need to register for push notification capability on iOS
  if (Platform.OS === 'ios' && !messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging().registerDeviceForRemoteMessages()
  }

  if (authorized && tokenValue !== null) {
    return true
  }
  return false
}

/**
 * Checks if push notifications are enabled by checking if the stored token matches the expected firebase token
 * @returns {Promise<boolean>}
 */
const isEnabled = async (): Promise<boolean> => {
  try {
    const deviceTokenValue = await PersistentStorage.fetchValueForKey<string>(BCLocalStorageKeys.DeviceToken)
    const messageTokenValue = await messaging().getToken()

    return messageTokenValue === deviceTokenValue
  } catch (error) {
    return false
  }
}

/**
 * Attempts to send the device token to the mediator agent. If the token is blank this is equivalent to disabling
 * @param agent - The active aries agent
 * @param blankDeviceToken - If true, will send an empty string as the device token to the mediator
 * @returns {Promise<void>}
 */
const setDeviceInfo = async (agent: Agent, blankDeviceToken = false): Promise<void> => {
  let token
  if (blankDeviceToken) {
    token = ''
  } else {
    token = await messaging().getToken()
  }

  const mediator = await getMediatorConnection(agent)
  if (!mediator) {
    return
  }

  agent.config.logger.info(`Trying to send device info to mediator with connection [${mediator.id}]`)
  try {
    await agent.modules.pushNotificationsFcm.setDeviceInfo(mediator.id, {
      deviceToken: token,
      devicePlatform: Platform.OS,
    })
    if (blankDeviceToken) {
      await PersistentStorage.storeValueForKey<string>(BCLocalStorageKeys.DeviceToken, 'blank')
    } else {
      await PersistentStorage.storeValueForKey<string>(BCLocalStorageKeys.DeviceToken, token)
    }
  } catch (error) {
    agent.config.logger.error('Error sending device token info to mediator agent')
  }
}

const status = async (): Promise<NotificationPermissionStatus> => {
  if (Platform.OS === 'ios') {
    const permission = await messaging().hasPermission()
    return formatPermissionIos(permission)
  } else if (Platform.OS === 'android') {
    const { status } = await checkNotifications()
    return formatPermissionAndroid(status)
  }
  return NotificationPermissionStatus.UNKNOWN
}

const setup = async (): Promise<NotificationPermissionStatus> => {
  return requestPermission()
}

const activate = async (agent: Agent): Promise<void> => {
  await setDeviceInfo(agent)
}
const deactivate = async (agent: Agent): Promise<void> => {
  await setDeviceInfo(agent, true)
}

export { activate, deactivate, isEnabled, isMediatorCapable, isRegistered, isUserDenied, setDeviceInfo, setup, status }
