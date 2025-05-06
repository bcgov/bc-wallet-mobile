import { NativeModules, Platform } from 'react-native';
import NativeBcscCoreSpec from './NativeBcscCore';

export interface PrivateKeyInfo {
  id: string; // 'id' for platform neutrality
  keyType?: string;
  keySize?: number;
  created?: number; // Timestamp
}

export interface KeyPair {
  id: string; // 'id' for platform neutrality
  public: string;
  private?: string; // may not be available in secure hardware
  privateKeyAvailable: string; // Indicates if the private key exists, even if not extractable
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

const BcscCore = BcscCoreModule
  ? BcscCoreModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export const multiply = (a: number, b: number): number => {
  return BcscCore.multiply(a, b);
};

export const getAllKeys = (): Promise<PrivateKeyInfo[]> => {
  return BcscCore.getAllKeys();
};

export const getKeyPair = (label: string): Promise<KeyPair> => {
  return BcscCore.getKeyPair(label);
};
