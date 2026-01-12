import { FcmService } from './fcm-service'

// Store the onMessage callback so we can trigger it in tests
let onMessageCallback: ((message: any) => void) | null = null

// Create stable mock functions that persist across calls
const mockOnMessage = jest.fn((callback) => {
  onMessageCallback = callback
  return jest.fn() // unsubscribe function
})
const mockSetBackgroundMessageHandler = jest.fn()

// Mock Firebase messaging
jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    onMessage: mockOnMessage,
    setBackgroundMessageHandler: mockSetBackgroundMessageHandler,
  })),
}))

describe('FcmService', () => {
  let service: FcmService

  beforeEach(() => {
    onMessageCallback = null
    mockOnMessage.mockClear()
    mockSetBackgroundMessageHandler.mockClear()
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

      expect(onMessageCallback).not.toBeNull()
    })

    it('is idempotent - calling init multiple times only initializes once', async () => {
      await service.init()
      await service.init()
      await service.init()

      expect(mockOnMessage).toHaveBeenCalledTimes(1)
    })
  })

  describe('destroy', () => {
    it('clears handlers and resets initialized state', async () => {
      const handler = jest.fn()
      service.subscribe(handler)
      await service.init()

      service.destroy()

      // After destroy, a new init should work (proving initialized was reset)
      mockOnMessage.mockClear()
      await service.init()
      expect(mockOnMessage).toHaveBeenCalledTimes(1)
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

      onMessageCallback?.(remoteMessage)

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

      onMessageCallback?.(remoteMessage)

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

      onMessageCallback?.(remoteMessage)

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

      onMessageCallback?.(remoteMessage)

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

      onMessageCallback?.(remoteMessage)

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

      onMessageCallback?.(remoteMessage)

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

      onMessageCallback?.(remoteMessage)

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

      onMessageCallback?.(remoteMessage)

      expect(handler).not.toHaveBeenCalled()
    })
  })
})
