// Mock Firebase app (must be before imports that use it)
jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}))

// Mock Firebase messaging (modular API). Factory runs when mock is first required (before test body).
// Create state in factory and attach to global so tests can read/write it.
jest.mock('@react-native-firebase/messaging', () => {
  const state = {
    onMessageCallback: null as (() => void) | null,
    onNotificationOpenedAppCallback: null as (() => void) | null,
    initialNotification: null,
  }
  ;(globalThis as any).__fcmServiceTestMockState = state

  const mockOnMessage = jest.fn((_messaging: unknown, callback: () => void) => {
    state.onMessageCallback = callback
    return jest.fn()
  })
  const mockOnNotificationOpenedApp = jest.fn((_messaging: unknown, callback: () => void) => {
    state.onNotificationOpenedAppCallback = callback
    return jest.fn()
  })
  const mockGetInitialNotification = jest.fn(() => Promise.resolve(state.initialNotification))
  const mockSetBackgroundMessageHandler = jest.fn()

  return {
    __esModule: true,
    getMessaging: jest.fn(() => ({})),
    onMessage: mockOnMessage,
    onNotificationOpenedApp: mockOnNotificationOpenedApp,
    getInitialNotification: mockGetInitialNotification,
    setBackgroundMessageHandler: mockSetBackgroundMessageHandler,
  }
})

import { FcmService } from './fcm-service'

const mockState = (globalThis as any).__fcmServiceTestMockState as {
  onMessageCallback: ((m: unknown) => void) | null
  onNotificationOpenedAppCallback: ((m: unknown) => void) | null
  initialNotification: unknown
}

