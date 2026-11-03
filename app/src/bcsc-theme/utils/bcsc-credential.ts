import { VerificationStatus } from '@/store'
import { BCSCAccountType, BCSCCardProcess, BCSCCardType, CredentialInfo } from 'react-native-bcsc-core'
import { BCSCEvent, BCSCReason } from './id-token'

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
    bcscEvent: BCSCEvent.Authorization,
    bcscReason: BCSCReason.ApprovedByAgent,
    cardType,
    accountType,
    lastUsed: Math.floor(Date.now() / 1000),
    updatedDate: Math.floor(Date.now() / 1000),
  }
}

/**
 * Creates the credential record persisted once a device is verified, typed from the identification
 * process the user went through. An unknown process (e.g. a device set up by account transfer never ran
 * one) is recorded as a non-BCSC card.
 *
 * @param issuer The identity provider issuer URL
 * @param subject The user's subject identifier
 * @param cardProcess The identification process from the authorization request, if known
 * @returns CredentialInfo object ready for storage
 */
export function createVerifiedCredential(
  issuer: string,
  subject: string,
  cardProcess?: BCSCCardProcess
): CredentialInfo {
  switch (cardProcess) {
    case BCSCCardProcess.BCSCPhoto:
      return createMinimalCredential(issuer, subject, BCSCCardType.PhotoCard, BCSCAccountType.PhotoCard)
    case BCSCCardProcess.BCSCNonPhoto:
      return createMinimalCredential(issuer, subject, BCSCCardType.NonPhotoCard, BCSCAccountType.NonPhotoCard)
    default:
      return createMinimalCredential(issuer, subject, BCSCCardType.NonBcsc, BCSCAccountType.NoBcscCard)
  }
}

/**
 * Determines the verification status of a credential based on its properties.
 *
 * @param credential The credential information to evaluate
 * @returns VerificationStatus indicating if the credential is VERIFIED, DEACTIVATED, or UNVERIFIED
 */
export function getCredentialVerificationStatus(credential: CredentialInfo | null): VerificationStatus {
  if (!credential) {
    return VerificationStatus.UNVERIFIED
  }

  if (credential.bcscEvent === BCSCEvent.Cancel || credential.bcscEvent === BCSCEvent.Expire) {
    return VerificationStatus.DEACTIVATED
  }

  return VerificationStatus.VERIFIED
}
