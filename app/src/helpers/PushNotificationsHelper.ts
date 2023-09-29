import { Agent, ConnectionRecord } from '@aries-framework/core'
import AsyncStorage from '@react-native-async-storage/async-storage'
import messaging from '@react-native-firebase/messaging'
import { Platform } from 'react-native'
import { Config } from 'react-native-config'
import { request, check, PERMISSIONS, RESULTS, PermissionStatus } from 'react-native-permissions'

const TOKEN_STORAGE_KEY = 'deviceToken'

/**
 * Handler Section
 */

const _backgroundHandler = (): void => {
  return messaging().setBackgroundMessageHandler(async () => {
    // Do nothing with background messages. Defaults to login and home screen flow
  })
}

const _foregroundHandler = (): (() => void) => {
  return messaging().onMessage(async () => {
    // Ignore foreground messages
  })
}

/**
 * Permissions Section
 */

const _requestNotificationPermission = async (agent: Agent): Promise<PermissionStatus> => {
  agent.config.logger.info('Requesting push notification permission...')
  const result = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS)
  agent.config.logger.info(`push notification permission is now [${result}]`)
  return result
}

const _checkNotificationPermission = async (agent: Agent): Promise<PermissionStatus> => {
  agent.config.logger.info('Checking push notification permission...')
  const result = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS)
  agent.config.logger.info(`push notification permission is [${result}]`)
  return result
}

const _requestPermission = async (agent: Agent): Promise<void> => {
  // IOS doesn't need the extra permission logic like android
  if (Platform.OS === 'ios') {
    await messaging().requestPermission()
    return
  }

  const checkPermission = await _checkNotificationPermission(agent)
  if (checkPermission !== RESULTS.GRANTED) {
    const request = await _requestNotificationPermission(agent)
    if (request !== RESULTS.GRANTED) {
      agent.config.logger.warn(`push notification permission was not granted by user`)
    }
  }
}

/**
 * Helper Functions Section
 */

const _getMediatorConnection = async (agent: Agent): Promise<ConnectionRecord | undefined> => {
  const connections = await agent.connections.getAll()
  for (const connection of connections) {
    if (connection.theirLabel === Config.MEDIATOR_LABEL) {
      return connection
    }
  }
  agent.config.logger.warn(`Mediator connection with label [${Config.MEDIATOR_LABEL}] not found`)
  return undefined
}

/**
 * Checks wether the user denied permissions on the info modal
 * @returns {Promise<boolean>}
 */
const isUserDenied = async (): Promise<boolean> => {
  return (await AsyncStorage.getItem('userDeniedPushNotifications')) === 'true'
}

/**
 * Uses the discover didcomm protocol to check with the mediator if it supports the firebase push notification protocol
 * @param agent - The active aries agent
 * @returns {Promise<boolean>}
 */
const isMediatorCapable = async (agent: Agent): Promise<boolean | undefined> => {
  if (!Config.MEDIATOR_LABEL || Config.MEDIATOR_USE_PUSH_NOTIFICATIONS === 'false') {
    return false
  }

  const mediator = await _getMediatorConnection(agent)
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

  // Need to register for push notification capability on iOS
  if (Platform.OS === 'ios' && !messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging().registerDeviceForRemoteMessages()
  }

  if (authorized && (await AsyncStorage.getItem(TOKEN_STORAGE_KEY)) !== null) {
    return true
  }
  return false
}

/**
 * Checks if push notifications are enabled by checking if the stored token matches the expected firebase token
 * @returns {Promise<boolean>}
 */
const isEnabled = async (): Promise<boolean> => {
  return (await messaging().getToken()) === (await AsyncStorage.getItem(TOKEN_STORAGE_KEY))
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

  const mediator = await _getMediatorConnection(agent)
  if (!mediator) {
    return
  }

  agent.config.logger.info(`Trying to send device info to mediator with connection [${mediator.id}]`)
  try {
    await agent.modules.pushNotificationsFcm.setDeviceInfo(mediator.id, {
      deviceToken: token,
    })
    if (blankDeviceToken) {
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, 'blank')
    } else {
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, token)
    }
  } catch (error) {
    agent.config.logger.error('Error sending device token info to mediator agent')
  }
}

/**
 * Attempts to send the device token to the mediator agent, register handlers and requests permissions
 * @param agent - The active aries agent
 * @prarm blankDeviceToken - If true, will setup the device token as blank (disabled)
 * @returns {Promise<void>}
 */
const setup = async (agent: Agent, blankDeviceToken = false): Promise<void> => {
  // FIXME: Currently set the token to blank (disabled) on initialization.
  setDeviceInfo(agent, blankDeviceToken)
  _backgroundHandler()
  _foregroundHandler()
  _requestPermission(agent)
}

export { isEnabled, isRegistered, isMediatorCapable, isUserDenied, setDeviceInfo, setup }
