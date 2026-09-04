import { BifoldLogger } from '@bifold/core'
import { Platform } from 'react-native'
import { createNewKeyPair, deleteKey, getAllKeysWithPublicInfo, setToken, TokenType } from 'react-native-bcsc-core'
import BCSCApiClient from '../api/client'
import { confirmModulusRegistered, modulusInSet } from './jwk-modulus'
import { describeError, reRegisterNewestKey } from './key-recovery'

// NIST SP 800-57 Pt 1 Rev 5 §5.3 puts signing-key cryptoperiods at 1-3 years; 365 days keeps at
// least one rotation/year and is tunable if policy needs a tighter cadence.
export const KEY_ROTATION_MAX_AGE_DAYS = 365

// Avoids per-launch generate/PUT/delete churn during a persistent outage, well inside the ceiling.
export const KEY_ROTATION_RETRY_BACKOFF_DAYS = 7

const MS_PER_DAY = 24 * 60 * 60 * 1000

// client_id is a stable per-device identifier and these logs ship to Loki in a public repo.
const redactClientId = (clientId: string): string => (clientId.length <= 8 ? clientId : `…${clientId.slice(-8)}`)

/**
 * `created` is SECONDS on iOS but MILLISECONDS on Android (see `KeyPublicInfo.created` in
 * react-native-bcsc-core) — un-normalized, every iOS key reads as ~55 years old.
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
  /** True only when the server's echoed jwks proved the new key registered — never inferred from a 2xx alone. */
  confirmed: boolean
  /** Set whenever the PUT rotated the registration_access_token, even on 'failed'/'rolled_back'. */
  newRegistrationAccessToken?: string
}

/**
 * Deletes every local key except `newKeyId` and one other, on a confirmed rotation (#4601): the
 * newest whose modulus is in `serverKeyNs`, or — if exactly one other key exists — that one.
 * With two-or-more unmatched candidates the choice is ambiguous, so nothing is pruned this round.
 */
