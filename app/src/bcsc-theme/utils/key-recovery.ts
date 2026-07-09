import { BifoldLogger } from '@bifold/core'
import {
  deleteKey,
  getAccount,
  getAllKeys,
  getAllKeysWithPublicInfo,
  getDynamicClientRegistrationBody,
  setActiveKeyAlias,
} from 'react-native-bcsc-core'
import BCSCApiClient from '../api/client'
import { normalizeModulus } from './jwk-modulus'
import { getNotificationTokens } from './push-notification-tokens'

/**
 * Short fingerprint of a normalized modulus for correlating local vs server keys in remote
 * logs, without dumping the full (public but long) key material. Returns 'none' for a null
 * modulus. This is a diagnostic aid only — matching is always done on the full modulus bytes.
 */
const modulusFingerprint = (n: string | null): string => {
  if (!n) {
    return 'none'
  }
  return n.length <= 16 ? n : `${n.slice(0, 8)}...${n.slice(-8)} (len=${n.length})`
}

/**
 * Format a caught error for logging, surfacing the native error code (e.g. E_KEY_NOT_FOUND) when
 * present. Handles plain-object rejections ({ code, message }) as well as Error instances, so the
 * code is never lost to an "[object Object]" string.
 */
const describeError = (err: unknown): string => {
  if (err && typeof err === 'object') {
    const { code, message } = err as { code?: unknown; message?: unknown }
    const parts = [code, message].filter((part): part is string => typeof part === 'string')
    if (parts.length > 0) {
      return parts.join(': ')
    }
  }
  return String(err)
}

interface ServerJwk {
  /** No longer used for matching (kid drifts across migrations) — logged for diagnostics only. */
  kid?: string
  kty?: string
  n?: string
}

interface ServerClientRegistrationView {
  client_id: string
  /** RFC 7592: the reg token MAY rotate on GET/PUT. Surfaced so the caller can persist it. */
  registration_access_token?: string
  jwks?: { keys?: ServerJwk[] }
}

export type KeyRecoveryStatus = 'recovered' | 'no_match' | 'failed'

export type KeyRecoveryResult = {
  status: KeyRecoveryStatus
  /** Present when the GET response carried a rotated registration_access_token, regardless
   * of `status` — the caller should persist it even on a 'failed' outcome. */
  newRegistrationAccessToken?: string
}

/**
 * Probe the BCSC server for its current view of registered signing keys and realign local key
 * state to match. Called (from `useSecureActions.hydrateSecureState`) when a startup token
 * refresh throws, which is overwhelmingly caused by the wallet signing with a key the server
 * no longer recognises (e.g. post-v3-reset, post-keystore-restore, or an upgrade from a
 * previous version that left multiple keys in the keychain/keystore).
 *
 * Matching is done on RSA modulus BYTES, never kid (see jwk-modulus.ts): device kids have
 * drifted across migrations, and the server verifies a signature by trying ALL stored keys,
 * so the modulus is what actually determines validity. A kid-string match can both activate
 * the wrong key AND prune the right one (see issue #4166).
 *
 * Steps:
 *  1. GET /device/register/{client_id} with the registration_access_token to read
 *     jwks.keys[].n (the server's source of truth). The GET may return MULTIPLE keys (the
 *     server merges recent registration versions) — this is a MEMBERSHIP test.
 *  2. Enumerate every local key (with its public RSA components) via getAllKeysWithPublicInfo().
 *  3. Intersect by normalized modulus. If a local key matches, mark it active via
 *     setActiveKeyAlias() so the next sign uses it.
 *  4. Prune local keys whose modulus is confirmed NOT in the server set (recent-previous
 *     versions stay). Guarded by `serverModuli.length >= 1` so an unexpectedly empty/
 *     undecodable jwks response never wipes the device; this loop additionally skips
 *     `matched.id` (never a prune target) and any local key whose OWN modulus fails to decode
 *     (an unknown modulus is not a confirmed-absent one — never delete on "can't tell", only on
 *     "confirmed not present"). The native delete has its own last-line-of-defence guard that
 *     refuses to remove the final remaining alias.
 *  5. HARD post-prune gate: re-run getAllKeys() and require the newest-by-created entry to be
 *     `matched.id`. On iOS, setActiveKeyAlias is verify-only (activation is prune-by-
 *     elimination), so a swallowed prune failure of a newer unmatched key would otherwise let
 *     the app "succeed" while still signing with the bad key — this gate turns that into a
 *     `'failed'` result instead of a silently-wrong success.
 *
 * @returns a {@link KeyRecoveryResult}. `newRegistrationAccessToken`, when present, should be
 *   persisted by the caller regardless of `status`.
 */
