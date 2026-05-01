// Jest mock for @expo/app-integrity (used by @bifold/core's useAttestation
// hook). The real module relies on expo-modules-core's native event emitter,
// which is not available in the Jest environment. Stub the named exports
// imported by bifold so module evaluation does not crash.

export const attestKeyAsync = jest.fn(async () => '')
export const generateKeyAsync = jest.fn(async () => '')
export const generateHardwareAttestedKeyAsync = jest.fn(async () => '')
export const getAttestationCertificateChainAsync = jest.fn(async () => [])
export const isSupported = jest.fn(() => false)
