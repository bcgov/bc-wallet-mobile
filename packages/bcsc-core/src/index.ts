import { NativeModules, Platform } from 'react-native';
import NativeBcscCoreSpec from './NativeBcscCore';

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

export function multiply(a: number, b: number): number {
  return BcscCore.multiply(a, b);
}

export function multiply2(a: number, b: number): number {
  return BcscCore.multiply2(a, b);
}
