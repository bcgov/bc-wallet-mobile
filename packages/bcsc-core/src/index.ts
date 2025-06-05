import { NativeModules, Platform } from 'react-native';
import NativeBcscCoreSpec from './NativeBcscCore';

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

export interface Account {
  id: string;
  issuer: string;
  clientID?: string;
  // _securityMethod: string; // Consider if this should be exposed or mapped to a more friendly type
  displayName?: string;
  didPostNicknameToServer: boolean;
  nickname?: string;
  failedAttemptCount: number;
  // lastAttemptDate?: number; // Timestamp
  // Penalties are not directly included as it's a computed property
  // with complex structure
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
 * Retrieves the current account information.
 * @returns A promise that resolves to an Account object if an account exists, otherwise null.
 */
export const getAccount = async (): Promise<Account | null> => {
  return BcscCore.getAccount();
};

/**
 * Constructs the body for a refresh token request.
 * This involves creating a JWT, signing it with the latest private key,
 * and then formatting it along with the existing refresh token and other
 * necessary OAuth parameters.
 * @returns A promise that resolves to a string containing the full
 *          refresh token request body, or null if an error occurs.
 */
export const getRefreshTokenRequestBody = async (): Promise<string | null> => {
  return BcscCore.getRefreshTokenRequestBody();
};

/**
 * Signs a given pairing code.
 * @param code The pairing code string to sign.
 * @returns A promise that resolves to a string containing the signature,
 *          or null if an error occurs. (Currently returns a mocked signature).
 */
export const signPairingCode = async (code: string): Promise<string | null> => {
  return BcscCore.signPairingCode(code);
};
