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

  it('notifies pending state listener on construction', () => {
    const service = new VerificationApprovalService(logger as any)
    const pendingStates: boolean[] = []

    service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

    expect(pendingStates).toEqual([false])
  })

  describe('handleApproval (direct approval / in-person)', () => {
    it('buffers approval and notifies pending state when no navigation listener', () => {
      const service = new VerificationApprovalService(logger as any)
      const pendingStates: boolean[] = []

      service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

      const result = service.handleApproval()

      expect(result).toBe(false) // Buffered, not emitted
      expect(service.hasPendingApproval).toBe(true)
      expect(service.pendingApprovalType).toBe('direct_approval')
      expect(pendingStates).toEqual([false, true])
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
    it('buffers request_reviewed and notifies pending state when no navigation listener', () => {
      const service = new VerificationApprovalService(logger as any)
      const pendingStates: boolean[] = []

      service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

      const result = service.handleRequestReviewed()

      expect(result).toBe(false) // Buffered, not emitted
      expect(service.hasPendingApproval).toBe(true)
      expect(service.pendingApprovalType).toBe('request_reviewed')
      expect(pendingStates).toEqual([false, true])
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

  describe('consumePendingApproval', () => {
    it('consumes and clears pending direct_approval', () => {
      const service = new VerificationApprovalService(logger as any)
      const pendingStates: boolean[] = []

      service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

      service.handleApproval()

      const consumed = service.consumePendingApproval()

      expect(consumed).toBe('direct_approval')
      expect(service.hasPendingApproval).toBe(false)
      expect(pendingStates).toEqual([false, true, false])
    })

    it('consumes and clears pending request_reviewed', () => {
      const service = new VerificationApprovalService(logger as any)

      service.handleRequestReviewed()

      const consumed = service.consumePendingApproval()

      expect(consumed).toBe('request_reviewed')
      expect(service.hasPendingApproval).toBe(false)
    })

    it('returns null when consuming with no pending approval', () => {
      const service = new VerificationApprovalService(logger as any)

      expect(service.consumePendingApproval()).toBeNull()
      expect(service.hasPendingApproval).toBe(false)
    })
  })

  describe('processPendingApproval', () => {
    it('processes buffered direct_approval once navigation is ready', () => {
      const service = new VerificationApprovalService(logger as any)
      const navEvents: VerificationApprovalNavigationEvent[] = []
      const pendingStates: boolean[] = []

      service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

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
      expect(pendingStates).toEqual([false, true, false])
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

  it('clears pending state without processing', () => {
    const service = new VerificationApprovalService(logger as any)
    const pendingStates: boolean[] = []

    service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

    service.handleApproval()
    service.clearPendingApproval()

    expect(service.hasPendingApproval).toBe(false)
    expect(pendingStates).toEqual([false, true, false])
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

  it('unsubscribes pending state listener', () => {
    const service = new VerificationApprovalService(logger as any)
    const pendingStates: boolean[] = []

    const unsubscribe = service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))
    unsubscribe()

    service.handleApproval()

    // Should only have initial state, no update after unsubscribe
    expect(pendingStates).toEqual([false])
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
