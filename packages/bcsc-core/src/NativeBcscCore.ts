import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Re-declaring PrivateKeyInfo and KeyPair here to avoid import issues from index.ts
// Ideally, these would be in a shared types file if not for TurboModule limitations.
export type PrivateKeyInfo = {
  id: string;
  keyType?: string;
  keySize?: number;
  created?: number; // Timestamp
};

export type KeyPair = {
  id: string;
  public: string;
  private?: string;
  privateKeyAvailable: string;
};

// Assuming TokenType enum is defined in index.ts and will be used by the JS side.
// For the native spec, we might just expect a number if not importing.
export type NativeToken = {
  id: string;
  type: number; // Corresponds to TokenType rawValue
  token: string;
  created: number; // Timestamp
  expiry?: number | null; // Timestamp or null
};

export type JWK = {
  kty: string;
  e: string;
  kid: string;
  alg: string;
  n: string;
};

export type JWTClaims = {
  iss: string;
  aud: string;
  sub: string;
  iat: number;
  exp: number;
  [key: string]: any;
};

export enum AccountSecurityMethod {
  PinNoDeviceAuth = 'app_pin_no_device_authn',
  PinWithDeviceAuth = 'app_pin_has_device_authn',
  DeviceAuth = 'device_authentication',
}

export type NativeAccount = {
  readonly id: string;
  issuer: string;
  clientID: string;
  securityMethod: AccountSecurityMethod;
  displayName?: string;
  didPostNicknameToServer?: boolean;
  nickname?: string;
  failedAttemptCount?: number;
  // lastAttemptDate?: number; // Timestamp
  // Penalties are not directly included as it's a computed property
  // with complex structure
};

export interface Spec extends TurboModule {
  getAllKeys(): Promise<PrivateKeyInfo[]>;
  getKeyPair(label: string): Promise<KeyPair>;
  getToken(tokenType: number): Promise<NativeToken | null>;
  getAccount(): Promise<NativeAccount | null>;
  setAccount(account: Omit<NativeAccount, 'id'>): Promise<void>;
  getRefreshTokenRequestBody(issuer: string, clientID: string, refreshToken: string): Promise<string | null>;
  signPairingCode(
    code: string,
    issuer: string,
    clientID: string,
    fcmDeviceToken: string,
    deviceToken?: string
  ): Promise<string | null>;
  getDynamicClientRegistrationBody(fcmDeviceToken: string, deviceToken?: string): Promise<string | null>;
  getDeviceCodeRequestBody(
    deviceCode: string,
    clientId: string,
    issuer: string,
    confirmationCode: string
  ): Promise<string | null>;
  decodePayload(jweString: string): Promise<string>;
  createEvidenceRequestJWT(deviceCode: string, clientID: string): Promise<string>;
  createQuickLoginJWT(
    accessToken: string,
    clientId: string,
    issuer: string,
    clientRefId: string,
    key: JWK,
    fcmDeviceToken: string,
    deviceToken?: string
  ): Promise<string>;
  hashBase64(base64: string): Promise<string>;
  createSignedJWT(claims: JWTClaims): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('BcscCore');
