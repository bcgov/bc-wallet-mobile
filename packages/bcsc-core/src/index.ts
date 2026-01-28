import { NativeModules, Platform } from 'react-native';
import NativeBcscCoreSpec, {
  type NativeAccount,
  type JWK,
  type JWTClaims,
  type NativeAuthorizationRequest,
  type LoginChallengeResult,
} from './NativeBcscCore';
export type {
  LoginChallenge,
  LoginChallengeResult,
  NativeAccount,
  JWK,
  NativeAuthorizationRequest,
  NativeAddress,
} from './NativeBcscCore';
export { AccountSecurityMethod, BCSCCardProcess } from './NativeBcscCore';
export interface TokenInfo {
  id: string;
  type: TokenType;
  token: string;
  created: number; // Unix timestamp in seconds
  expiry?: number | null; // Unix timestamp in seconds or null
}

export interface PrivateKeyInfo {
  id: string; // 'id' for platform neutrality
  keyType?: string;
  keySize?: number;
  created?: number; // Timestamp
}

// This enum must match the native equivalent. See Token.swift for iOS
// and Token.kt for Android.
export enum TokenType {
  Access = 0,
  Refresh = 1,
  Registration = 2,
}

/**
 * BCSC Card Type enum matching native app enums.
 * iOS: CredentialType in GlobalEnums.swift
 * Android: BcscCardType in BcscCardType.java
 */
export enum BCSCCardType {
  /** Photo BC Services Card */
  PhotoCard = 'BC Services Card Photo',
  /** Non-Photo BC Services Card */
  NonPhotoCard = 'BC Services Card Non-Photo',
  /** Combined BC Driver's Licence and Services Card */
  ComboCard = 'BC Services Card Combo',
  /** Non-BCSC verification */
  NonBcsc = 'N/A',
}

/**
 * BCSC Account Type enum matching native app enums.
 * iOS: accountType string values in Credential.swift
 * Android: BcscAccountType in BcscAccountType.kt
 */
export enum BCSCAccountType {
  /** BC Services Card with photo */
  PhotoCard = 'BC Services Card with photo',
  /** BC Services Card without photo */
  NonPhotoCard = 'BC Services Card without photo',
  /** Other - no BC Services Card (non-BCSC verification) */
  NoBcscCard = 'Other - no BC Services Card',
}

export interface KeyPair {
  id: string; // 'id' for platform neutrality
  public: string;
  private?: string; // may not be available in secure hardware
  privateKeyAvailable: string; // Indicates if the private key exists,
  // even if not extractable
}
export interface ProviderInfo {
  // Assuming Provider can be represented like this
  issuer: string;
  // Add other relevant provider properties
}

export interface ClientRegistrationInfo {
  provider: ProviderInfo;
  clientID: string;
  redirectURI: string;
  registrationClientURI: string;
  created: number; // Timestamp
  updated: number; // Timestamp
  keyIDs: string[];
  accessTokenIDs: string[];
  // Add other fields from ClientRegistration as needed, e.g., for authorizationRequest, credential
}

// Credential interfaces matching v3 structure
export interface CredentialInfo {
  // Core identification
  issuer: string;
  subject: string;
  label: string;

  // Timestamps
  created: number; // Unix timestamp in seconds
  lastUsed?: number | null; // Unix timestamp in seconds
  updatedDate?: number | null; // Unix timestamp in seconds

  // BCSC specific fields
  bcscEvent: string;
  bcscReason: string; // Maps to BcscReason enum
  bcscStatusDate?: number | null; // Unix timestamp in seconds
  bcscEventDate?: number | null; // Unix timestamp in seconds

  // Device and account info
  devicesCount?: number | null;
  maxDevices?: number | null;
  cardType?: BCSCCardType;
  accountType?: BCSCAccountType;

  // Security and authentication
  acr?: number | null; // Authentication Context Reference / LOA level

  // Card expiry
  cardExpiry?: string | null; // Card expiry date string
  cardExpiryDateString?: string | null; // iOS format
  cardExpiryWarningText?: string | null;

