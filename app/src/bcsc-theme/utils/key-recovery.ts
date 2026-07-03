import { isAxiosAppError } from '@/errors/appError'
import { BifoldLogger } from '@bifold/core'
import { deleteKey, getAllKeys, setActiveKeyAlias } from 'react-native-bcsc-core'
import BCSCApiClient from '../api/client'

interface ServerJwk {
  kid: string
  kty?: string
}

interface ServerClientRegistrationView {
  client_id: string
  jwks?: { keys?: ServerJwk[] }
}

/**
 * Probe the BCSC server for its current view of registered signing keys and
 * realign local key state to match. Called when /device/token returns 401,
 * which (after the conservative reconcile) is overwhelmingly caused by the
 * wallet signing with a kid the server no longer recognises (e.g. post-v3-
 * reset, post-keystore-restore, or post-rotation desync).
 *
 * Steps:
 *  1. GET /device/register/{client_id} with the registration_access_token
 *     to read jwks.keys[].kid (the server's source of truth).
 *  2. Enumerate every rsa\d+ key in the local keystore via getAllKeys().
 *  3. Intersect by kid string. If a local kid matches, mark it active via
 *     setActiveKeyAlias() so the next sign uses it.
 *  4. Prune local keys whose kid is NOT in the server set. Guarded by
 *     `serverKids.length >= 1` so an unexpectedly empty jwks response never
 *     wipes the device; this loop additionally skips `matched.id` so the
 *     just-selected active alias is never a prune target. The native delete
 *     has its own last-line-of-defence guard that refuses to remove the
 *     final remaining alias.
 *
 * @returns true if recovery completed and the caller should retry token
 *   refresh once; false if no recovery occurred (no token, no match,
 *   network/probe failure, or empty server jwks).
 */
export async function performKeyRecovery(
  apiClient: BCSCApiClient,
  clientId: string,
  registrationAccessToken: string,
  logger: BifoldLogger
): Promise<boolean> {
  const serverRegistration = await _getServerRegistration(apiClient, clientId, registrationAccessToken, logger)

  try {
    const serverKids = (serverRegistration?.jwks?.keys ?? [])
      .map((k) => k?.kid)
      .filter((k): k is string => typeof k === 'string' && k.length > 0)
    if (serverKids.length === 0) {
      logger.warn('[performKeyRecovery] event=failed_empty_jwks server returned no jwks; refusing to prune or reassign')
      return false
    }
    const localKeys = await getAllKeys()
    const localIds = localKeys.map((k) => k.id)
    const matched = localKeys.find((k) => serverKids.includes(k.id))
    if (!matched) {
      logger.warn(
        `[performKeyRecovery] event=failed_no_match no local key matches server kids (server=${JSON.stringify(serverKids)}, local=${JSON.stringify(localIds)})`
      )
      return false
    }
    logger.info(`[performKeyRecovery] matched local kid '${matched.id}' against server jwks`)
    await setActiveKeyAlias(matched.id)
    let prunedCount = 0
    let pruneFailures = 0
    for (const k of localKeys) {
      if (k.id === matched.id) {
        continue
      }
      if (serverKids.includes(k.id)) {
        continue
      }
      try {
        await deleteKey(k.id)
        prunedCount++
        logger.info(`[performKeyRecovery] pruned local kid '${k.id}'`)
      } catch (err) {
        pruneFailures++
        const m = err instanceof Error ? err.message : String(err)
        logger.warn(`[performKeyRecovery] failed to prune '${k.id}': ${m}`)
      }
    }
    // Post-prune invariant check. On iOS, setActiveKeyAlias is validate-only
    // (kSecAttrCreationDate is read-only) — the matched alias only becomes
    // de-facto active once everything newer is gone. On Android, the active
    // alias is whichever has the newest createdAt. Either way, after recovery
    // the highest-created entry returned by getAllKeys() should be `matched`.
    // If it isn't, signing will still hit the wrong kid and we'll just loop
    // back into recovery on the next request — loud log is preferable to
    // silent loop.
    try {
      const post = await getAllKeys()
      const newest = post.slice().sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0]
      if (newest && newest.id !== matched.id) {
        logger.error(
          `[performKeyRecovery] event=post_prune_active_mismatch expected newest='${matched.id}' but got '${newest.id}' (remaining=${JSON.stringify(post.map((k) => k.id))})`
        )
      }
    } catch (verifyErr) {
      const m = verifyErr instanceof Error ? verifyErr.message : String(verifyErr)
      logger.warn(`[performKeyRecovery] post-prune verification failed: ${m}`)
    }
    logger.info(
      `[performKeyRecovery] event=succeeded active='${matched.id}' pruned=${prunedCount} prune_failures=${pruneFailures}`
    )
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[performKeyRecovery] event=failed_probe recovery probe failed: ${message}`)
    return false
  }
}

/**
 * Helper to GET /device/register/{client_id} with the registration_access_token and return the server's registration view.
 *
 * @param apiClient - The BCSCApiClient instance to use for the request
 * @param clientId - The client ID to probe
 * @param registrationAccessToken - The registration access token for authorization
 * @param logger - The logger instance for logging
 * @returns The server's registration view, or null if the server returns 403 (indicating key recovery is needed)
 */
async function _getServerRegistration(
  apiClient: BCSCApiClient,
  clientId: string,
  registrationAccessToken: string,
  logger: BifoldLogger
) {
  try {
    const { data } = await apiClient.get<ServerClientRegistrationView>(
      `${apiClient.endpoints.registration}/${clientId}`,
      {
        skipBearerAuth: true,
        skipOnErrorHandler: true, // we want to handle 403 ourselves, not via the global error handler
        headers: { Authorization: `Bearer ${registrationAccessToken}` },
      }
    )

    return data
  } catch (error) {
    // 403 is expected if the server needs key recovery. In that case, we treat it as "no jwks" and skip recovery. Any other error is fatal.
    if (isAxiosAppError(error, 403)) {
      logger.info(`[performKeyRecovery] server returned 403 on registration probe; treating as no jwks`)
      return null
    }

    throw error
  }
}
