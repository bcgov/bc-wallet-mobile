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
  getRefreshTokenRequestBody(
    issuer: string,
    clientID: string
  ): Promise<string | null>;
  signPairingCode(
    code: string,
    issuer: string,
    clientID: string,
    fcmDeviceToken: string,
    deviceToken?: string
  ): Promise<string | null>;
  getDynamicClientRegistrationBody(
    fcmDeviceToken: string,
    deviceToken?: string
  ): Promise<string | null>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('BcscCore');
