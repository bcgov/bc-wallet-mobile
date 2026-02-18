import { AbstractBifoldLogger } from '@bifold/core'
import { BCSCScreens } from '../../types/navigators'
import { PairingNavigationEvent, PairingNavigationListener, PairingPayload, PendingPairingListener } from './types'

/**
 * Central service for handling pairing requests from any source.
 * Manages buffering of pending requests and navigation event emission.
 */
export class PairingService {
  private readonly navigationListeners = new Set<PairingNavigationListener>()
  private readonly pendingStateListeners = new Set<PendingPairingListener>()
  private pendingPairing: PairingPayload | null = null

  constructor(private readonly logger: AbstractBifoldLogger) {}

  /**
   * Subscribe to navigation events. Called when pairing should trigger screen navigation.
   */
  public onNavigationRequest(listener: PairingNavigationListener): () => void {
    this.navigationListeners.add(listener)
    return () => this.navigationListeners.delete(listener)
  }

  /**
   * Subscribe to pending state changes. Useful for UI indicators.
   */
  public onPendingStateChange(listener: PendingPairingListener): () => void {
    this.pendingStateListeners.add(listener)
    // Emit current state immediately upon subscription
    listener(this.hasPendingPairing)
    return () => this.pendingStateListeners.delete(listener)
  }

  /**
   * Check if there's a pending pairing request waiting to be processed.
   */
  public get hasPendingPairing(): boolean {
    return this.pendingPairing !== null
  }

  /**
   * Get the pending pairing payload without consuming it.
   */
  public getPendingPairing(): PairingPayload | null {
    return this.pendingPairing
  }

  /**
   * Consume and return the pending pairing payload.
   * After calling this, hasPendingPairing will return false.
   */
  public consumePendingPairing(): PairingPayload | null {
    if (!this.pendingPairing) {
      return null
    }

    const payload = this.pendingPairing
    this.pendingPairing = null
    this.notifyPendingStateChange()
    return payload
  }

  /**
   * Process any pending pairing by emitting navigation.
   * Used when the app becomes ready to handle navigation.
   */
  public processPendingPairing() {
    if (this.pendingPairing) {
      this.logger.info(`[PairingService] Processing pending pairing: ${this.pendingPairing.serviceTitle}`)
      const payload = this.pendingPairing
      this.pendingPairing = null
      this.notifyPendingStateChange()
      this.emitNavigation(payload)
    }
  }

  /**
   * Clear any pending pairing without processing it.
   */
  public clearPendingPairing() {
    this.pendingPairing = null
    this.notifyPendingStateChange()
  }

  /**
   * Handle a new pairing request from any source.
   * If navigation listeners are registered, emits navigation immediately.
   * Otherwise, buffers the request as pending.
   */
  public handlePairing(payload: PairingPayload) {
    const { serviceTitle, pairingCode, source } = payload

    if (!serviceTitle || !pairingCode) {
      this.logger.warn(`[PairingService] Invalid pairing payload from ${source}: missing serviceTitle or pairingCode`)
      return
    }

    this.logger.info(`[PairingService] Pairing request from ${source}: ${serviceTitle}`)

    if (this.navigationListeners.size > 0) {
      this.logger.info(`[PairingService] Emitting navigation to ${BCSCScreens.ServiceLogin}`)
      this.emitNavigation(payload)
    } else {
      this.logger.info(`[PairingService] Buffering pairing request (no listeners)`)
      this.pendingPairing = payload
      this.notifyPendingStateChange()
    }
  }

  private emitNavigation(payload: PairingPayload) {
    const event: PairingNavigationEvent = {
      screen: BCSCScreens.ServiceLogin,
      params: {
        serviceTitle: payload.serviceTitle,
        pairingCode: payload.pairingCode,
      },
    }
    this.navigationListeners.forEach((listener) => listener(event))
  }

  private notifyPendingStateChange() {
    const hasPending = this.hasPendingPairing
    this.pendingStateListeners.forEach((listener) => listener(hasPending))
  }
}
