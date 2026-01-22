import { AbstractBifoldLogger } from '@bifold/core'

import { BCSCScreens } from '../../types/navigators'

import {
  PendingApprovalListener,
  VerificationApprovalNavigationEvent,
  VerificationApprovalNavigationListener,
  VerificationEventType,
} from './types'

/**
 * Central service for handling verification approval push notifications.
 * Manages buffering of pending approvals and navigation event emission.
 *
 * This follows the same pattern as PairingService for consistency.
 *
 * Supports two types of verification events:
 * - direct_approval: In-person verification approved by agent (can directly fetch tokens)
 * - request_reviewed: Send-video reviewed (need to check status first)
 *
 * Note: Unlike PairingService, this service doesn't store payload data because
 * the deviceCode/userCode are already persisted to secure storage when the user
 * initiates device authorization. The hook reads them from the store.
 */
export class VerificationApprovalService {
  private readonly navigationListeners = new Set<VerificationApprovalNavigationListener>()
  private readonly pendingStateListeners = new Set<PendingApprovalListener>()
  private pendingApproval: VerificationEventType | null = null

  constructor(private readonly logger: AbstractBifoldLogger) {}

  /**
   * Subscribe to navigation events. Called when verification approval should trigger screen navigation.
   */
  public onNavigationRequest(listener: VerificationApprovalNavigationListener): () => void {
    this.navigationListeners.add(listener)
    return () => this.navigationListeners.delete(listener)
  }

  /**
   * Subscribe to pending state changes. Useful for UI indicators.
   */
  public onPendingStateChange(listener: PendingApprovalListener): () => void {
    this.pendingStateListeners.add(listener)
    // Emit current state immediately upon subscription
    listener(this.hasPendingApproval)
    return () => this.pendingStateListeners.delete(listener)
  }

  /**
   * Check if there's a pending verification approval waiting to be processed.
   */
  public get hasPendingApproval(): boolean {
    return this.pendingApproval !== null
  }

  /**
   * Get the type of pending approval, if any.
   */
  public get pendingApprovalType(): VerificationEventType | null {
    return this.pendingApproval
  }

  /**
   * Consume the pending approval state.
   * After calling this, hasPendingApproval will return false.
   * @returns the event type if there was a pending approval, null otherwise
   */
  public consumePendingApproval(): VerificationEventType | null {
    if (!this.pendingApproval) {
      return null
    }

    const eventType = this.pendingApproval
    this.pendingApproval = null
    this.notifyPendingStateChange()
    return eventType
  }

  /**
   * Process any pending approval by emitting navigation.
   * Used when the app becomes ready to handle navigation.
   * @returns the event type if there was a pending approval to process, null otherwise
   */
  public processPendingApproval(): VerificationEventType | null {
    if (this.pendingApproval) {
      this.logger.info(`[VerificationApprovalService] Processing pending approval: ${this.pendingApproval}`)
      const eventType = this.pendingApproval
      this.pendingApproval = null
      this.notifyPendingStateChange()
      this.emitNavigation(eventType)
      return eventType
    }
    return null
  }

  /**
   * Clear any pending approval without processing it.
   */
  public clearPendingApproval() {
    this.pendingApproval = null
    this.notifyPendingStateChange()
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
    this.logger.info('[VerificationApprovalService] Verification request reviewed (send-video)')

    if (this.navigationListeners.size > 0) {
      this.logger.info('[VerificationApprovalService] Emitting request_reviewed event')
      this.emitNavigation('request_reviewed')
      return true
    } else {
      this.logger.info('[VerificationApprovalService] Buffering request_reviewed (no listeners)')
      this.pendingApproval = 'request_reviewed'
      this.notifyPendingStateChange()
      return false
    }
  }

  /**
   * Handle a direct verification approval from FCM (in-person).
   * The notification contains explicit approval, so we can directly fetch tokens.
   * If navigation listeners are registered, emits navigation immediately.
   * Otherwise, buffers the request as pending for when a listener is added.
   *
   * @returns true if navigation was emitted immediately, false if buffered
   */
  public handleApproval(): boolean {
    this.logger.info('[VerificationApprovalService] Direct verification approval received (in-person)')

    if (this.navigationListeners.size > 0) {
      this.logger.info(`[VerificationApprovalService] Emitting direct_approval to ${BCSCScreens.VerificationSuccess}`)
      this.emitNavigation('direct_approval')
      return true
    } else {
      this.logger.info('[VerificationApprovalService] Buffering direct_approval (no listeners)')
      this.pendingApproval = 'direct_approval'
      this.notifyPendingStateChange()
      return false
    }
  }

  /**
   * Emit navigation event to success screen.
   * @param eventType - The type of verification event triggering navigation
   */
  public emitNavigation(eventType: VerificationEventType) {
    const event: VerificationApprovalNavigationEvent = {
      screen: BCSCScreens.VerificationSuccess,
      eventType,
    }
    this.navigationListeners.forEach((listener) => listener(event))
  }

  private notifyPendingStateChange() {
    const hasPending = this.hasPendingApproval
    this.pendingStateListeners.forEach((listener) => listener(hasPending))
  }
}
