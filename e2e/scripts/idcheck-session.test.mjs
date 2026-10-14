/**
 * The TOTP arithmetic behind the Entra sign-in: the RFC 6238 code itself, and when a code may be minted
 * — never twice in one window, never on the boundary, and only in the lane's own window parity when the
 * run claims one. No browser and no secret.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { totpCode, totpMintDelayMs } from './idcheck-session.mjs'

const STEP_MS = 30_000
/** RFC 6238 appendix B: the SHA-1 secret "12345678901234567890" in base32. */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

test('totpCode matches the RFC 6238 SHA-1 vectors (last six digits)', () => {
  assert.equal(totpCode(RFC_SECRET, 59_000), '287082')
  assert.equal(totpCode(RFC_SECRET, 1_111_111_109_000), '081804')
  assert.equal(totpCode(RFC_SECRET, 1_234_567_890_000), '005924')
})

test('a fresh window with time to spare needs no wait', () => {
  const now = 100 * STEP_MS + 5_000
  assert.equal(totpMintDelayMs(now, 0, undefined), 0)
})

test('the window that already minted a code is skipped', () => {
  const now = 100 * STEP_MS + 5_000
  const delay = totpMintDelayMs(now, now - 2_000, undefined)
  assert.equal(now + delay, 101 * STEP_MS + 200)
})

test('a code about to roll over waits for the next window', () => {
  const now = 101 * STEP_MS - 1_500
  assert.equal(now + totpMintDelayMs(now, 0, undefined), 101 * STEP_MS + 200)
})

test('a lane with a parity mints only in its own windows', () => {
  const inOdd = 101 * STEP_MS + 5_000
  assert.equal(totpMintDelayMs(inOdd, 0, 'odd'), 0)
  assert.equal(inOdd + totpMintDelayMs(inOdd, 0, 'even'), 102 * STEP_MS + 200)
  const inEven = 102 * STEP_MS + 5_000
  assert.equal(totpMintDelayMs(inEven, 0, 'even'), 0)
  assert.equal(inEven + totpMintDelayMs(inEven, 0, 'odd'), 103 * STEP_MS + 200)
})

test('a replayed window plus a parity can cost two windows, never more', () => {
  const now = 102 * STEP_MS + 5_000 // even window, already used
  assert.equal(now + totpMintDelayMs(now, now - 1_000, 'even'), 104 * STEP_MS + 200)
  assert.equal(now + totpMintDelayMs(now, now - 1_000, 'odd'), 103 * STEP_MS + 200)
})