async function pruneSupersededKeys(
  newKeyId: string,
  serverKeyNs: Array<string | undefined>,
  logger: BifoldLogger
): Promise<void> {
  let keys: Array<{ id: string; n?: string; created?: number }>
  try {
    keys = await getAllKeysWithPublicInfo()
  } catch (err) {
    logger.error(
      `[rotateSigningKey] event=failed_prune_enumerate could not enumerate local keys to prune: ${describeError(err)}`
    )
    return
  }

  // The newest OTHER local key isn't necessarily the registered one (#4601) — prefer the newest
  // still present in the server's jwks; fall back to newest-by-created if none match (e.g. IAS's
  // last-N merge already aged every older key out).
  const others = keys.filter((k) => k.id !== newKeyId).sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
  const match = others.find((k) => modulusInSet(k.n, serverKeyNs))
  if (!match && others.length > 1) {
    // Never delete on "can't tell", only on "confirmed not present" (see key-recovery.ts) — with
    // more than one unmatched candidate we can't tell which is registered, so prune nothing.
    logger.warn(
      `[rotateSigningKey] event=prune_skipped_ambiguous none of ${others.length} other local keys matched the server's jwks; keeping all until a later rotation resolves it`
    )
    return
  }
  const keep = match ?? others[0]
  const keepIds = new Set([newKeyId, keep?.id].filter((id): id is string => id !== undefined))

  let pruned = 0
  let failures = 0
  for (const key of keys) {
    if (keepIds.has(key.id)) {
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
 * Deletes the unregistered new key so the previous key becomes active again. If the delete
 * itself fails, the orphan survives as newest-wins active, so the token cache is cleared and
 * `performKeyRecovery` (#4178) heals the orphan later once its missing-from-jwks state is detected.
 */
async function rollback(
  apiClient: BCSCApiClient,
  newKeyId: string,
  eventLabel: string,
  newRegistrationAccessToken: string | undefined,
  logger: BifoldLogger
): Promise<KeyRotationResult> {
  logger.warn(`[rotateSigningKey] event=${eventLabel} rolling back unregistered key '${newKeyId}'`)
  try {
    await deleteKey(newKeyId)
    logger.info(`[rotateSigningKey] event=rolled_back deleted unregistered key '${newKeyId}'`)
    return { status: 'rolled_back', confirmed: false, newRegistrationAccessToken }
  } catch (err) {
    logger.error(
      `[rotateSigningKey] event=failed_rollback_delete could not delete unregistered key '${newKeyId}': ${describeError(err)}`
    )
    // Surviving new key is still newest-wins active, so it needs the same cache clear as a rotation.
    apiClient.clearTokens()
    return { status: 'failed', confirmed: false, newRegistrationAccessToken }
  }
}

/**
 * Rotates the device's signing key: generate, PUT to IAS, confirm via the echoed jwks, and
 * prune the superseded key on confirmed success, so the previous key survives one full
 * rotation cycle (#4601). See issue #3876 for the full design rationale.
 */
export async function rotateSigningKey(
  apiClient: BCSCApiClient,
  clientId: string,
  registrationAccessToken: string,
  logger: BifoldLogger
): Promise<KeyRotationResult> {
  logger.info(`[rotateSigningKey] event=triggered client_id=${redactClientId(clientId)}`)

  const newKey = await createNewKeyPair().catch((err) => {
    logger.error(`[rotateSigningKey] event=failed_generate could not generate a new key: ${describeError(err)}`)
    return null
  })

  if (!newKey) {
    return { status: 'failed', confirmed: false }
  }

  logger.info(`[rotateSigningKey] generated new key '${newKey.id}'; re-registering with server`)

  const putResult = await reRegisterNewestKey(apiClient, clientId, registrationAccessToken, logger)

  // RFC 7592 lets the PUT rotate (and revoke the old) reg token regardless of outcome below;
  // persist it before confirm/rollback so a failed rotation never strands the device's registration.
  let newRegistrationAccessToken: string | undefined
  if (putResult.newRegistrationAccessToken) {
    newRegistrationAccessToken = putResult.newRegistrationAccessToken
    try {
      await setToken(TokenType.Registration, putResult.newRegistrationAccessToken)
      logger.info('[rotateSigningKey] persisted rotated registration_access_token from PUT response')
    } catch (err) {
      // Still returned to the caller below — a best-effort fallback syncs it into the in-memory store.
      logger.error(`[rotateSigningKey] event=failed_persist_reg_token ${describeError(err)}`)
    }
  }

  if (!putResult.success) {
    // A network drop after the server accepted the PUT looks identical to a rejection here; rolling
    // back is still the conservative choice since IAS's last-N merge and #4178 recovery cover it.
    return rollback(apiClient, newKey.id, 'failed_put', newRegistrationAccessToken, logger)
  }

  const serverKeyNs = putResult.serverKeyNs ?? []
  const verdict = confirmModulusRegistered(newKey.n, serverKeyNs)

  if (verdict === 'unknown') {
    logger.warn(
      `[rotateSigningKey] event=rotated_unconfirmed_no_prune sent or echoed modulus undecodable/empty; keeping new key '${newKey.id}' without pruning previous keys`
    )
    // Can't prove registration either way, but the new key is already newest-wins active, so we
    // keep it rather than roll back blind — and clear the cache since it's now the decryption key.
    apiClient.clearTokens()
    return { status: 'rotated', confirmed: false, newRegistrationAccessToken }
  }

  if (verdict === 'mismatch') {
    return rollback(apiClient, newKey.id, 'failed_echo_mismatch', newRegistrationAccessToken, logger)
  }

  logger.info(`[rotateSigningKey] event=confirmed new key '${newKey.id}' present in server jwks`)
  await pruneSupersededKeys(newKey.id, serverKeyNs, logger)

  // Rotation switched the JWE decryption key, so any id_token cached under the old key is now
  // undecryptable; clear directly rather than via TOKENS_REFRESHED, which would re-run system checks.
  apiClient.clearTokens()

  logger.info(`[rotateSigningKey] event=succeeded active='${newKey.id}'`)
  return { status: 'rotated', confirmed: true, newRegistrationAccessToken }
}
