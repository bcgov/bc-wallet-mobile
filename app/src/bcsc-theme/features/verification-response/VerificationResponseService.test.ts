import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { VerificationResponseService } from './VerificationResponseService'
import { VerificationResponseNavigationEvent } from './types'

describe('VerificationResponseService', () => {
  let logger: { info: jest.Mock; debug: jest.Mock; warn: jest.Mock }

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    }
  })

  describe('handleRequestReviewed (send-video)', () => {
    it('buffers request_reviewed when no navigation listener', () => {
      const service = new VerificationResponseService(logger as any)

      const result = service.handleRequestReviewed()

      expect(result).toBe(false) // Buffered, not emitted
      expect(service.hasPendingApproval).toBe(true)
    })

    it('emits navigation immediately when listener is registered', () => {
      const service = new VerificationResponseService(logger as any)
      const navEvents: VerificationResponseNavigationEvent[] = []

      service.onNavigationRequest((event) => navEvents.push(event))

      const result = service.handleRequestReviewed()

      expect(result).toBe(true) // Emitted immediately
      expect(navEvents).toHaveLength(1)
      expect(navEvents[0]).toMatchObject({
        screen: BCSCScreens.VerificationSuccess,
        eventType: 'request_reviewed',
      })
      expect(service.hasPendingApproval).toBe(false)
    })
  })

  describe('processPendingApproval', () => {
    it('keeps only the most recent buffered event and emits it once', () => {
      // The buffer is deliberately a single slot, not a queue: a second notification arriving
      // with no listener overwrites the first rather than queueing behind it.
      const service = new VerificationResponseService(logger as any)
      const navEvents: VerificationResponseNavigationEvent[] = []

      service.handleRequestReviewed()
      service.handleRequestReviewed()

      service.onNavigationRequest((event) => navEvents.push(event))

      expect(service.processPendingApproval()).toBe('request_reviewed')
      expect(navEvents).toHaveLength(1)
      expect(service.processPendingApproval()).toBeNull()
      expect(navEvents).toHaveLength(1)
    })

    it('processes buffered request_reviewed once navigation is ready', () => {
      const service = new VerificationResponseService(logger as any)
      const navEvents: VerificationResponseNavigationEvent[] = []

      service.handleRequestReviewed()
      expect(service.hasPendingApproval).toBe(true)

      // Now register navigation listener
      service.onNavigationRequest((event) => navEvents.push(event))

      // Process the pending approval
      const result = service.processPendingApproval()

      expect(result).toBe('request_reviewed')
      expect(navEvents).toHaveLength(1)
      expect(navEvents[0]).toMatchObject({
        eventType: 'request_reviewed',
      })
    })

    it('returns null when processing with no pending approval', () => {
      const service = new VerificationResponseService(logger as any)

      const result = service.processPendingApproval()

      expect(result).toBeNull()
    })
  })

  it('unsubscribes navigation listener', () => {
    const service = new VerificationResponseService(logger as any)
    const navEvents: VerificationResponseNavigationEvent[] = []

    const unsubscribe = service.onNavigationRequest((event) => navEvents.push(event))
    unsubscribe()

    service.handleRequestReviewed()

    // Navigation should be buffered since listener was removed
    expect(navEvents).toHaveLength(0)
    expect(service.hasPendingApproval).toBe(true)
  })

  it('fans out to every registered navigation listener', () => {
    const service = new VerificationResponseService(logger as any)
    const firstEvents: VerificationResponseNavigationEvent[] = []
    const secondEvents: VerificationResponseNavigationEvent[] = []

    service.onNavigationRequest((event) => firstEvents.push(event))
    service.onNavigationRequest((event) => secondEvents.push(event))

    service.handleRequestReviewed()

    expect(firstEvents).toHaveLength(1)
    expect(secondEvents).toHaveLength(1)
    expect(firstEvents[0]).toEqual(secondEvents[0])
  })

  it('emitNavigation can be called directly with event type', () => {
    const service = new VerificationResponseService(logger as any)
    const navEvents: VerificationResponseNavigationEvent[] = []

    service.onNavigationRequest((event) => navEvents.push(event))

    service.emitNavigation('request_reviewed')

    expect(navEvents).toHaveLength(1)
    expect(navEvents[0]).toMatchObject({
      screen: BCSCScreens.VerificationSuccess,
      eventType: 'request_reviewed',
    })
  })
})
