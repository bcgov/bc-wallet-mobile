import { BifoldLogger } from '@bifold/core'
import { Platform } from 'react-native'
import { createNewKeyPair, deleteKey, getAllKeysWithPublicInfo, setToken, TokenType } from 'react-native-bcsc-core'
import BCSCApiClient from '../api/client'
import { modulusInSet, normalizeModulus } from './jwk-modulus'
import { describeError, reRegisterNewestKey } from './key-recovery'

/**
 * Maximum age (in days) a signing key may reach before rotation is due. NIST SP 800-57 Part 1
 * Rev 5 §5.3 Table 1 puts private-signing-key cryptoperiods at roughly 1-3 years; 365 days sits
 * inside that guidance while still giving long-tenure users at least one rotation per year.
 * Tunable — one constant to change if security policy asks for a tighter cadence.
 */
export const KEY_ROTATION_MAX_AGE_DAYS = 365

/**
 * Minimum number of days between rotation attempts after a failure, to avoid per-launch
 * generate/PUT/delete churn (and keystore alias-number inflation) during a persistent outage,
 * while still retrying well inside the 365-day ceiling.
 */
export const KEY_ROTATION_RETRY_BACKOFF_DAYS = 7

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Normalize a native key `created` timestamp to epoch milliseconds. Platform units differ:
 * iOS reports SECONDS since epoch (`Date.timeIntervalSince1970`), Android reports MILLISECONDS
 * (`System.currentTimeMillis()`-based) — see `KeyPublicInfo.created`'s doc comment in
 * react-native-bcsc-core. A naive `Date.now() - created` on iOS would read every key as ~55
 * years old and rotate on every launch.
 *
 * Returns `null` for missing input so callers can treat "can't tell the age" (skip, don't
 * rotate) distinctly from "this key is old" (rotate).
 */
export function keyCreatedAtMs(created?: number): number | null {
  if (created === undefined || created === null) {
    return null
  }
  return Platform.OS === 'ios' ? created * 1000 : created
}

/** Age of a key in days (fractional), given its normalized `created` (ms). */
export function keyAgeDays(createdAtMs: number, nowMs: number = Date.now()): number {
  return (nowMs - createdAtMs) / MS_PER_DAY
}

export type KeyRotationStatus = 'rotated' | 'rolled_back' | 'failed'

export type KeyRotationResult = {
  status: KeyRotationStatus
  /** Present when the PUT response carried a rotated registration_access_token, regardless of
   * `status` — the caller should persist/sync it even on a 'failed' or 'rolled_back' outcome. */
  newRegistrationAccessToken?: string
}

/**
 * Delete every local key alias except `newKeyId`. Only ever called after the modulus-bytes
 * confirm in {@link rotateSigningKey} has affirmatively proven `newKeyId` is registered with
 * the server — that confirm IS the "successfully registered" gate. Pruning here forfeits the
 * IAS last-N multi-key merge grace window that key-recovery's own membership-prune otherwise
 * relies on as a safety net; that trade is only safe because the confirm above already proved
 * the new key is live server-side.
 *
 * Prune failures are non-fatal and logged distinctly per key: the new key is already
 * registered and is newest-wins active on both platforms regardless of whether an old alias
 * is successfully deleted, so a lingering old alias is cosmetic, not a correctness problem.
 * Never rolls back a successfully-registered key because of a prune failure.
 */
async function pruneOtherKeys(newKeyId: string, logger: BifoldLogger): Promise<void> {
  let keys: Array<{ id: string }>
  try {
    keys = await getAllKeysWithPublicInfo()
  } catch (err) {
    logger.error(
      `[rotateSigningKey] event=failed_prune_enumerate could not enumerate local keys to prune: ${describeError(err)}`
    )
    return
  }

  let pruned = 0
  let failures = 0
  for (const key of keys) {
    if (key.id === newKeyId) {
      continue
    }
    try {
      logger.info(`[rotateSigningKey] pruning previous key '${key.id}' (superseded by '${newKeyId}')`)
      await deleteKey(key.id)
      pruned++
    } catch (err) {
      failures++
      logger.warn(
        `[rotateSigningKey] event=failed_prune_delete could not prune old key '${key.id}': ${describeError(err)}`
      )
    }
  }
  logger.info(`[rotateSigningKey] event=pruned active='${newKeyId}' pruned=${pruned} prune_failures=${failures}`)
}

/**
 * Roll back an unregistered new key: delete it so the previous key (still present) becomes
 * newest-wins active again on both platforms. `deleteKey`'s last-key guard
 * (`E_KEY_DELETE_REFUSED_LAST`) cannot fire here because the previous key always still exists.
 *
 * If the delete itself fails, the orphan is left behind — the next startup's
 * `performKeyRecovery` (#4178) heals it: the orphan's modulus won't be in the server's jwks
 * (it was never successfully registered), so recovery's own membership-prune removes it once
 * a refresh-token failure triggers that flow.
 */
async function rollback(
  newKeyId: string,
  eventLabel: string,
  newRegistrationAccessToken: string | undefined,
  logger: BifoldLogger
): Promise<KeyRotationResult> {
  logger.warn(`[rotateSigningKey] event=${eventLabel} rolling back unregistered key '${newKeyId}'`)
  try {
    await deleteKey(newKeyId)
    logger.info(`[rotateSigningKey] event=rolled_back deleted unregistered key '${newKeyId}'`)
    return { status: 'rolled_back', newRegistrationAccessToken }
  } catch (err) {
    logger.error(
      `[rotateSigningKey] event=failed_rollback_delete could not delete unregistered key '${newKeyId}': ${describeError(err)}`
    )
    return { status: 'failed', newRegistrationAccessToken }
  }
}