export async function performKeyRecovery(
  apiClient: BCSCApiClient,
  clientId: string,
  registrationAccessToken: string,
  logger: BifoldLogger
): Promise<KeyRecoveryResult> {
  let newRegistrationAccessToken: string | undefined
  try {
    logger.info(
      `[performKeyRecovery] event=triggered client_id=${clientId} — probing server for its registered signing keys`
    )
    const { data } = await apiClient.get<ServerClientRegistrationView>(
      `${apiClient.endpoints.registration}/${clientId}`,
      {
        skipBearerAuth: true,
        // Silent background self-heal: a probe failure (e.g. a dead/revoked reg token → 401/403)
        // must NOT trigger the client's global onError handler (which surfaces user-facing errors).
        // It falls through to our own catch → status 'failed', and the caller leaves tokens stale.
        skipOnErrorHandler: true,
        headers: { Authorization: `Bearer ${registrationAccessToken}` },
      }
    )

    newRegistrationAccessToken = data?.registration_access_token

    const serverKeys = data?.jwks?.keys ?? []
    const serverNs = serverKeys.map((k) => k?.n)
    const serverKidsForLog = JSON.stringify(serverKeys.map((k) => k?.kid))
    const serverModuli = serverNs.map((n) => normalizeModulus(n)).filter((n): n is string => n !== null)

    logger.info(
      `[performKeyRecovery] server returned ${serverKeys.length} key(s), ${serverModuli.length} with a decodable modulus [${serverModuli
        .map(modulusFingerprint)
        .join(', ')}] (serverKids=${serverKidsForLog})`
    )

    if (serverModuli.length === 0) {
      logger.warn(
        `[performKeyRecovery] event=failed_empty_jwks server returned no decodable jwks moduli; refusing to prune or reassign (serverKids=${serverKidsForLog})`
      )
      return { status: 'failed', newRegistrationAccessToken }
    }

    const localKeys = await getAllKeysWithPublicInfo()
    const localIds = localKeys.map((k) => k.id)

    logger.info(
      `[performKeyRecovery] checking ${localKeys.length} local key(s) ${JSON.stringify(localIds)} against the server set for a modulus match`
    )

    // Evaluate each local key explicitly (rather than a silent filter) so remote logs record
    // which key was checked and whether its modulus matched — the crux of diagnosing a desync.
    // Membership is tested against the SAME pre-normalized `serverModuli` the prune loop uses
    // below, so the two can never disagree about what counts as "in the server set".
    const matches: typeof localKeys = []
    for (const k of localKeys) {
      const n = normalizeModulus(k.n)
      const isMatch = n !== null && serverModuli.includes(n)
      const outcome = n === null ? 'skipped (undecodable modulus)' : isMatch ? 'MATCH' : 'no match'
      logger.info(`[performKeyRecovery] checking local key '${k.id}' (modulus=${modulusFingerprint(n)}): ${outcome}`)
      if (isMatch) {
        matches.push(k)
      }
    }

    // Newest-created wins if more than one local key matches (shouldn't normally happen, but
    // stay deterministic if it does).
    const matched = matches.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0]

    if (!matched) {
      logger.warn(
        `[performKeyRecovery] event=failed_no_match no local key modulus matches server jwks (local=${JSON.stringify(localIds)}, serverKids=${serverKidsForLog})`
      )
      return { status: 'no_match', newRegistrationAccessToken }
    }

    logger.info(`[performKeyRecovery] activating matched key '${matched.id}' as the signing key (setActiveKeyAlias)`)
    await setActiveKeyAlias(matched.id)

    let prunedCount = 0
    let pruneFailures = 0
    for (const k of localKeys) {
      if (k.id === matched.id) {
        continue
      }
      const n = normalizeModulus(k.n)
      if (n === null) {
        // Can't decode this local key's OWN modulus, so we can't confirm it's absent from the
        // server set — an unknown modulus is not the same as a confirmed-absent one.
        // getAllKeysWithPublicInfo() is contracted (both platforms) to skip-and-log any alias it
        // can't derive RSA components for, so this shouldn't happen in practice; if it ever does,
        // never delete on "can't tell" — worst case a stale key lingers one more recovery pass.
        logger.warn(`[performKeyRecovery] local key '${k.id}' has an undecodable modulus; skipping (not pruning)`)
        continue
      }
      if (serverModuli.includes(n)) {
        // Still recognised by the server (e.g. a recent-previous registration version) — keep.
        continue
      }
      try {
        logger.info(`[performKeyRecovery] pruning local key '${k.id}' — its modulus is not in the server set`)
        await deleteKey(k.id)
        prunedCount++
        logger.info(`[performKeyRecovery] pruned local key '${k.id}'`)
      } catch (err) {
        pruneFailures++
        logger.warn(`[performKeyRecovery] failed to prune '${k.id}': ${describeError(err)}`)
      }
    }

    // Hard post-prune gate (see doc comment above). Unlike per-key prune failures logged just
    // above — which are tolerated as long as they don't affect who ends up "newest" — this
    // check is the authoritative success/failure signal, so a failure to even verify counts
    // as 'failed' too, not a swallowed warning.
    try {
      const post = await getAllKeys()
      const newest = post.slice().sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0]
      if (!newest || newest.id !== matched.id) {
        logger.error(
          `[performKeyRecovery] event=post_prune_active_mismatch expected newest='${matched.id}' but got '${newest?.id}' (remaining=${JSON.stringify(post.map((k) => k.id))})`
        )
        return { status: 'failed', newRegistrationAccessToken }
      }
    } catch (verifyErr) {
      logger.error(
        `[performKeyRecovery] event=post_prune_verification_failed could not confirm activation: ${describeError(verifyErr)}`
      )
      return { status: 'failed', newRegistrationAccessToken }
    }

    logger.info(
      `[performKeyRecovery] event=succeeded active='${matched.id}' pruned=${prunedCount} prune_failures=${pruneFailures}`
    )
    return { status: 'recovered', newRegistrationAccessToken }
  } catch (error) {
    logger.error(`[performKeyRecovery] event=failed_probe recovery probe failed: ${describeError(error)}`)
    return { status: 'failed', newRegistrationAccessToken }
  }
}

