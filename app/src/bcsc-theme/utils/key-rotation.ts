import { BifoldLogger } from '@bifold/core'
import { Platform } from 'react-native'
import { createNewKeyPair, deleteKey, getAllKeysWithPublicInfo, setToken, TokenType } from 'react-native-bcsc-core'
import BCSCApiClient from '../api/client'
import { modulusInSet, normalizeModulus } from './jwk-modulus'
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
  /** Set whenever the PUT rotated the registration_access_token, even on 'failed'/'rolled_back'. */
  newRegistrationAccessToken?: string
}

/**
 * Deletes every local key except `newKeyId`. Only called once the modulus confirm proves
 * `newKeyId` is registered — pruning earlier would forfeit IAS's last-N merge grace window.
 * Per-key delete failures are non-fatal; never rolls back an already-registered key over one.
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
    return { status: 'rolled_back', newRegistrationAccessToken }
  } catch (err) {
    logger.error(
      `[rotateSigningKey] event=failed_rollback_delete could not delete unregistered key '${newKeyId}': ${describeError(err)}`
    )
    // Surviving new key is still newest-wins active, so it needs the same cache clear as a rotation.
    apiClient.clearTokens()
    return { status: 'failed', newRegistrationAccessToken }
  }
}

/**
 * Rotates the device's signing key: generate, PUT to IAS, confirm via the echoed jwks, and
 * prune superseded keys on confirmed success. See issue #3876 for the full design rationale.
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
    return { status: 'failed' }
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
    return rollback(apiClient, newKey.id, 'failed_put', newRegistrationAccessToken, logger)
  }

  const serverKeyNs = putResult.serverKeyNs ?? []
  const echoIsDecodable = serverKeyNs.some((n) => normalizeModulus(n) !== null)

  if (!echoIsDecodable) {
    logger.warn(
      `[rotateSigningKey] event=rotated_unconfirmed_no_prune server echo was undecodable/empty; keeping new key '${newKey.id}' without pruning previous keys`
    )
    // Can't prove registration either way, but the new key is already newest-wins active, so we
    // keep it rather than roll back blind — and clear the cache since it's now the decryption key.
    apiClient.clearTokens()
    return { status: 'rotated', newRegistrationAccessToken }
  }

  if (!modulusInSet(newKey.n, serverKeyNs)) {
    return rollback(apiClient, newKey.id, 'failed_echo_mismatch', newRegistrationAccessToken, logger)
  }

  logger.info(`[rotateSigningKey] event=confirmed new key '${newKey.id}' present in server jwks`)
  await pruneOtherKeys(newKey.id, logger)

  // Rotation switched the JWE decryption key, so any id_token cached under the old key is now
  // undecryptable; clear directly rather than via TOKENS_REFRESHED, which would re-run system checks.
  apiClient.clearTokens()

  logger.info(`[rotateSigningKey] event=succeeded active='${newKey.id}'`)
  return { status: 'rotated', newRegistrationAccessToken }
}