/**
 * Rotate the device's signing key: generate a new keypair, PUT it to IAS as the newest
 * registered key, confirm the server actually stored it, and prune superseded keys on success.
 *
 * Sequence (see issue #3876 for the full design rationale):
 *  1. `createNewKeyPair()` — generates and (structurally, on iOS; via `createdAt` stamping on
 *     Android) immediately activates a new signing key. A failure here never reaches the PUT,
 *     so there's nothing to roll back.
 *  2. `reRegisterNewestKey()` — builds the DCR body (newest local key = the one just generated)
 *     and PUTs it with the existing registration_access_token.
 *  3. If the PUT response carried a rotated registration_access_token, persist it via native
 *     `setToken` IMMEDIATELY — before confirm, before rollback, unconditionally. RFC 7592
 *     allows the server to rotate (and revoke the old) reg token on PUT; dropping a rotated
 *     token would permanently strand the device's ability to update its registration, which is
 *     strictly worse than a failed rotation. A failed PUT cannot have rotated the token
 *     server-side, so this ordering is always safe.
 *  4. PUT failed → roll back (delete the new key) → 'rolled_back'.
 *  5. PUT succeeded → confirm the new key's modulus is present in the echoed jwks
 *     (`modulusInSet`, never kid, never raw-string compare — see jwk-modulus.ts):
 *       - confirmed absent (echo decodable but doesn't contain it) → roll back → 'rolled_back'.
 *       - echo undecodable/empty → cannot prove registration either way; keep the new key
 *         (server stores jwks verbatim, so it likely IS registered), warn, and deliberately do
 *         NOT prune — pruning blind here could strand the device on an unconfirmed key. Logged
 *         distinctly as `event=rotated_unconfirmed_no_prune`. Returns 'rotated'.
 *       - confirmed present → prune every other local key (see {@link pruneOtherKeys}) → 'rotated'.
 *     Both 'rotated' exits call `apiClient.clearTokens()` — rotation switches the JWE
 *     decryption key, so any id_token cached before rotation ran is no longer decryptable and
 *     must be dropped so the next read re-mints it under the new key. Never done on
 *     'rolled_back' (the old key is newest again, cache still valid) or 'failed'.
 *
 * Deliberately omits the original stub's "check new keys work" step: an active post-rotation
 * token refresh would consume the refresh token outside the token service. The modulus confirm
 * plus the server's last-N merge window (old key keeps authenticating until pruned) plus the
 * #4178 recovery backstop cover it instead.
 */
export async function rotateSigningKey(
  apiClient: BCSCApiClient,
  clientId: string,
  registrationAccessToken: string,
  logger: BifoldLogger
): Promise<KeyRotationResult> {
  logger.info(`[rotateSigningKey] event=triggered client_id=${clientId}`)

  const newKey = await createNewKeyPair().catch((err) => {
    logger.error(`[rotateSigningKey] event=failed_generate could not generate a new key: ${describeError(err)}`)
    return null
  })

  if (!newKey) {
    return { status: 'failed' }
  }

  logger.info(`[rotateSigningKey] generated new key '${newKey.id}'; re-registering with server`)

  const putResult = await reRegisterNewestKey(apiClient, clientId, registrationAccessToken, logger)

  let newRegistrationAccessToken: string | undefined
  if (putResult.newRegistrationAccessToken) {
    newRegistrationAccessToken = putResult.newRegistrationAccessToken
    try {
      await setToken(TokenType.Registration, putResult.newRegistrationAccessToken)
      logger.info('[rotateSigningKey] persisted rotated registration_access_token from PUT response')
    } catch (err) {
      // Still surfaced to the caller (below) even though the native write failed — the
      // system-check caller also syncs it into the in-memory store, a best-effort fallback.
      logger.error(`[rotateSigningKey] event=failed_persist_reg_token ${describeError(err)}`)
    }
  }

  if (!putResult.success) {
    return rollback(newKey.id, 'failed_put', newRegistrationAccessToken, logger)
  }

  const serverKeyNs = putResult.serverKeyNs ?? []
  const echoIsDecodable = serverKeyNs.some((n) => normalizeModulus(n) !== null)

  if (!echoIsDecodable) {
    logger.warn(
      `[rotateSigningKey] event=rotated_unconfirmed_no_prune server echo was undecodable/empty; keeping new key '${newKey.id}' without pruning previous keys`
    )
    // The new key is newest-wins active regardless of whether we could confirm registration, so
    // any cached id_token (a JWE encrypted to the OLD public key) can no longer be decrypted —
    // see the clearTokens() comment below.
    apiClient.clearTokens()
    return { status: 'rotated', newRegistrationAccessToken }
  }

  if (!modulusInSet(newKey.n, serverKeyNs)) {
    return rollback(newKey.id, 'failed_echo_mismatch', newRegistrationAccessToken, logger)
  }

  logger.info(`[rotateSigningKey] event=confirmed new key '${newKey.id}' present in server jwks`)
  await pruneOtherKeys(newKey.id, logger)

  // Rotation just switched the device's JWE DECRYPTION key (signing and decryption use the
  // same newest-wins key on both platforms). Any id_token already cached in `apiClient.tokens`
  // was encrypted by IAS to the OLD public key and can no longer be decrypted by decodePayload
  // (which decrypts with the newest key only — no try-all-keys fallback on either platform).
  // Clear the cache directly (never emit TOKENS_REFRESHED for this — that listener re-runs the
  // system checks, a loop hazard) so the next read re-mints tokens under the new key.
  apiClient.clearTokens()

  logger.info(`[rotateSigningKey] event=succeeded active='${newKey.id}'`)
  return { status: 'rotated', newRegistrationAccessToken }
}
