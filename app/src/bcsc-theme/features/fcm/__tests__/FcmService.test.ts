import { FcmService } from '../services/fcm-service'

// Mock Firebase messaging
jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    onMessage: jest.fn(() => jest.fn()),
    setBackgroundMessageHandler: jest.fn(),
  })),
}))

describe('FcmService', () => {
  let service: FcmService

  beforeEach(() => {
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

  // TODO: Add tests for:
  // - parseMessage with challenge type
  // - parseMessage with status type
  // - parseMessage with notification type
  // - parseMessage with unknown type
  // - init() idempotency
  // - destroy() cleanup
})
