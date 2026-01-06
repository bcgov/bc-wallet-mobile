import { PairingService } from '../PairingService'
import { PairingNavigationEvent, PairingPayload } from '../types'

describe('PairingService', () => {
  let logger: { info: jest.Mock; debug: jest.Mock }

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
    }
  })

  it('notifies pending state listener on construction', () => {
    const service = new PairingService(logger as any)
    const pendingStates: boolean[] = []

    service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

    expect(pendingStates).toEqual([false])
  })

  it('buffers pairing request and notifies pending state when no navigation listener', () => {
    const service = new PairingService(logger as any)
    const pendingStates: boolean[] = []

    service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

    const request: PairingPayload = {
      serviceTitle: 'Test Service',
      pairingCode: 'CODE123',
      source: 'deep-link',
    }

    service.handlePairing(request)

    expect(service.hasPendingPairing).toBe(true)
    expect(pendingStates).toEqual([false, true])
  })

  it('emits navigation immediately when listener is registered', () => {
    const service = new PairingService(logger as any)
    const navEvents: PairingNavigationEvent[] = []

    service.onNavigationRequest((event) => navEvents.push(event))

    const request: PairingPayload = {
      serviceTitle: 'Test Service',
      pairingCode: 'CODE123',
      source: 'fcm',
    }

    service.handlePairing(request)

    expect(navEvents).toHaveLength(1)
    expect(navEvents[0]).toMatchObject({
      screen: expect.stringContaining('ServiceLogin'),
      params: { serviceTitle: 'Test Service', pairingCode: 'CODE123' },
    })
    expect(service.hasPendingPairing).toBe(false)
  })

  it('consumes and clears pending pairing', () => {
    const service = new PairingService(logger as any)
    const pendingStates: boolean[] = []

    service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

    const request: PairingPayload = {
      serviceTitle: 'Test Service',
      pairingCode: 'CODE123',
      source: 'deep-link',
    }

    service.handlePairing(request)

    const consumed = service.consumePendingPairing()

    expect(consumed).toEqual({ serviceTitle: 'Test Service', pairingCode: 'CODE123', source: 'deep-link' })
    expect(service.hasPendingPairing).toBe(false)
    expect(pendingStates).toEqual([false, true, false])
  })

  it('returns null when consuming with no pending pairing', () => {
    const service = new PairingService(logger as any)

    expect(service.consumePendingPairing()).toBeNull()
    expect(service.hasPendingPairing).toBe(false)
  })

  it('processes buffered pairing once navigation is ready', () => {
    const service = new PairingService(logger as any)
    const navEvents: PairingNavigationEvent[] = []
    const pendingStates: boolean[] = []

    service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

    const request: PairingPayload = {
      serviceTitle: 'Test Service',
      pairingCode: 'CODE123',
      source: 'deep-link',
    }

    service.handlePairing(request)
    expect(service.hasPendingPairing).toBe(true)

    // Now register navigation listener
    service.onNavigationRequest((event) => navEvents.push(event))

    // Process the pending pairing
    service.processPendingPairing()

    expect(navEvents).toHaveLength(1)
    expect(navEvents[0]).toMatchObject({
      params: { serviceTitle: 'Test Service', pairingCode: 'CODE123' },
    })
    expect(service.hasPendingPairing).toBe(false)
    expect(pendingStates).toEqual([false, true, false])
  })

  it('clears pending state without processing', () => {
    const service = new PairingService(logger as any)
    const pendingStates: boolean[] = []

    service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

    const request: PairingPayload = {
      serviceTitle: 'Test Service',
      pairingCode: 'CODE123',
      source: 'fcm',
    }

    service.handlePairing(request)
    service.clearPendingPairing()

    expect(service.hasPendingPairing).toBe(false)
    expect(pendingStates).toEqual([false, true, false])
  })

  it('unsubscribes navigation listener', () => {
    const service = new PairingService(logger as any)
    const navEvents: PairingNavigationEvent[] = []

    const unsubscribe = service.onNavigationRequest((event) => navEvents.push(event))
    unsubscribe()

    const request: PairingPayload = {
      serviceTitle: 'Test Service',
      pairingCode: 'CODE123',
      source: 'deep-link',
    }

    service.handlePairing(request)

    // Navigation should be buffered since listener was removed
    expect(navEvents).toHaveLength(0)
    expect(service.hasPendingPairing).toBe(true)
  })

  it('unsubscribes pending state listener', () => {
    const service = new PairingService(logger as any)
    const pendingStates: boolean[] = []

    const unsubscribe = service.onPendingStateChange((hasPending) => pendingStates.push(hasPending))
    unsubscribe()

    const request: PairingPayload = {
      serviceTitle: 'Test Service',
      pairingCode: 'CODE123',
      source: 'deep-link',
    }

    service.handlePairing(request)

    // Should only have initial state, no update after unsubscribe
    expect(pendingStates).toEqual([false])
  })
})
