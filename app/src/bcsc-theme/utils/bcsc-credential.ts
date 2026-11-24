import { BCSCAccountType, BCSCCardProcess, BCSCCardType, CredentialInfo } from 'react-native-bcsc-core'
import { BCSCEvent, BCSCReason } from './id-token'

/**
 * Creates a minimal credential object for account verification.
 * This matches the minimal requirements from v3 credential structure.
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

/** Whether the credential record says the card was cancelled or expired. */
export function isCredentialDeactivated(credential: CredentialInfo | null): boolean {
  return credential?.bcscEvent === BCSCEvent.Cancel || credential?.bcscEvent === BCSCEvent.Expire
}
