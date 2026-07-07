/**
 * Unit tests for the shared RSA-modulus normalization used by both initial-registration
 * confirmation and key recovery (see issue #4166). These pin down the exact cross-platform
 * encoding quirks the app has to tolerate:
 *
 *   - iOS's live DCR path emits standard base64 with the DER leading 0x00 sign byte retained
 *   - Android emits canonical unpadded base64url (Nimbus)
 *   - either side may be padded/unpadded, and legacy registrations may carry other encodings
 *
 * `n` must therefore always be decode-tolerant and byte-compared — never raw-string-compared.
 */

import { decodeBase64Loose, modulusInSet, normalizeModulus } from './jwk-modulus'

// An arbitrary "modulus" whose first byte has its high bit set (0xC0 = 0b1100_0000), i.e.
// exactly the shape that forces DER's ASN.1 INTEGER encoding to prepend a 0x00 sign byte.
const REAL_MODULUS_BYTES = [0xc0, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]
const OTHER_MODULUS_BYTES = [0x01, 0x02, 0x03, 0x04]

const toBase64 = (bytes: number[]) => Buffer.from(bytes).toString('base64')
const toBase64UrlUnpadded = (bytes: number[]) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

describe('jwk-modulus', () => {
  describe('normalizeModulus / modulusInSet — cross-platform encodings', () => {
    it('treats iOS-shaped std-base64-with-leading-0x00 and Android canonical base64url as equal', () => {
      const iosN = toBase64([0x00, ...REAL_MODULUS_BYTES]) // DER retains the leading 0x00
      const androidN = toBase64UrlUnpadded(REAL_MODULUS_BYTES) // Nimbus: canonical, no leading zero

      expect(normalizeModulus(iosN)).not.toBeNull()
      expect(normalizeModulus(iosN)).toBe(normalizeModulus(androidN))
      expect(modulusInSet(iosN, [androidN])).toBe(true)
      expect(modulusInSet(androidN, [iosN])).toBe(true)
    })

    it('treats padded and unpadded encodings of the same modulus as equal', () => {
      const padded = toBase64(OTHER_MODULUS_BYTES) // 4 bytes -> no padding needed at 3-byte boundary
      const twoBytePadded = Buffer.from([0x01, 0x02]).toString('base64') // 'AQI=' — has padding
      const twoByteUnpadded = twoBytePadded.replace(/=+$/, '') // 'AQI'

      expect(normalizeModulus(twoBytePadded)).not.toBeNull()
      expect(normalizeModulus(twoBytePadded)).toBe(normalizeModulus(twoByteUnpadded))
      expect(modulusInSet(twoBytePadded, [twoByteUnpadded])).toBe(true)

      // sanity: padded encodes cleanly on its own too
      expect(normalizeModulus(padded)).not.toBeNull()
    })

    it('reports distinct moduli as not equal', () => {
      const n1 = toBase64(REAL_MODULUS_BYTES)
      const n2 = toBase64(OTHER_MODULUS_BYTES)

      expect(normalizeModulus(n1)).not.toBe(normalizeModulus(n2))
      expect(modulusInSet(n1, [n2])).toBe(false)
    })

    it('strips multiple leading zero bytes', () => {
      const doubleLeadingZero = toBase64([0x00, 0x00, ...OTHER_MODULUS_BYTES])
      const noLeadingZero = toBase64(OTHER_MODULUS_BYTES)

      expect(normalizeModulus(doubleLeadingZero)).toBe(normalizeModulus(noLeadingZero))
    })

    it('keeps the final byte of an all-zero modulus instead of stripping to empty', () => {
      const allZero = toBase64([0x00, 0x00, 0x00])

      expect(normalizeModulus(allZero)).not.toBeNull()
      expect(normalizeModulus(allZero)).toBe(normalizeModulus(toBase64([0x00])))
    })
  })

  describe('undecodable / empty input', () => {
    it.each([undefined, '', 'not-valid-base64!!!', '===='])('normalizeModulus(%p) -> null', (input) => {
      expect(normalizeModulus(input)).toBeNull()
    })

    it('modulusInSet returns false (never throws) when either side is undecodable', () => {
      expect(modulusInSet(undefined, [toBase64(REAL_MODULUS_BYTES)])).toBe(false)
      expect(modulusInSet('garbage!!!', [toBase64(REAL_MODULUS_BYTES)])).toBe(false)
      expect(modulusInSet(toBase64(REAL_MODULUS_BYTES), ['garbage!!!', undefined])).toBe(false)
      expect(modulusInSet(undefined, [])).toBe(false)
    })
  })

  describe('decodeBase64Loose', () => {
    it('decodes standard base64 and base64url equivalently', () => {
      const stdEncoded = toBase64(REAL_MODULUS_BYTES)
      const urlEncoded = toBase64UrlUnpadded(REAL_MODULUS_BYTES)

      expect(Array.from(decodeBase64Loose(stdEncoded) ?? [])).toEqual(REAL_MODULUS_BYTES)
      expect(Array.from(decodeBase64Loose(urlEncoded) ?? [])).toEqual(REAL_MODULUS_BYTES)
    })

    it('returns null for falsy or malformed input', () => {
      expect(decodeBase64Loose(undefined)).toBeNull()
      expect(decodeBase64Loose('')).toBeNull()
      expect(decodeBase64Loose('a')).toBeNull() // length % 4 === 1 is never valid
      expect(decodeBase64Loose('not valid base64 at all!!!')).toBeNull()
    })
  })
})
