import { BifoldLogger } from '@bifold/core'
import { BCSCAccountType, BCSCCardType, decodePayload } from 'react-native-bcsc-core'

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
