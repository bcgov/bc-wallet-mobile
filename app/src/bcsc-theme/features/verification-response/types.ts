import { BCSCScreens } from '../../types/navigators'

/**
 * Type of verification event received from push notification.
 *
 * - 'direct_approval': In-person verification was directly approved by agent.
 *   The notification contains bcsc_event='Authorization' and bcsc_reason='Approved by Agent'.
 *   We can directly fetch tokens and navigate to success.
 *
 * - 'request_reviewed': Send-video verification request was reviewed. (send-video/live call)
 *   The notification title is 'Verification Request Reviewed' but doesn't indicate approval/rejection.
 *   We need to check the verification status first before proceeding.
 */
export type VerificationResponseEventType = 'direct_approval' | 'request_reviewed'

/**
 * Navigation event emitted when verification response navigation should occur
 */
export type VerificationResponseNavigationEvent = {
  screen: typeof BCSCScreens.VerificationSuccess
  /** Type of verification response event that triggered this navigation */
  eventType: VerificationResponseEventType
}

export type VerificationResponseNavigationListener = (event: VerificationResponseNavigationEvent) => void
