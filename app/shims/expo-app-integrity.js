/**
 * Minimal stand-in for `@expo/app-integrity`.
 *
 * The real package calls `requireNativeModule` from `expo-modules-core`, which
 * this app does not install (it would also raise the iOS deployment floor).
 * @bifold/core's attestation hook imports it, so Metro needs something to resolve.
 *
 * Reports attestation as unsupported; every other entry point throws rather than
 * silently returning a bogus attestation.
 */
const unsupported = (name) => async () => {
  throw new Error(`@expo/app-integrity shim: ${name} is not available`)
}

export const isSupported = false
export const isHardwareAttestationSupportedAsync = async () => false
export const generateKeyAsync = unsupported('generateKeyAsync')
export const attestKeyAsync = unsupported('attestKeyAsync')
export const generateAssertionAsync = unsupported('generateAssertionAsync')
export const generateHardwareAttestedKeyAsync = unsupported('generateHardwareAttestedKeyAsync')
export const getAttestationCertificateChainAsync = unsupported('getAttestationCertificateChainAsync')
