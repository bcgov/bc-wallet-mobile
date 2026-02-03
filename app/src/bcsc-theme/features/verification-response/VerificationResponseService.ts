import { AbstractBifoldLogger } from '@bifold/core'

import { BCSCScreens } from '../../types/navigators'

import {
  VerificationResponseEventType,
  VerificationResponseNavigationEvent,
  VerificationResponseNavigationListener,
} from './types'

/**
 * Central service for handling verification approval push notifications.
 * Manages buffering of pending approvals and navigation event emission.
 *
 * This follows the same pattern as PairingService for consistency.
 *
 * Supports one type of verification event:
 * - request_reviewed: Send-video reviewed (need to check status first)
 *
 */
export class VerificationResponseService {
  private readonly navigationListeners = new Set<VerificationResponseNavigationListener>()

  /**
   * Stores at most one pending approval event when no navigation listeners are registered.
   *
   * NOTE: This is intentionally a single value, not a queue. If multiple verification
   * approval notifications arrive while there are no listeners (e.g., during cold start),
   * each new event overwrites the previous one and only the most recent pending approval
   * will be processed by `processPendingApproval()`.
   */
  private pendingApproval: VerificationResponseEventType | null = null

  constructor(private readonly logger: AbstractBifoldLogger) {}

  /**
   * Subscribe to navigation events. Called when verification approval should trigger screen navigation.
   */
  public onNavigationRequest(listener: VerificationResponseNavigationListener): () => void {
    this.navigationListeners.add(listener)
    return () => this.navigationListeners.delete(listener)
  }

  /**
   * Check if there's a pending verification approval waiting to be processed.
   */
  public get hasPendingApproval(): boolean {
    return this.pendingApproval !== null
  }

  /**
   * Process any pending approval by emitting navigation.
   * Used when the app becomes ready to handle navigation.
   * @returns the event type if there was a pending approval to process, null otherwise
   */
  public processPendingApproval(): VerificationResponseEventType | null {
    if (this.pendingApproval) {
      this.logger.info(`[VerificationResponseService] Processing pending approval: ${this.pendingApproval}`)
      const eventType = this.pendingApproval
      this.pendingApproval = null
      this.emitNavigation(eventType)
      return eventType
    }
    return null
  }

  /**
   * Handle a verification request reviewed notification (send-video).
   * The notification indicates the video was reviewed, but we need to check status to know if approved.
   * If navigation listeners are registered, emits navigation immediately.
   * Otherwise, buffers the request as pending for when a listener is added.
   *
   * @returns true if navigation was emitted immediately, false if buffered
   */
  public handleRequestReviewed(): boolean {
    this.logger.info('[VerificationResponseService] Verification request reviewed (send-video)')

    if (this.navigationListeners.size > 0) {
      this.logger.info('[VerificationResponseService] Emitting request_reviewed event')
      this.emitNavigation('request_reviewed')
      return true
    } else {
      this.logger.info('[VerificationResponseService] Buffering request_reviewed (no listeners)')
      this.pendingApproval = 'request_reviewed'
      return false
    }
  }

  /**
   * Emit navigation event to success screen.
   * @param eventType - The type of verification event triggering navigation
   */
  public emitNavigation(eventType: VerificationResponseEventType) {
    const event: VerificationResponseNavigationEvent = {
      screen: BCSCScreens.VerificationSuccess,
      eventType,
    }
    this.navigationListeners.forEach((listener) => listener(event))
  }
}
