import { BCSCAccountType, BCSCCardType, CredentialInfo } from 'react-native-bcsc-core'

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
    bcscEvent: 'VERIFIED', // Standard verification event
    bcscReason: 'SUCCESSFUL_VERIFICATION', // Standard reason
    cardType,
    accountType,
    lastUsed: Math.floor(Date.now() / 1000),
    updatedDate: Math.floor(Date.now() / 1000),
  }
}
