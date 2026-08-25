/**
 * Minimal stand-in for `expo-crypto`.
 *
 * Pulling in this package would drag ExpoModulesCore back with it — and with it
 * the iOS 16.4 deployment floor.
 *
 * Backed by @noble/hashes, which credo already depends on. Only the surface that
 * @digitalcredentials/jsonld-signatures uses is implemented; anything else throws
 * rather than silently returning a wrong digest.
 *
 * We don't use oid4vc flows so this code should never be reached anyway.
 */
import { sha256 } from '@noble/hashes/sha2'

export const CryptoDigestAlgorithm = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512',
}

export async function digest(algorithm, data) {
  if (algorithm !== CryptoDigestAlgorithm.SHA256) {
    throw new Error(`expo-crypto shim: unsupported algorithm ${algorithm}`)
  }
  // Callers expect an ArrayBuffer, matching expo-crypto's Crypto.digest.
  const bytes = sha256(data instanceof Uint8Array ? data : new Uint8Array(data))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}