export type ReRegisterResult = {
  success: boolean
  /** Rotated registration_access_token from the PUT response, if the server issued one. */
  newRegistrationAccessToken?: string
}

/**
 * No-match fallback for key recovery: the server's jwks doesn't contain any local key's
 * modulus (e.g. the device's local keystore was restored independently of the server-side
 * registration). Rather than forcing the user through a full card re-setup, PUT a fresh
 * registration for the current newest local key using the existing registration_access_token
 * — the same request shape as `useRegistrationApi.updateRegistration`'s PUT, rebuilt here
 * without the hook since this runs from the key-recovery path, outside React.
 *
 * Deliberately does NOT round-trip GET metadata into the PUT (only jwks + client_id are
 * echoed by the server; scopes/grants/etc. are server policy) and NEVER prunes local keys —
 * an unattended re-registration is not the place to be deleting key material. If this
 * succeeds, the server now recognises the (unchanged) newest local key; the *next* recovery
 * pass's ordinary membership-prune will clean up any leftovers.
 */
export async function reRegisterNewestKey(
  apiClient: BCSCApiClient,
  clientId: string,
  registrationAccessToken: string,
  logger: BifoldLogger
): Promise<ReRegisterResult> {
  try {
    // account (local read) and notification tokens (Firebase round trip) are independent —
    // fetch concurrently rather than serializing an unrelated native/network wait.
    const [account, { fcmDeviceToken, deviceToken }] = await Promise.all([getAccount(), getNotificationTokens(logger)])
    const body = await getDynamicClientRegistrationBody(fcmDeviceToken, deviceToken, null, account?.nickname)

    if (!body) {
      logger.error('[reRegisterNewestKey] event=failed native DCR body was null')
      return { success: false }
    }

    const payload = JSON.parse(body) as Record<string, unknown>
    payload.client_id = clientId
    // Mirrors the scope used by useAuthorizationApi.tsx's IAS_SCOPE and
    // useRegistrationApi.tsx's updateRegistration — keep all three in sync if it ever changes.
    payload.scope = 'openid profile email address offline_access'

    const { data } = await apiClient.put<{ registration_access_token?: string }>(
      `${apiClient.endpoints.registration}/${clientId}`,
      payload,
      {
        skipBearerAuth: true,
        // Same as the recovery GET: an unattended re-registration must fail silently (→ our catch
        // → { success: false }), never surface a user-facing error via the global onError handler.
        skipOnErrorHandler: true,
        headers: { Authorization: `Bearer ${registrationAccessToken}` },
      }
    )

    logger.info('[reRegisterNewestKey] event=succeeded re-registered newest local key with server')
    return { success: true, newRegistrationAccessToken: data?.registration_access_token }
  } catch (error) {
    logger.error(`[reRegisterNewestKey] event=failed ${describeError(error)}`)
    return { success: false }
  }
}
