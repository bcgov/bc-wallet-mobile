/**
 * Shared RSA-modulus normalization for BCSC signing-key confirmation (initial registration)
 * and recovery (matching local keys against the server's jwks).
 *
 * The BCSC identity server echoes `n` verbatim and never canonicalizes it: iOS's live DCR
 * path emits standard base64 with the DER leading 0x00 sign byte retained
 * (`modulus.base64EncodedString()`), Android emits canonical unsigned base64url (Nimbus).
 * Legacy registrations may carry other encodings still. Comparing `n` as raw strings is
 * therefore unsafe — every helper here decodes tolerantly (base64 AND base64url, padded or
 * not), strips any leading zero byte(s) introduced by DER's signed-INTEGER encoding, and
 * compares the remaining bytes. `e` is constant (AQAB) and is never part of the comparison.
 *
 * Never throws: undecodable input normalizes to `null`, and every comparison here treats
 * `null` as "no match" rather than surfacing a parse error — a malformed `n` from either side
 * should degrade to a cautious non-match, not an exception that could crash a registration or
 * recovery flow.
 *
 * IMPORTANT: this file must never use the `'base64url'` Buffer encoding token. The `Buffer`
 * polyfill used on-device (the `buffer` npm package, wired up as `global.Buffer` in
 * app/index.js) is v5.7.1, which does not implement `'base64url'` as an encoding — only Jest
 * (running on real Node, which has supported it since Node 15) would accept it, so a test
 * could pass here while the on-device path silently breaks. Base64url is therefore always
 * hand-rolled from standard base64.
 */

const BASE64_CHARS_RE = /^[A-Za-z0-9+/]*=*$/

/**
 * Decode a base64 OR base64url string (padded or unpadded) into raw bytes.
 * Returns `null` for anything that isn't clean base64/base64url — never throws.
 */
export function decodeBase64Loose(value?: string): Uint8Array | null {
  if (!value) {
    return null
  }

  // base64url -> standard base64 alphabet
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')

  const remainder = base64.length % 4
  if (remainder === 1) {
    // Not a valid base64/base64url length under any padding scheme.
    return null
  }
  const padded = remainder === 0 ? base64 : base64 + '='.repeat(4 - remainder)

  if (!BASE64_CHARS_RE.test(padded)) {
    // Reject up front — Buffer.from(..., 'base64') silently ignores invalid characters
    // rather than throwing, which would otherwise let garbage input decode "successfully".
    return null
  }

  const bytes = Buffer.from(padded, 'base64')
  if (bytes.length === 0) {
    // Non-empty input that decoded to nothing meaningful (e.g. all-padding).
    return null
  }

  return bytes
}

/** Re-encode raw bytes as unpadded base64url without relying on Buffer's 'base64url'
 * encoding (unsupported by the on-device polyfill — see file header). */
function toBase64UrlUnpadded(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Normalize an RSA modulus (`n`) for cross-platform/cross-encoding comparison: decode
 * (base64 or base64url, padded or not), strip any leading 0x00 byte(s) — DER's ASN.1 INTEGER
 * sign-padding, possibly more than one after repeated encode/decode round trips — and
 * re-encode as unpadded base64url. Returns `null` for undecodable/empty input.
 */
export function normalizeModulus(n?: string): string | null {
  const bytes = decodeBase64Loose(n)
  if (!bytes || bytes.length === 0) {
    return null
  }

  let start = 0
  // Guard `start < bytes.length - 1` so an all-zero buffer keeps its final byte rather than
  // stripping down to an empty (and therefore falsely "undecodable") result.
  while (start < bytes.length - 1 && bytes[start] === 0x00) {
    start++
  }

  return toBase64UrlUnpadded(bytes.subarray(start))
}

/**
 * True if `n` (in any supported encoding) normalizes to the same modulus as any entry in
 * `set`. Undecodable input on either side is treated as no-match, never an error.
 */
export function modulusInSet(n: string | undefined, set: Array<string | undefined>): boolean {
  const normalized = normalizeModulus(n)
  if (!normalized) {
    return false
  }
  return set.some((candidate) => normalizeModulus(candidate) === normalized)
}
