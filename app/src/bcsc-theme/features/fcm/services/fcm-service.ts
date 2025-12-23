import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging'

export type FcmMessagePayload = {
  /** The raw message object from Firebase */
  rawMessage: FirebaseMessagingTypes.RemoteMessage
  /** Message type identifier */
  type: 'challenge' | 'status' | 'notification' | 'unknown'
  /** Challenge JWT if present */
  challengeJwt?: string
  /** Status notification data if present */
  statusData?: Record<string, string>
  /** Notification title */
  title?: string
  /** Notification body */
  body?: string
}

export type FcmMessageHandler = (payload: FcmMessagePayload) => void

/**
 * Lightweight pub-sub wrapper around Firebase Cloud Messaging so screens/view models
 * can react to FCM events without touching platform primitives directly.
 */
export class FcmService {
  private static readonly BCSC_CHALLENGE_REQUEST = 'bcsc_challenge_request'
  private static readonly BCSC_STATUS_NOTIFICATION = 'bcsc_status_notification'

  private readonly handlers = new Set<FcmMessageHandler>()
  private foregroundSubscription?: () => void
  private initialized = false

  public async init(): Promise<void> {
    if (this.initialized) return
    this.initialized = true

    // Handle foreground messages
    this.foregroundSubscription = messaging().onMessage((remoteMessage) => {
      this.emit(remoteMessage)
    })

    // Note: background messages (including potential challenge data) are intentionally
    // not processed here. The OS notification system delivers them to the user and
    // any challenge/status handling is performed only when the app is brought to the
    // foreground and messages are received via the foreground listener above.
    messaging().setBackgroundMessageHandler(async () => {
      // Intentionally left as a no-op: do not process challenge/status data while the
      // app is in the background; rely on the foreground flow for handling.
    })
  }

  public destroy(): void {
    this.foregroundSubscription?.()
    this.foregroundSubscription = undefined
    this.initialized = false
    this.handlers.clear()
  }

  public subscribe(handler: FcmMessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private emit(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
    const payload = this.parseMessage(remoteMessage)
    this.handlers.forEach((handler) => handler(payload))
  }

  private parseMessage(remoteMessage: FirebaseMessagingTypes.RemoteMessage): FcmMessagePayload {
    const data = remoteMessage.data
    const notification = remoteMessage.notification

    const basePayload: FcmMessagePayload = {
      rawMessage: remoteMessage,
      type: 'unknown',
      title: notification?.title,
      body: notification?.body,
    }

    if (!data) {
      if (notification) {
        return { ...basePayload, type: 'notification' }
      }
      return basePayload
    }

    // Check for BCSC challenge request
    if (data[FcmService.BCSC_CHALLENGE_REQUEST]) {
      return {
        ...basePayload,
        type: 'challenge',
        challengeJwt: data[FcmService.BCSC_CHALLENGE_REQUEST] as string,
      }
    }

    // Check for BCSC status notification
    if (data[FcmService.BCSC_STATUS_NOTIFICATION]) {
      return {
        ...basePayload,
        type: 'status',
        statusData: data as Record<string, string>,
      }
    }

    // Generic notification with data
    if (notification) {
      return { ...basePayload, type: 'notification' }
    }

    return basePayload
  }
}
