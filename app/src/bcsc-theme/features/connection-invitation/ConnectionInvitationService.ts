import { AbstractBifoldLogger } from '@bifold/core'

import { ConnectionInvitationListener, ConnectionInvitationPayload, PendingConnectionInvitationListener } from './types'

/**
 * Buffers out-of-band connection invitations that arrive before the agent is
 * ready (e.g. a cold-start deep link) and hands them to a single agent-gated
 * consumer once it subscribes.
 *
 * Mirrors {@link PairingService}, but with one key difference: accepting an
 * invitation requires the live agent (to `receiveInvitation` and obtain an
 * `oobRecordId` before navigating), so this service only transports the raw
 * URL — acceptance and navigation happen in the consumer
 * ({@link useConnectionInvitationDeepLink}).
 */
export class ConnectionInvitationService {
  private readonly listeners = new Set<ConnectionInvitationListener>()
  private readonly pendingStateListeners = new Set<PendingConnectionInvitationListener>()
  private pending: ConnectionInvitationPayload | null = null

  constructor(private readonly logger: AbstractBifoldLogger) {}

  /**
   * Subscribe to invitations. Any invitation buffered before subscription (a
   * cold-start deep link) is replayed immediately to the new listener so the
   * consumer does not miss invitations discovered during app launch.
   */
  public onInvitation(listener: ConnectionInvitationListener): () => void {
    this.listeners.add(listener)

    if (this.pending) {
      const payload = this.pending
      this.pending = null
      this.notifyPendingStateChange()
      listener(payload)
    }

    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Subscribe to pending-state changes (useful for UI indicators). Emits the
   * current state immediately on subscription.
   */
  public onPendingStateChange(listener: PendingConnectionInvitationListener): () => void {
    this.pendingStateListeners.add(listener)
    listener(this.hasPending)
    return () => {
      this.pendingStateListeners.delete(listener)
    }
  }

  /** Whether an invitation is buffered waiting for a consumer. */
  public get hasPending(): boolean {
    return this.pending !== null
  }

  /** Clear any pending invitation without processing it. */
  public clearPending(): void {
    this.pending = null
    this.notifyPendingStateChange()
  }

  /**
   * Handle a new connection invitation from any source. Emits to a live
   * consumer when one is subscribed, otherwise buffers it until one is.
   */
  public handleInvitation(payload: ConnectionInvitationPayload): void {
    if (!payload.url) {
      this.logger.warn(`[ConnectionInvitationService] Ignoring invitation from ${payload.source}: missing url`)
      return
    }

    this.logger.info(`[ConnectionInvitationService] Invitation from ${payload.source}`)

    if (this.listeners.size > 0) {
      this.emit(payload)
    } else {
      this.logger.info('[ConnectionInvitationService] Buffering invitation (no listeners)')
      this.pending = payload
      this.notifyPendingStateChange()
    }
  }

  private emit(payload: ConnectionInvitationPayload): void {
    this.listeners.forEach((listener) => listener(payload))
  }

  private notifyPendingStateChange(): void {
    const hasPending = this.hasPending
    this.pendingStateListeners.forEach((listener) => listener(hasPending))
  }
}
