import { ConnectionInvitationService } from './ConnectionInvitationService'
import { ConnectionInvitationPayload } from './types'

describe('ConnectionInvitationService', () => {
  const logger = { info: jest.fn(), warn: jest.fn() } as any
  const invitation: ConnectionInvitationPayload = {
    url: 'bcwallet://aries_connection_invitation?oob=eyJhbGciOi',
    source: 'deep-link',
  }

  let service: ConnectionInvitationService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ConnectionInvitationService(logger)
  })

  it('buffers an invitation when there are no listeners', () => {
    service.handleInvitation(invitation)

    expect(service.hasPending).toBe(true)
  })

  it('replays a buffered invitation to a late subscriber and clears pending', () => {
    const listener = jest.fn()

    service.handleInvitation(invitation)
    expect(service.hasPending).toBe(true)

    service.onInvitation(listener)

    expect(listener).toHaveBeenCalledWith(invitation)
    expect(service.hasPending).toBe(false)
  })

  it('emits immediately when a listener is already subscribed (warm path)', () => {
    const listener = jest.fn()
    service.onInvitation(listener)

    service.handleInvitation(invitation)

    expect(listener).toHaveBeenCalledWith(invitation)
    // Nothing buffered because it was delivered live.
    expect(service.hasPending).toBe(false)
  })

  it('does not deliver to a listener after it unsubscribes', () => {
    const listener = jest.fn()
    const unsubscribe = service.onInvitation(listener)

    unsubscribe()
    service.handleInvitation(invitation)

    expect(listener).not.toHaveBeenCalled()
    // Buffered again since there are no active listeners.
    expect(service.hasPending).toBe(true)
  })

  it('ignores invitations without a url', () => {
    service.handleInvitation({ url: '', source: 'deep-link' })

    expect(service.hasPending).toBe(false)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('notifies pending-state subscribers as the buffer fills and drains', () => {
    const stateListener = jest.fn()
    service.onPendingStateChange(stateListener)
    // Emits current state (false) on subscription.
    expect(stateListener).toHaveBeenLastCalledWith(false)

    service.handleInvitation(invitation)
    expect(stateListener).toHaveBeenLastCalledWith(true)

    service.onInvitation(jest.fn())
    expect(stateListener).toHaveBeenLastCalledWith(false)
  })

  it('clearPending drops a buffered invitation', () => {
    service.handleInvitation(invitation)
    expect(service.hasPending).toBe(true)

    service.clearPending()

    expect(service.hasPending).toBe(false)
  })
})