  // UI state flags
  hasShownExpiryAlert?: boolean;
  hasShownFeedbackAlert?: boolean;

  // Token references (iOS specific)
  accessTokenIDs?: string[];
  refreshTokenIDs?: string[];

  // Client registration reference
  clientID?: string | null;
}

// Simplified credential for basic operations
export interface BasicCredentialInfo {
  issuer: string;
  subject: string;
  label: string;
  created: number;
  cardType?: BCSCCardType;
  accountType?: BCSCAccountType;
}

const LINKING_ERROR =
  `The package 'react-native-attestation' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// @ts-expect-error global.__turboModuleProxy is a global variable injected by TurboModuleProxy
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const BcscCoreModule = isTurboModuleEnabled ? NativeBcscCoreSpec : NativeModules.BcscCore;

const BcscCore =
  BcscCoreModule ??
  new Proxy(
    {},
    {
      get() {
        throw new Error(LINKING_ERROR);
      },
    }
  );

/**
 * Retrieves information for all available private keys.
 * @returns A promise that resolves to an array of PrivateKeyInfo objects.
 */
export const getAllKeys = (): Promise<PrivateKeyInfo[]> => {
  return BcscCore.getAllKeys();
};

/**
 * Retrieves a key pair (public and optionally private) for a given label.
 * @param label The identifier for the key pair.
 * @returns A promise that resolves to a KeyPair object.
 */
export const getKeyPair = (label: string): Promise<KeyPair> => {
  return BcscCore.getKeyPair(label);
};

/**
 * Retrieves a token of a specified type.
 * @param tokenType The type of token to retrieve (e.g., Access, Refresh, Registration).
 * @returns A promise that resolves to a TokenInfo object if found, otherwise null.
 */
export const getToken = async (tokenType: TokenType): Promise<TokenInfo | null> => {
  // Pass the raw numeric value of the enum to the native side
  const nativeToken = await BcscCore.getToken(tokenType as number);
  if (!nativeToken) {
    return null;
  }

  // The native side returns 'type' as a number (rawValue of TokenType).
  // We cast it back to the TokenType enum on the JS side.
  return {
    ...nativeToken,
    type: nativeToken.type as TokenType, // Ensure this aligns with what native returns
  };
};

/**
 * Saves a token to secure native storage.
 * @param tokenType The type of token (Access, Refresh, Registration)
 * @param token The token string to store
 * @param expiry Optional Unix timestamp in seconds when token expires
 * @returns A promise that resolves to true if saved successfully
 */
export const setToken = async (tokenType: TokenType, token: string, expiry?: number): Promise<boolean> => {
  return BcscCore.setToken(tokenType as number, token, expiry ?? -1);
};

/**
 * Deletes a token from secure native storage.
 * @param tokenType The type of token to delete (Access, Refresh, Registration)
 * @returns A promise that resolves to true if deleted successfully
 */
export const deleteToken = async (tokenType: TokenType): Promise<boolean> => {
  return BcscCore.deleteToken(tokenType as number);
};

/**
 * Sets the issuer in the file system for later reference.
 * @param issuer The issuer string to set.
 * @returns A promise that resolves to true if the issuer was set successfully.
 */
export const setIssuer = (issuer: string): Promise<boolean> => {
  return BcscCore.setIssuer(issuer);
};

/**
 * Gets the issuer from the file system.
 * @returns A promise that resolves to the issuer string if found, otherwise null.
 */
export const getIssuer = (): Promise<string | null> => {
  return BcscCore.getIssuer();
};

/**
 * Sets the current account information.
 * @param account The Account object to set as the current account (without id, which will be generated).
 * @returns A promise that resolves when the account has been successfully set.
 */
export const setAccount = async (account: Omit<NativeAccount, 'id'>): Promise<void> => {
  return BcscCore.setAccount(account);
};

/**
 * Retrieves the current account information.
 * @returns A promise that resolves to an Account object if an account exists, otherwise null.
 */
export const getAccount = async (): Promise<NativeAccount | null> => {
  return BcscCore.getAccount();
};

/**
 * Gets the device ID using the platform-specific stable identifier.
 * On Android: Uses Settings.Secure.ANDROID_ID
 * On iOS: Uses UIDevice.current.identifierForVendor
 * Falls back to a generated UUID if platform-specific ID is not available.
 * @returns A promise that resolves to the device ID string.
 */
export const getDeviceId = async (): Promise<string> => {
  return BcscCore.getDeviceId();
};

/**
 * Constructs the body for a refresh token request.
 * This involves creating a JWT, signing it with the latest private key,
 * and then formatting it along with the provided refresh token and other
 * necessary OAuth parameters.
 * @param issuer The issuer URL for the OAuth provider.
 * @param clientID The client ID for the OAuth application.
 * @param refreshToken The refresh token to include in the request.
 * @returns A promise that resolves to a string containing the full
 *          refresh token request body, or null if an error occurs.
 */
export const getRefreshTokenRequestBody = async (
  issuer: string,
  clientID: string,
  refreshToken: string
): Promise<string | null> => {
  // Validate all parameters are provided
  if (!issuer || !clientID || !refreshToken) {
    throw new Error('All parameters (issuer, clientID, refreshToken) are required');
  }

  return BcscCore.getRefreshTokenRequestBody(issuer, clientID, refreshToken);
};

/**
 * Signs a given pairing code.
 * @param code The pairing code string to sign.
 * @param issuer The issuer URL for the OAuth provider.
 * @param clientID The client ID for the OAuth application.
 * @param fcmDeviceToken The FCM device token for push notifications.
 * @param deviceToken The APNS device token (iOS only).
 * @returns A promise that resolves to a string containing the signature,
 *          or null if an error occurs. (Currently returns a mocked signature).
 */
export const signPairingCode = async (
  code: string,
  issuer: string,
  clientID: string,
  fcmDeviceToken: string,
  deviceToken: string | null
): Promise<string | null> => {
  return BcscCore.signPairingCode(code, issuer, clientID, fcmDeviceToken, deviceToken);
};

/**
 * Creates the dynamic client registration body for OAuth client registration.
 * @param fcmDeviceToken The FCM device token for push notifications.
 * @param deviceToken Optional device token (APNS token for iOS).
 * @param attestation Optional attestation data (Play Integrity token for Android, App Store receipt for iOS).
 * @param nickname Optional nickname to use for client_name. If not provided, falls back to device name.
 * @returns A promise that resolves to the registration body string or null if an error occurs.
 */
export const getDynamicClientRegistrationBody = async (
  fcmDeviceToken: string,
  deviceToken: string | null,
  attestation: string | null,
  nickname?: string | null
): Promise<string | null> => {
  return BcscCore.getDynamicClientRegistrationBody(fcmDeviceToken, deviceToken, attestation, nickname);
};

/**
 * Constructs the body for a device code request.
 * This involves creating a JWT, signing it with the latest private key,
 * and constructing the full OAuth device code request body.
 * @param deviceCode The device code received from the authorization server.
 * @param clientId The client ID for the OAuth application.
 * @param issuer The issuer URL for the OAuth provider.
 * @param confirmationCode The confirmation code to include in the request.
 * @returns A promise that resolves to a string containing the full
 *          device code request body, or null if an error occurs.
 */
export const getDeviceCodeRequestBody = async (
  deviceCode: string,
  clientId: string,
  issuer: string,
  confirmationCode: string
): Promise<string | null> => {
  // Validate all parameters are provided
  if (!deviceCode || !clientId || !issuer || !confirmationCode) {
    throw new Error('All parameters (deviceCode, clientId, issuer, confirmationCode) are required');
  }

  return BcscCore.getDeviceCodeRequestBody(deviceCode, clientId, issuer, confirmationCode);
};

export const decodePayload = async (jweString: string): Promise<any> => {
  return BcscCore.decodePayload(jweString);
};

export const decodeLoginChallenge = async (jwt: string, key?: JWK): Promise<LoginChallengeResult> => {
  return BcscCore.decodeLoginChallenge(jwt, key ?? null);
};

/**
 * Creates a device signed JWT with the provided claims.
 *
 * @param {JWTClaims} claims - An object containing the JWT claims
 * @returns {*} {Promise<string>}
 */
export const createDeviceSignedJWT = async (claims: JWTClaims): Promise<string> => {
  return BcscCore.createSignedJWT(claims);
};

export const createPreVerificationJWT = async (deviceCode: string, clientID: string): Promise<string> => {
  return BcscCore.createPreVerificationJWT(deviceCode, clientID);
};

export const hashBase64 = async (base64: string): Promise<string> => {
  return BcscCore.hashBase64(base64);
};

/**
 * Creates a quick login JWT assertion matching the format used in ias-ios app.
 * This creates a signed JWT with device info claims and access token nonce, following QuickLoginProtocol pattern.
 * @param accessToken The access token to include in the nonce
 * @param clientId The client ID (used for both iss claim)
 * @param issuer The issuer/audience for the JWT
 * @param clientRefId The client reference ID (used for client_ref_id claim)
 * @param key The JWK public key object for encryption
 * @param fcmDeviceToken The FCM device token for push notifications
 * @param deviceToken The device token (APNS token on iOS, optional)
 * @returns A promise that resolves to the signed and encrypted JWT string
 */
export const createQuickLoginJWT = async (
  accessToken: string,
  clientId: string,
  issuer: string,
  clientRefId: string,
  key: JWK,
  fcmDeviceToken: string,
  deviceToken: string | null
): Promise<string> => {
  return BcscCore.createQuickLoginJWT(accessToken, clientId, issuer, clientRefId, key, fcmDeviceToken, deviceToken);
};

/**
 * Retrieves the registration token (idToken) - currently commented out but ready for use.
 * @returns A promise that resolves to a TokenInfo object containing the idToken, or null if not found.
 */
export const getRegistrationToken = async (): Promise<TokenInfo | null> => {
  // Uncomment when ready to use:
  // const nativeToken = await BcscCore.getToken(TokenType.Registration as number);
  // if (!nativeToken) {
  //   return null;
  // }
  // return {
  //   ...nativeToken,
  //   type: nativeToken.type as TokenType,
  // };

  // For now, return null
  return null;
};

/**
 * Removes the current account from the accounts file
 * @returns A promise that resolves when the account has been successfully removed.
 */
export const removeAccount = async (): Promise<void> => {
  return BcscCore.removeAccount();
};

// MARK: - Authentication Methods

// Export authentication types
export type {
  PINVerificationResult,
  AccountLockStatus,
  PINSetupResult,
  DeviceSecurityUnlockResult,
} from './NativeBcscCore';
export { BiometricType } from './NativeBcscCore';

/**
 * Sets a user-created PIN for the current account.
 * @param pin The PIN to set (should be validated before calling)
 * @returns A promise that resolves to setup result with success status and wallet key hash
 */
export const setPIN = async (pin: string): Promise<import('./NativeBcscCore').PINSetupResult> => {
  return BcscCore.setPIN(pin);
};

/**
 * Verifies a PIN for the current account.
 * @param pin The PIN to verify
 * @returns A promise that resolves to verification result with success status, lock status, remaining penalty time, and wallet key hash on success
 */
export const verifyPIN = async (pin: string): Promise<import('./NativeBcscCore').PINVerificationResult> => {
  return BcscCore.verifyPIN(pin);
};

/**
 * Deletes the PIN for the current account.
 * @returns A promise that resolves to true on success
 */
export const deletePIN = async (): Promise<boolean> => {
  return BcscCore.deletePIN();
};

/**
 * Checks if a PIN is set for the current account.
 * @returns A promise that resolves to true if PIN is set, false otherwise
 */
export const hasPINSet = async (): Promise<boolean> => {
  return BcscCore.hasPINSet();
};

/**
 * Performs device authentication (biometric or passcode).
 * @param reason Optional reason string for the authentication prompt
 * @returns A promise that resolves to true on successful authentication
 */
export const performDeviceAuthentication = async (reason?: string): Promise<boolean> => {
  return BcscCore.performDeviceAuthentication(reason);
};

/**
 * Checks if device authentication is available.
 * @returns A promise that resolves to true if device authentication is available
 */
export const canPerformDeviceAuthentication = async (): Promise<boolean> => {
  return BcscCore.canPerformDeviceAuthentication();
};

/**
 * Gets the available biometric type.
 * @returns A promise that resolves to the biometric type: 'none', 'touchID', 'faceID', or 'opticID'
 */
export const getAvailableBiometricType = async (): Promise<import('./NativeBcscCore').BiometricType> => {
  return BcscCore.getAvailableBiometricType();
};

/**
 * Checks if biometric authentication (not including passcode) is available.
 * @returns A promise that resolves to true if biometric authentication is available
 */
export const canPerformBiometricAuthentication = async (): Promise<boolean> => {
  return BcscCore.canPerformBiometricAuthentication();
};

/**
 * Sets the security method for the current account.
 * @param securityMethod The security method to set
 * @returns A promise that resolves to true on success
 */
export const setAccountSecurityMethod = async (
  securityMethod: import('./NativeBcscCore').AccountSecurityMethod
): Promise<boolean> => {
  return BcscCore.setAccountSecurityMethod(securityMethod);
};

/**
 * Gets the security method for the current account.
 * @returns A promise that resolves to the security method string
 */
export const getAccountSecurityMethod = async (): Promise<import('./NativeBcscCore').AccountSecurityMethod> => {
  return BcscCore.getAccountSecurityMethod();
};

/**
 * Checks if the current account is currently locked due to failed PIN attempts.
 * @returns A promise that resolves to lock status with locked boolean and remaining time
 */
export const isAccountLocked = async (): Promise<import('./NativeBcscCore').AccountLockStatus> => {
  return BcscCore.isAccountLocked();
};

/**
 * Gets the best available account security method based on device capabilities.
 * @returns A promise that resolves to the recommended security method
 */

// MARK: - Device Security Methods (for biometric/device authentication)

/**
 * Sets up device security by generating a random PIN internally,
 * storing its hash behind biometric auth, and returning the wallet key.
 * Call this during onboarding when user chooses device security.
 *
 * This replaces the old flow of:
 * 1. Generate random PIN with generateRandomPIN()
 * 2. Store it with setDeviceSecurityPIN()
 *
 * @returns A promise that resolves to setup result containing:
 *   - success: Whether setup succeeded
 *   - walletKey: The PBKDF2-derived key (base64 encoded) for Askar wallet
 *   - isAutoGenerated: Always true for this method
 */
export const setupDeviceSecurity = async (): Promise<import('./NativeBcscCore').PINSetupResult> => {
  return BcscCore.setupDeviceSecurity();
};

/**
 * Unlocks using device security (biometric/passcode) and returns the wallet key.
 * Call this on app unlock when account uses device security method.
 *
 * This combines the old flow of:
 * 1. performDeviceAuthentication()
 * 2. getPINHash()
 *
 * @param reason Optional reason string for the biometric prompt
 * @returns A promise that resolves to unlock result containing:
 *   - success: Whether unlock succeeded
 *   - walletKey: The PBKDF2-derived key (base64 encoded), only present on success
 */
export const unlockWithDeviceSecurity = async (
  reason?: string
): Promise<import('./NativeBcscCore').DeviceSecurityUnlockResult> => {
  return BcscCore.unlockWithDeviceSecurity(reason);
};

/**
 * Checks if the stored PIN was auto-generated (for device security) or user-created.
 * This flag is useful for prompting users to create their own memorable PIN
 * in future app versions (Phase 2).
 *
 * @returns A promise that resolves to true if PIN was auto-generated, false if user-created
 */
export const isPINAutoGenerated = async (): Promise<boolean> => {
  return BcscCore.isPINAutoGenerated();
};

// MARK: - Authorization Request Storage Methods

/**
 * Gets the stored authorization request data.
 *
 * This reads from the authorization_request file in Application Support (iOS)
 * or encrypted storage (Android). The storage location and format is compatible
 * with the v3 native app for migration purposes.
 *
 * The authorization request contains:
 * - Device flow codes (deviceCode, userCode)
 * - User identity info (birthdate, csn, verifiedEmail)
 * - User profile (firstName, lastName, middleNames, address)
 * - Request metadata (status, expiry, etc.)
 *
 * @returns A promise that resolves to the authorization request data, or null if not stored
 */
export const getAuthorizationRequest = async (): Promise<NativeAuthorizationRequest | null> => {
  return BcscCore.getAuthorizationRequest();
};

/**
 * Saves authorization request data to storage.
 *
 * This writes to the authorization_request file in Application Support (iOS)
 * or encrypted storage (Android). The storage location and format is compatible
 * with the v3 native app for migration purposes.
 *
 * @param data The authorization request data to save
 * @returns A promise that resolves to true if saved successfully
 */
export const setAuthorizationRequest = async (data: NativeAuthorizationRequest): Promise<boolean> => {
  return BcscCore.setAuthorizationRequest(data);
};

/**
 * Deletes the stored authorization request data.
 *
 * @returns A promise that resolves to true if deleted successfully (or if it didn't exist)
 */
export const deleteAuthorizationRequest = async (): Promise<boolean> => {
  return BcscCore.deleteAuthorizationRequest();
};

// MARK: - Secure State Types and Hydration

/**
 * Address information for user metadata.
 */
export interface SecureStateAddress {
  streetAddress?: string;
  locality?: string;
  postalCode?: string;
  country?: string;
  region?: string;
}

/**
 * User metadata for non-BCSC verification flows.
 */
export interface SecureStateUserMetadata {
  firstName?: string;
  lastName?: string;
  middleNames?: string;
  address?: SecureStateAddress;
}

// MARK: - Account Flags Storage

/**
 * Known account flag keys for type safety.
 * These correspond to v3 UserDefaultKeys (iOS) / SharedPreferences keys (Android).
 */
export interface AccountFlags {
  /** Whether user's email has been verified */
  isEmailVerified?: boolean;
  /** Whether user chose to skip email verification */
  userSkippedEmailVerification?: boolean;
  /** User's email address (if entered but not yet verified) */
  emailAddress?: string;
  /** Temporary email ID for pending verification */
  temporaryEmailId?: string;
  /** Whether user has submitted a verification video */
  userSubmittedVerificationVideo?: boolean;
}

/**
 * Gets account flags from native storage.
 *
 * These flags are stored in v3-compatible locations:
 * - iOS: account_flag file in Application Support
 * - Android: Account-specific SharedPreferences
 *
 * This enables rollback to v3 while preserving user's email verification state.
 *
 * @returns A promise that resolves to the account flags
 */
export const getAccountFlags = async (): Promise<AccountFlags> => {
  return BcscCore.getAccountFlags() as Promise<AccountFlags>;
};

/**
 * Sets account flags in native storage.
 *
 * These flags are stored in v3-compatible locations:
 * - iOS: account_flag file in Application Support
 * - Android: Account-specific SharedPreferences
 *
 * This enables rollback to v3 while preserving user's email verification state.
 *
 * @param flags The flags to set (will be merged with existing flags)
 * @returns A promise that resolves to true if saved successfully
 */
export const setAccountFlags = async (flags: AccountFlags): Promise<boolean> => {
  return BcscCore.setAccountFlags(flags);
};

/**
 * Deletes all account flags from native storage.
 *
 * @returns A promise that resolves to true if deleted successfully
 */
export const deleteAccountFlags = async (): Promise<boolean> => {
  return BcscCore.deleteAccountFlags();
};

// ============================================================================
// Evidence Metadata Storage Methods
// ============================================================================

/**
 * Evidence image side information.
 */
export interface EvidenceImageSide {
  image_side_name: 'FRONT_SIDE' | 'BACK_SIDE';
  image_side_label: string;
  image_side_tip: string;
}

/**
 * Photo metadata for evidence documents.
 */
export interface PhotoMetadata {
  label: string;
  content_type: string;
  content_length: number;
  date: number;
  sha256: string;
  filename?: string;
  file_path: string;
}

/**
 * Evidence type definition - matches the API response structure.
 */
export interface EvidenceType {
  evidence_type: string;
  has_photo: boolean;
  group: 'BRITISH COLUMBIA' | 'CANADA, OR OTHER LOCATION IN CANADA' | 'UNITED STATES' | 'OTHER COUNTRIES';
  group_sort_order: number;
  sort_order: number;
  collection_order: 'FIRST' | 'SECOND' | 'BOTH';
  document_reference_input_mask: string;
  document_reference_label: string;
  document_reference_sample: string;
  image_sides: EvidenceImageSide[];
  evidence_type_label: string;
}

/**
 * Matches v3 storage structure as well as additionalEvidenceData field in React Native store
 */
export interface EvidenceMetadata {
  /** Evidence type information - full EvidenceType object */
  evidenceType: EvidenceType;
  /** Photo metadata array */
  metadata: PhotoMetadata[];
  /** Document number/reference */
  documentNumber?: string;
}

/**
 * Gets evidence metadata from native storage.
 *
 * These are stored in v3-compatible locations:
 * - iOS: evidence_metadata file in Application Support (matches EvidenceMetadataRequestStorageSource)
 * - Android: EvidenceRepository SharedPreferences storage
 *
 * This enables rollback to v3 while preserving user's evidence collection progress.
 *
 * @returns A promise that resolves to the evidence metadata array
 */
export const getEvidenceMetadata = async (): Promise<EvidenceMetadata[]> => {
  return BcscCore.getEvidenceMetadata() as Promise<EvidenceMetadata[]>;
};

/**
 * Sets evidence metadata in native storage.
 *
 * These are stored in v3-compatible locations:
 * - iOS: evidence_metadata file in Application Support (matches EvidenceMetadataRequestStorageSource)
 * - Android: EvidenceRepository SharedPreferences storage
 *
 * This enables rollback to v3 while preserving user's evidence collection progress.
 *
 * @param evidence The evidence metadata array to save
 * @returns A promise that resolves to true if saved successfully
 */
export const setEvidenceMetadata = async (evidence: EvidenceMetadata[]): Promise<boolean> => {
  return BcscCore.setEvidenceMetadata(evidence);
};

/**
 * Deletes all evidence metadata from native storage.
 *
 * @returns A promise that resolves to true if deleted successfully
 */
export const deleteEvidenceMetadata = async (): Promise<boolean> => {
  return BcscCore.deleteEvidenceMetadata();
};

/**
 * Credential Management
 *
 * These methods manage the credential object that indicates verified account status.
 * Migrating from v3, the presence of a credential object means the account
 * is verified and can access the verified card screen.
 *
 * Storage locations:
 * - iOS: Stored within ClientRegistration in secure keychain
 * - Android: Stored within Provider → ClientRegistration in secure storage
 */

/**
 * Store credential information in secure native storage.
 * This is the primary indicator of account verification status.
 *
 * @param credential - The credential information to store
 */
export async function setCredential(credential: CredentialInfo): Promise<void> {
  return BcscCore.setCredential(credential);
}

/**
 * Retrieve stored credential information from secure native storage.
 *
 * @returns The stored credential or null if none exists
 */
export async function getCredential(): Promise<CredentialInfo | null> {
  return BcscCore.getCredential();
}

/**
 * Remove credential information from secure native storage.
 * This effectively marks the account as not verified.
 */
export async function deleteCredential(): Promise<void> {
  return BcscCore.deleteCredential();
}

/**
 * Check if a credential exists without retrieving it.
 * Useful for quick verification status checks.
 *
 * @returns True if credential exists, false otherwise
 */
export async function hasCredential(): Promise<boolean> {
  return BcscCore.hasCredential();
}
/**
 * Displays a local notification on the device.
 * @param title The notification title
 * @param message The notification body/message
 * @returns A promise that resolves when the notification has been displayed.
 */
export const showLocalNotification = async (title: string, message: string): Promise<void> => {
  return BcscCore.showLocalNotification(title, message);
};
