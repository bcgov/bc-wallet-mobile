import { NativeModules, Platform } from 'react-native';
import NativeBcscCoreSpec from './NativeBcscCore';

export interface PrivateKeyInfo {
  keyType: string;
  keySize: number;
  tag: string;
  created: number; // Timestamp
}

export interface KeyPair {
  public: string;
  private: string;
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

export const findAllPrivateKeys = (): Promise<PrivateKeyInfo[]> => {
  return BcscCore.findAllPrivateKeys();
};

export const getKeyPair = (label: string): Promise<KeyPair> => {
  return BcscCore.getKeyPair(label);
};
