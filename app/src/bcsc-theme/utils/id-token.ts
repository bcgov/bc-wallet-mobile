import { BCSCCardType } from '../types/cards'
import { decodePayload } from 'react-native-bcsc-core'
import { BifoldLogger } from '@bifold/core'

export enum BCSCAccountType {
  Photo = 'BC Services Card with photo',
  NonPhoto = 'BC Services Card without photo',
  Other = 'Other - no BC Services Card',
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
  // note: this value is undefined for non-bcsc cards, transform to 'Other' in that case
  bcsc_card_type: BCSCCardType.Combined | BCSCCardType.Photo | BCSCCardType.NonPhoto | BCSCCardType.Other
  bcsc_event: string
  bcsc_reason: string
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

    // Transform undefined card_type to 'Other' (ie: non-BCSC card) if account_type is OTHER
    if (payload.bcsc_card_type === undefined && payload.bcsc_account_type === BCSCAccountType.Other) {
      payload.bcsc_card_type = BCSCCardType.Other
    }

    return payload
  } catch (error) {
    logger.error('getIdTokenMetadata -> Failed to decode ID token payload', error as Error)
    throw error
  }
}
