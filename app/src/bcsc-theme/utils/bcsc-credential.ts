import { BCSCSecureState, VerificationStatus } from '@/store'
import { BCSCAccountType, BCSCCardType, CredentialInfo } from 'react-native-bcsc-core'
import { BCSCEvent } from './id-token'

/**
 * Creates a minimal credential object for account verification.
 * This matches the minimal requirements from v3 credential structure.
 *
 * @param issuer The identity provider issuer URL
 * @param subject The user's subject identifier
 * @param cardType The type of card from BCSCCardType enum
 * @param accountType The account type from BCSCAccountType enum
 * @returns CredentialInfo object ready for storage
 */
export function createMinimalCredential(
  issuer: string,
  subject: string,
  cardType?: BCSCCardType,
  accountType?: BCSCAccountType
): CredentialInfo {
  return {
    issuer,
    subject,
    label: 'BC Services Card', // Default label matching v3
    created: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
    bcscEvent: BCSCEvent.Authorization, // Standard verification event
    bcscReason: 'SUCCESSFUL_VERIFICATION', // Standard reason // FIXME (MD): This is not a valid reason
    cardType,
    accountType,
    lastUsed: Math.floor(Date.now() / 1000),
    updatedDate: Math.floor(Date.now() / 1000),
  }
}

/**
 * Determines if the user is verified based on their secure state.
 *
 * @param secureState The current secure state of the user
 * @returns boolean indicating if the user is verified
 */
export function isVerified(secureState: BCSCSecureState): boolean {
  if (secureState.verified || secureState.verifiedStatus === VerificationStatus.VERIFIED) {
    // If already verified, we can trust the state and skip checks
    return true
  }

  if (secureState.refreshToken && secureState.verifiedStatus !== VerificationStatus.REVOKED) {
    // If we have a refresh token and the status is not revoked, we can consider it verified
    return true
  }

  // In all other cases, we should not consider the user verified
  return false
}
