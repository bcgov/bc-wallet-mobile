import { getApp } from '@react-native-firebase/app'
import {
  FirebaseMessagingTypes,
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging'
import { AbstractBifoldLogger } from '@bifold/core'

// ============================================================================
// Status Notification Types
// ============================================================================

export type StatusNotification = {
  bcsc_status_notification: string // JSON string of BCSCStatusNotificationClaims
  message: string
  title: string
}

// ============================================================================
// Basic Notification Types
// ============================================================================

export type BasicNotification = {
  title: string
  body: string
}

// ============================================================================
// Challenge Notification Types
// ============================================================================

export type ChallengeNotification = {
  /** The raw JWT string to be decoded */
  jwt: string
}

// Decoded challenge result (returned from decodeLoginChallenge)
export type BCSCChallengeClaims = {
  aud: string
  bcsc_challenge: string
  bcsc_client_name: string
  exp: number
  iat: number
  iss: string
  jti: string
}

export type ChallengeResult = {
  claims: BCSCChallengeClaims
  verified: boolean
}

// ============================================================================
// Discriminated Union for FCM Messages
// ============================================================================

type FcmMessageBase = {
  rawMessage: FirebaseMessagingTypes.RemoteMessage
}

export type FcmChallengeMessage = FcmMessageBase & {
  type: 'challenge'
  data: ChallengeNotification
}

export type FcmStatusMessage = FcmMessageBase & {
  type: 'status'
  data: StatusNotification
}

export type FcmNotificationMessage = FcmMessageBase & {
  type: 'notification'
  data: BasicNotification
}

export type FcmUnknownMessage = FcmMessageBase & {
  type: 'unknown'
}

export type FcmMessage = FcmChallengeMessage | FcmStatusMessage | FcmNotificationMessage | FcmUnknownMessage

export type FcmMessageHandler = (message: FcmMessage, delivery?: FcmDeliveryContext) => void

export type FcmDeliveryContext = { source: 'foreground' } | { source: 'background' }

/**
 * Lightweight pub-sub wrapper around Firebase Cloud Messaging so screens/view models
 * can react to FCM events without touching platform primitives directly.
 */
export class FcmService {
  private static readonly BCSC_CHALLENGE_REQUEST = 'bcsc_challenge_request'
  private static readonly BCSC_STATUS_NOTIFICATION = 'bcsc_status_notification'

  private readonly handlers = new Set<FcmMessageHandler>()
  private readonly logger?: AbstractBifoldLogger
  private foregroundSubscription?: () => void
  private notificationOpenedSubscription?: () => void
  private initialized = false
  private suppressed = false

  constructor(logger?: AbstractBifoldLogger) {
    this.logger = logger
  }

  public async init(): Promise<void> {
    if (this.initialized) {
      return
    }
    this.initialized = true

    const app = getApp()
    const messagingInstance = getMessaging(app)

    // Handle foreground messages
    this.foregroundSubscription = onMessage(messagingInstance, (remoteMessage) => {
      this.emit(remoteMessage, { source: 'foreground' })
    })

    // Handle when user taps notification while app is in background
    this.notificationOpenedSubscription = onNotificationOpenedApp(messagingInstance, (remoteMessage) => {
      this.emit(remoteMessage)
    })

    // Handle when app was killed and user taps notification to launch it
    const initialNotification = await getInitialNotification(messagingInstance)
    if (initialNotification) {
      this.emit(initialNotification)
    }

    // Note: background messages (including potential challenge data) are intentionally
    // not processed here. The OS notification system delivers them to the user and
    // any challenge/status handling is performed only when the app is brought to the
    // foreground and messages are received via the foreground listener above.
    setBackgroundMessageHandler(messagingInstance, async () => {
      // Intentionally left as a no-op: do not process challenge/status data while the
      // app is in the background; rely on the foreground flow for handling.
    })
  }

  public destroy(): void {
    this.foregroundSubscription?.()
    this.foregroundSubscription = undefined
    this.notificationOpenedSubscription?.()
    this.notificationOpenedSubscription = undefined
    this.initialized = false
    this.handlers.clear()
  }

  public setSuppressed(value: boolean): void {
    this.suppressed = value
  }

  public subscribe(handler: FcmMessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private emit(remoteMessage: FirebaseMessagingTypes.RemoteMessage, delivery?: FcmDeliveryContext): void {
    if (this.suppressed) {
      this.logger?.info('[FcmService] notification suppressed, skipping')
      return
    }
    this.logger?.info(`[FcmService] raw push notification: ${JSON.stringify(remoteMessage, null, 2)}`)
    const message = this.parseMessage(remoteMessage)
    this.handlers.forEach((handler) => handler(message, delivery))
  }

  private parseMessage(remoteMessage: FirebaseMessagingTypes.RemoteMessage): FcmMessage {
    const data = remoteMessage.data
    const notification = remoteMessage.notification

    // Check for BCSC challenge request
    if (data?.[FcmService.BCSC_CHALLENGE_REQUEST]) {
      return {
        rawMessage: remoteMessage,
        type: 'challenge',
        data: {
          jwt: data[FcmService.BCSC_CHALLENGE_REQUEST] as string,
        },
      }
    }

    // Check for BCSC status notification
    if (data?.[FcmService.BCSC_STATUS_NOTIFICATION]) {
      return {
        rawMessage: remoteMessage,
        type: 'status',
        data: {
          bcsc_status_notification: data[FcmService.BCSC_STATUS_NOTIFICATION] as string,
          message: (data.message as string) || '',
          title: (data.title as string) || '',
        },
      }
    }

    // Generic notification (from Firebase console or similar)
    if (notification?.title && notification?.body) {
      return {
        rawMessage: remoteMessage,
        type: 'notification',
        data: {
          title: notification.title,
          body: notification.body,
        },
      }
    }

    // Unknown message type
    return {
      rawMessage: remoteMessage,
      type: 'unknown',
    }
  }
}
