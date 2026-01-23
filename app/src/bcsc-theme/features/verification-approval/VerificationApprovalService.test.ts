import { VerificationApprovalService } from './VerificationApprovalService'
import { VerificationApprovalNavigationEvent } from './types'

describe('VerificationApprovalService', () => {
  let logger: { info: jest.Mock; debug: jest.Mock; warn: jest.Mock }

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    }
  })

  describe('handleApproval (direct approval / in-person)', () => {
    it('buffers approval when no navigation listener', () => {
      const service = new VerificationApprovalService(logger as any)

      const result = service.handleApproval()

      expect(result).toBe(false) // Buffered, not emitted
      expect(service.hasPendingApproval).toBe(true)
    })

    it('emits navigation immediately when listener is registered', () => {
      const service = new VerificationApprovalService(logger as any)
      const navEvents: VerificationApprovalNavigationEvent[] = []

      service.onNavigationRequest((event) => navEvents.push(event))

      const result = service.handleApproval()

      expect(result).toBe(true) // Emitted immediately
      expect(navEvents).toHaveLength(1)
      expect(navEvents[0]).toMatchObject({
        screen: expect.stringContaining('VerificationSuccess'),
        eventType: 'direct_approval',
      })
      expect(service.hasPendingApproval).toBe(false)
    })
  })

  describe('handleRequestReviewed (send-video)', () => {
    it('buffers request_reviewed when no navigation listener', () => {
      const service = new VerificationApprovalService(logger as any)

      const result = service.handleRequestReviewed()

      expect(result).toBe(false) // Buffered, not emitted
      expect(service.hasPendingApproval).toBe(true)
    })

    it('emits navigation immediately when listener is registered', () => {
      const service = new VerificationApprovalService(logger as any)
      const navEvents: VerificationApprovalNavigationEvent[] = []

      service.onNavigationRequest((event) => navEvents.push(event))

      const result = service.handleRequestReviewed()

      expect(result).toBe(true) // Emitted immediately
      expect(navEvents).toHaveLength(1)
      expect(navEvents[0]).toMatchObject({
        screen: expect.stringContaining('VerificationSuccess'),
        eventType: 'request_reviewed',
      })
      expect(service.hasPendingApproval).toBe(false)
    })
  })

  describe('processPendingApproval', () => {
    it('processes buffered direct_approval once navigation is ready', () => {
      const service = new VerificationApprovalService(logger as any)
      const navEvents: VerificationApprovalNavigationEvent[] = []

      service.handleApproval()
      expect(service.hasPendingApproval).toBe(true)

      // Now register navigation listener
      service.onNavigationRequest((event) => navEvents.push(event))

      // Process the pending approval
      const result = service.processPendingApproval()

      expect(result).toBe('direct_approval')
      expect(navEvents).toHaveLength(1)
      expect(navEvents[0]).toMatchObject({
        screen: expect.stringContaining('VerificationSuccess'),
        eventType: 'direct_approval',
      })
      expect(service.hasPendingApproval).toBe(false)
    })

    it('processes buffered request_reviewed once navigation is ready', () => {
      const service = new VerificationApprovalService(logger as any)
      const navEvents: VerificationApprovalNavigationEvent[] = []

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
      const service = new VerificationApprovalService(logger as any)

      const result = service.processPendingApproval()

      expect(result).toBeNull()
    })
  })

  it('unsubscribes navigation listener', () => {
    const service = new VerificationApprovalService(logger as any)
    const navEvents: VerificationApprovalNavigationEvent[] = []

    const unsubscribe = service.onNavigationRequest((event) => navEvents.push(event))
    unsubscribe()

    service.handleApproval()

    // Navigation should be buffered since listener was removed
    expect(navEvents).toHaveLength(0)
    expect(service.hasPendingApproval).toBe(true)
  })

  it('emitNavigation can be called directly with event type', () => {
    const service = new VerificationApprovalService(logger as any)
    const navEvents: VerificationApprovalNavigationEvent[] = []

    service.onNavigationRequest((event) => navEvents.push(event))

    service.emitNavigation('direct_approval')

    expect(navEvents).toHaveLength(1)
    expect(navEvents[0]).toMatchObject({
      screen: expect.stringContaining('VerificationSuccess'),
      eventType: 'direct_approval',
    })
  })
})
