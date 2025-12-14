/**
 * V3 Compatibility Verification State Detection
 *
 * These utilities implement the same verification state logic as v3 native apps,
 * using credential object presence to determine account verification status.
 * This enables seamless rollback to v3 while maintaining state consistency.
 */

import { BifoldLogger } from '@bifold/core'
import {
  CredentialInfo,
  deleteCredential,
  getAccount,
  getAuthorizationRequest,
  getCredential,
  hasCredential,
  setCredential,
} from 'react-native-bcsc-core'

/**
 * V3-compatible verification states matching iOS VerificationState enum.
 * These mirror the exact states used in v3 native apps for verification decisions.
 */
export enum VerificationState {
  /** Fresh install or no account setup */
  Initial = 'initial',
  /** Has account but no verification started (equivalent to .notVerifiedWithoutCredentialsWithAccount) */
  NotVerifiedWithAccount = 'notVerifiedWithAccount',
  /** Verification pending - has AuthorizationRequest (equivalent to .notVerifiedWithCredentials) */
  NotVerifiedWithCredentials = 'notVerifiedWithCredentials',
  /** Fully verified - has Credential object (equivalent to .verified) */
  Verified = 'verified',
}

/**
 * Gets the current verification state using v3-compatible logic.
 * This matches the decision tree used by v3 native apps for navigation routing.
 *
 * V3 Logic (NavigationUtils.getScreenToGoto):
 * 1. No Provider → Initial (go to add card)
 * 2. No ClientRegistration → Initial (go to setup steps)
 * 3. Has AuthorizationRequest → NotVerifiedWithCredentials (try verification or continue setup)
 * 4. Has Credential → Verified (go to verified card screen)
 * 5. No AuthorizationRequest, No Credential → NotVerifiedWithAccount (go to setup steps)
 *
 * @returns Promise<VerificationState> Current verification state
 */
export async function getCurrentVerificationState(logger: BifoldLogger): Promise<VerificationState> {
  try {
    // Quick check: if credential exists, account is verified
    const hasCredentialObj = await hasCredential()
    if (hasCredentialObj) {
      return VerificationState.Verified
    }

    const hasAuthRequest = !!(await getAuthorizationRequest())
    if (hasAuthRequest) {
      return VerificationState.NotVerifiedWithCredentials
    }

    const hasAccount = !!(await getAccount())
    if (hasAccount) {
      return VerificationState.NotVerifiedWithAccount
    }

    return VerificationState.Initial
  } catch (error) {
    const strErr = error instanceof Error ? error.message : String(error)
    logger.error(`Error determining verification state: ${strErr}`)
    return VerificationState.Initial
  }
}

/**
 * Checks if account is verified using v3-compatible logic.
 * In v3, verified status = credential object exists in ClientRegistration.
 *
 * @returns Promise<boolean> True if account has verified credential
 */
export async function isAccountVerified(logger: BifoldLogger): Promise<boolean> {
  try {
    return await hasCredential()
  } catch (error) {
    const strErr = error instanceof Error ? error.message : String(error)
    logger.error(`Error checking verification status: ${strErr}`)
    return false
  }
}

/**
 * Marks account as verified by storing credential object.
 * This is called after successful verification to update the account state
 * to match v3 navigation logic expectations.
 *
 * @param credentialData The credential information to store
 * @returns Promise<void>
 */
export async function markAccountAsVerified(credentialData: CredentialInfo, logger: BifoldLogger): Promise<void> {
  try {
    await setCredential(credentialData)
  } catch (error) {
    const strErr = error instanceof Error ? error.message : String(error)
    logger.error(`Error marking account as verified: ${strErr}`)
    throw error
  }
}

/**
 * Marks account as not verified by removing credential object.
 * This is called during account reset or logout to clear verification status.
 *
 * @returns Promise<void>
 */
export async function markAccountAsNotVerified(logger: BifoldLogger): Promise<void> {
  try {
    await deleteCredential()
  } catch (error) {
    const strErr = error instanceof Error ? error.message : String(error)
    logger.error(`Error marking account as not verified: ${strErr}`)
    throw error
  }
}

/**
 * Gets the stored credential information if account is verified.
 *
 * @returns Promise<CredentialInfo | null> Credential data or null if not verified
 */
export async function getVerifiedCredential(logger: BifoldLogger): Promise<CredentialInfo | null> {
  try {
    return await getCredential()
  } catch (error) {
    const strErr = error instanceof Error ? error.message : String(error)
    logger.error(`Error retrieving verified credential: ${strErr}`)
    return null
  }
}

/**
 * Creates a minimal credential object for account verification.
 * This matches the minimal requirements from v3 credential structure.
 *
 * @param issuer The identity provider issuer URL
 * @param subject The user's subject identifier
 * @param cardType The type of card (e.g., "bcsc", "photo_bcsc")
 * @param accountType Optional account type
 * @returns CredentialInfo object ready for storage
 */
export function createMinimalCredential(
  issuer: string,
  subject: string,
  cardType?: string,
  accountType?: string
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
