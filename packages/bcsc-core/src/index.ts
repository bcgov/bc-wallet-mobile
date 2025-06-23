import { NativeModules, Platform } from 'react-native';
import NativeBcscCoreSpec, { type NativeAccount } from './NativeBcscCore';
export type { NativeAccount } from './NativeBcscCore';
export { AccountSecurityMethod } from './NativeBcscCore';
export interface TokenInfo {
  id: string;
  type: TokenType;
  token: string;
  created: number; // Timestamp
  expiry?: number | null; // Timestamp or null
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

const LINKING_ERROR =
  `The package 'react-native-attestation' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// @ts-expect-error global.__turboModuleProxy is a global variable injected by TurboModuleProxy
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const BcscCoreModule = isTurboModuleEnabled
  ? NativeBcscCoreSpec
  : NativeModules.BcscCore;

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
 * @param tokenType The type of token to retrieve (e.g., Access, Refresh).
 * @returns A promise that resolves to a TokenInfo object if found, otherwise null.
 */
export const getToken = async (
  tokenType: TokenType
): Promise<TokenInfo | null> => {
  // Updated return type
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
 * Sets the current account information.
 * @param account The Account object to set as the current account (without id, which will be generated).
 * @returns A promise that resolves when the account has been successfully set.
 */
export const setAccount = async (
  account: Omit<NativeAccount, 'id'>
): Promise<void> => {
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
    throw new Error(
      'All parameters (issuer, clientID, refreshToken) are required'
    );
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
  deviceToken?: string
): Promise<string | null> => {
  return BcscCore.signPairingCode(
    code,
    issuer,
    clientID,
    fcmDeviceToken,
    deviceToken
  );
};

/**
 * Retrieves the body for a dynamic client registration request.
 * This method generates a JSON structure containing client information,
 * device info JWT, public key JWKS, and OAuth2 configuration for
 * dynamic client registration with the BC Services Card authentication server.
 * @param fcmDeviceToken The FCM device token to include in the device info.
 * @param deviceToken The APNS device token (iOS only - not used by Android implementation).
 * @returns A promise that resolves to a JSON string containing the DCR body, or null if an error occurs.
 */
export const getDynamicClientRegistrationBody = async (
  fcmDeviceToken: string,
  deviceToken?: string
): Promise<string | null> => {
  return BcscCore.getDynamicClientRegistrationBody(fcmDeviceToken, deviceToken);
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
    throw new Error(
      'All parameters (deviceCode, clientId, issuer, confirmationCode) are required'
    );
  }

  return BcscCore.getDeviceCodeRequestBody(
    deviceCode,
    clientId,
    issuer,
    confirmationCode
  );
};