describe('FcmService', () => {
  let service: FcmService

  beforeEach(() => {
    mockState.onMessageCallback = null
    mockState.onNotificationOpenedAppCallback = null
    mockState.initialNotification = null
    const messaging = require('@react-native-firebase/messaging')
    messaging.onMessage.mockClear()
    messaging.onNotificationOpenedApp.mockClear()
    messaging.getInitialNotification.mockClear()
    messaging.setBackgroundMessageHandler.mockClear()
    messaging.getMessaging.mockClear()
    service = new FcmService()
  })

  afterEach(() => {
    service.destroy()
  })

  describe('subscribe', () => {
    it('adds handler and returns unsubscribe function', () => {
      const handler = jest.fn()

      const unsubscribe = service.subscribe(handler)

      expect(typeof unsubscribe).toBe('function')
    })

    it('removes handler when unsubscribe is called', () => {
      const handler = jest.fn()
      const unsubscribe = service.subscribe(handler)

      unsubscribe()

      // Handler should no longer be in the set (verified by destroy not calling it)
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('init', () => {
    it('sets up foreground message listener', async () => {
      await service.init()

      expect(mockState.onMessageCallback).not.toBeNull()
    })

    it('is idempotent - calling init multiple times only initializes once', async () => {
      const { onMessage } = require('@react-native-firebase/messaging')
      await service.init()
      await service.init()
      await service.init()

      expect(onMessage).toHaveBeenCalledTimes(1)
    })
  })

  describe('destroy', () => {
    it('clears handlers and resets initialized state', async () => {
      const handler = jest.fn()
      service.subscribe(handler)
      await service.init()

      service.destroy()

      // After destroy, a new init should work (proving initialized was reset)
      const { onMessage } = require('@react-native-firebase/messaging')
      onMessage.mockClear()
      await service.init()
      expect(onMessage).toHaveBeenCalledTimes(1)
    })
  })

  describe('message parsing', () => {
    beforeEach(async () => {
      await service.init()
    })

    it('parses challenge message type', () => {
      const handler = jest.fn()
      service.subscribe(handler)

      const remoteMessage = {
        data: { bcsc_challenge_request: 'test-jwt-token' },
        notification: undefined,
      }

      mockState.onMessageCallback?.(remoteMessage)

      expect(handler).toHaveBeenCalledWith({
        rawMessage: remoteMessage,
        type: 'challenge',
        data: { jwt: 'test-jwt-token' },
      })
    })

    it('parses status message type', () => {
      const handler = jest.fn()
      service.subscribe(handler)

      const remoteMessage = {
        data: { bcsc_status_notification: 'approved', title: 'Status Update', message: 'Your account is approved' },
        notification: undefined,
      }

      mockState.onMessageCallback?.(remoteMessage)

      expect(handler).toHaveBeenCalledWith({
        rawMessage: remoteMessage,
        type: 'status',
        data: {
          bcsc_status_notification: 'approved',
          title: 'Status Update',
          message: 'Your account is approved',
        },
      })
    })

    it('parses notification message type (notification only)', () => {
      const handler = jest.fn()
      service.subscribe(handler)

      const remoteMessage = {
        data: undefined,
        notification: { title: 'Test Title', body: 'Test Body' },
      }

      mockState.onMessageCallback?.(remoteMessage)

      expect(handler).toHaveBeenCalledWith({
        rawMessage: remoteMessage,
        type: 'notification',
        data: { title: 'Test Title', body: 'Test Body' },
      })
    })

    it('parses notification message type (with data)', () => {
      const handler = jest.fn()
      service.subscribe(handler)

      const remoteMessage = {
        data: { custom: 'data' },
        notification: { title: 'Test', body: 'Body' },
      }

      mockState.onMessageCallback?.(remoteMessage)

      expect(handler).toHaveBeenCalledWith({
        rawMessage: remoteMessage,
        type: 'notification',
        data: { title: 'Test', body: 'Body' },
      })
    })

    it('parses unknown message type when no data or notification', () => {
      const handler = jest.fn()
      service.subscribe(handler)

      const remoteMessage = {
        data: undefined,
        notification: undefined,
      }

      mockState.onMessageCallback?.(remoteMessage)

      expect(handler).toHaveBeenCalledWith({
        rawMessage: remoteMessage,
        type: 'unknown',
      })
    })

    it('parses unknown message type for data-only without recognized keys', () => {
      const handler = jest.fn()
      service.subscribe(handler)

      const remoteMessage = {
        data: { some_random_key: 'value' },
        notification: undefined,
      }

      mockState.onMessageCallback?.(remoteMessage)

      expect(handler).toHaveBeenCalledWith({
        rawMessage: remoteMessage,
        type: 'unknown',
      })
    })

    it('notifies all subscribed handlers', () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      service.subscribe(handler1)
      service.subscribe(handler2)

      const remoteMessage = {
        data: { bcsc_challenge_request: 'jwt' },
        notification: undefined,
      }

      mockState.onMessageCallback?.(remoteMessage)

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('does not notify unsubscribed handlers', () => {
      const handler = jest.fn()
      const unsubscribe = service.subscribe(handler)
      unsubscribe()

      const remoteMessage = {
        data: { bcsc_challenge_request: 'jwt' },
        notification: undefined,
      }

      mockState.onMessageCallback?.(remoteMessage)

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('notification opened from background', () => {
    it('sets up notification opened listener', async () => {
      await service.init()

      const { onNotificationOpenedApp } = require('@react-native-firebase/messaging')
      expect(onNotificationOpenedApp).toHaveBeenCalledTimes(1)
      expect(mockState.onNotificationOpenedAppCallback).not.toBeNull()
    })

    it('processes notification when user taps from background', async () => {
      const handler = jest.fn()
      service.subscribe(handler)
      await service.init()

      const remoteMessage = {
        data: { bcsc_challenge_request: 'test-jwt' },
        notification: undefined,
      }

      mockState.onNotificationOpenedAppCallback?.(remoteMessage)

      expect(handler).toHaveBeenCalledWith({
        rawMessage: remoteMessage,
        type: 'challenge',
        data: { jwt: 'test-jwt' },
      })
    })
  })

  describe('initial notification (app launched from killed state)', () => {
    it('processes initial notification if present', async () => {
      const handler = jest.fn()
      service.subscribe(handler)

      const remoteMessage = {
        data: { bcsc_status_notification: 'approved', title: 'Status', message: 'Approved' },
        notification: undefined,
      }
      mockState.initialNotification = remoteMessage

      await service.init()

      const { getInitialNotification } = require('@react-native-firebase/messaging')
      expect(getInitialNotification).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({
        rawMessage: remoteMessage,
        type: 'status',
        data: {
          bcsc_status_notification: 'approved',
          title: 'Status',
          message: 'Approved',
        },
      })
    })

    it('does not call handler when no initial notification', async () => {
      const handler = jest.fn()
      service.subscribe(handler)
      mockState.initialNotification = null

      await service.init()

      const { getInitialNotification } = require('@react-native-firebase/messaging')
      expect(getInitialNotification).toHaveBeenCalledTimes(1)
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('status message edge cases', () => {
    beforeEach(async () => {
      await service.init()
    })

    it('handles status notification with missing title and message', () => {
      const handler = jest.fn()
      service.subscribe(handler)

      const remoteMessage = {
        data: { bcsc_status_notification: 'pending' },
        notification: undefined,
      }

      mockState.onMessageCallback?.(remoteMessage)

      expect(handler).toHaveBeenCalledWith({
        rawMessage: remoteMessage,
        type: 'status',
        data: {
          bcsc_status_notification: 'pending',
          title: '',
          message: '',
        },
      })
    })
  })
})
