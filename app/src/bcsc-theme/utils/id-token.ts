import { BifoldLogger } from '@bifold/core'
import { BCSCAccountType, BCSCCardType, decodePayload } from 'react-native-bcsc-core'
import { StatusNotification } from '../features/fcm/services/fcm-service'

/**
 * BCSC event types
 * Added from https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301574688/5.1+System+Interfaces#ID-Token
 * @export
 * @enum {number}
 */
export enum BCSCEvent {
  Authorization = 'Authorization',
  Renewal = 'Renewal',
  Replace = 'Replace',
  Cancel = 'Cancel',
  Expire = 'Expire',
}

/**
 * BCSC reason types
 *
 * @export
 * @enum {number}
 */
export enum BCSCReason {
  ApprovedByAgent = 'Approved by Agent',
  Renew = 'Renewed by Card Renew',
  Replace = 'Replaced by Card Replace',
  Cancel = 'Canceled by Card Cancel', // i.e agent via web portal.
  ExpiredBySystem = 'Expired by System',
  CanceledByAgent = 'Canceled by Agent', // i.e automatic, too many cards.
  CanceledByUser = 'Canceled by User', // i.e user manually removes a card.
  CanceledByAdditionalCard = 'Canceled by Additional Card',
  CanceledByCardTypeChange = 'Canceled by Card Type Change',
  CanceledDueToInactivity = 'Canceled due to Inactivity',
}

/**
 * BCSC status notification claims from push notifications.
 * These are sent when account status changes (verification approved, card canceled, etc.)
 */
export type BCSCStatusNotificationClaims = {
  aud: string
  iss: string
  bcsc_reason: string
  bcsc_event: string
  exp: number
  iat: number
  jti: string
}

/**
 * Parses a JSON string containing BCSC status notification claims.
 * @param jsonString - The JSON string from the status notification
 * @returns The parsed claims or null if parsing fails or input is empty
 */
export function parseStatusNotificationClaims(jsonString: string | undefined): BCSCStatusNotificationClaims | null {
  if (!jsonString) {
    return null
  }

  try {
    return JSON.parse(jsonString) as BCSCStatusNotificationClaims
  } catch {
    return null
  }
}

/**
 * Checks if the status notification claims indicate a verification approval.
 * Verification approval occurs when bcsc_event is 'Authorization' and bcsc_reason is 'Approved by Agent'.
 */
export function isVerificationApproval(claims: BCSCStatusNotificationClaims): boolean {
  return claims.bcsc_event === BCSCEvent.Authorization && claims.bcsc_reason === BCSCReason.ApprovedByAgent
}

/**
 * Checks if the status notification indicates a verification request reviewed.
 * Verification request reviewed occurs when title is 'Verification Request Reviewed'.
 */
export function isVerificationRequestReviewed(data: StatusNotification): boolean {
  const { title } = data
  return title === 'Verification Request Reviewed'
}

/**
 * IAS BCSC ID token
 *
 * @see https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301574688/5.1+System+Interfaces#ID-Token
 */
export interface IdToken {
  sub: string
  aud: string
  iss: string
  exp: number // epoch
  iat: string
  jti: string
  family_name: string
  given_name: string
  middle_name?: string
  // note: this value is undefined for non-bcsc cards, transform to NonBcsc in that case
  bcsc_card_type: BCSCCardType.ComboCard | BCSCCardType.PhotoCard | BCSCCardType.NonPhotoCard | BCSCCardType.NonBcsc
  bcsc_event: BCSCEvent
  bcsc_reason: BCSCReason
  bcsc_status_date: number // epoch
  acr: number // Defined since R2.6.x
  bcsc_devices_count: number // Defined since R2.10.2
  bcsc_max_devices: number // Defined since R2.10.2
  hasActivePersonCredential: boolean // Defined since: R3.11.0
  bcsc_account_type: BCSCAccountType // Defined since: R3.14.0
}

/**
 * Decode and parse the BCSC ID token to extract metadata.
 *
 * @param {string} idToken - The BCSC ID token (JWE).
 * @param {BifoldLogger} logger - Logger instance for error logging.
 * @returns {*} {Promise<BCSCAccountToken>} Parsed ID token payload as a IdToken object.
 */
export async function getIdTokenMetadata(idToken: string, logger: BifoldLogger): Promise<IdToken> {
  try {
    const payloadString = await decodePayload(idToken)
    const payload: IdToken = JSON.parse(payloadString)

    // Transform undefined card_type to NonBcsc (ie: non-BCSC card) if account_type is OTHER
    if (payload.bcsc_card_type === undefined && payload.bcsc_account_type === BCSCAccountType.NoBcscCard) {
      payload.bcsc_card_type = BCSCCardType.NonBcsc
    }

    return payload
  } catch (error) {
    logger.error('getIdTokenMetadata -> Failed to decode ID token payload', error as Error)
    throw error
  }
}
