import useApi from '@/bcsc-theme/api/hooks/useApi'
import { VerificationResponseData } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { isAxiosAppError } from '@/errors/appError'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Issues the verification prompt set for a single recording attempt.
 *
 * IAS rotates the prompts — and the request sha256 they are bound to — on every GET /prompts. That
 * rotation is the point of the control: a video is only accepted against the challenge set the server
 * issued for it, so every path that starts a new recording has to ask for a fresh set. Reusing the
 * cached set across retakes lets one performance answer a challenge indefinitely.
 *
 * Refresh only ever runs BEFORE a recording, never after one. Refreshing once a video exists swaps the
 * sha out from under it and finalize fails with "invalid sha256" — which is why `useEvidenceUploadModel`
 * recovers from a missing sha by clearing state and bouncing the user out rather than refetching.
 */

/**
 * The refresh in flight, shared across every instance of this hook.
 *
 * Each screen calls `useVideoPrompts()` separately, so per-instance state cannot serialize refreshes:
 * two gateways refreshing at once would each rotate the server's set, and their store writes would
 * race — landing the sha from one response beside the prompts from another. Every caller wants the same
 * thing, a fresh set in the store, so a second call joins the first rather than starting a rotation.
 */
let inFlightRefresh: Promise<boolean> | null = null

/** IAS returns 500 for a verification id it has already deleted server-side. */
const DELETED_VERIFICATION_REQUEST_STATUS = 500

const useVideoPrompts = () => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { evidence } = useApi()
  const { updateVerificationRequest } = useSecureActions()
  const [isRefreshingPrompts, setIsRefreshingPrompts] = useState(false)
  const { verificationRequestId } = store.bcscSecure

  // Read through a ref so `refreshPrompts` keeps a stable identity: callers drive it from focus effects,
  // and an identity that changed when the id landed would re-arm the effect and fetch a second time.
  const verificationRequestIdRef = useRef(verificationRequestId)
  useEffect(() => {
    verificationRequestIdRef.current = verificationRequestId
  }, [verificationRequestId])

  /**
   * Commits a response, or reports that it is unusable.
   *
   * A usable response lands its sha and prompts together — a video recorded against these prompts can
   * only be finalized with the sha they arrived with, so storing one without the other strands the flow.
   */
  const _storeVerificationRequest = useCallback(
    async (verificationRequest: VerificationResponseData): Promise<boolean> => {
      const usable = Boolean(verificationRequest.prompts?.length)

      try {
        // The id is worth holding even for an unusable response: it lets the next attempt recover
        // through GET /prompts rather than burning another create, which the server rate limits. This
        // response's sha is not — pairing it with the prompts already in the store would let a
        // recording finalize against a challenge it never answered, and `useEvidenceUploadModel` can
        // only detect a sha that is missing, never one that is merely wrong. Null it instead.
        await updateVerificationRequest(verificationRequest.id, usable ? verificationRequest.sha256 : null)
      } catch (error) {
        // Best-effort. `updateVerificationRequest` dispatches both values before it touches native
        // storage and the sha is memory-only by design, so a failed write costs the id on the next app
        // cycle and nothing more. A full disk must not sink a refresh whose response arrived intact.
        logger.warn(
          `[useVideoPrompts] Failed to persist the verification request id: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }

      if (!usable) {
        // The previous prompts stay in the store deliberately. TakeVideoScreen hard-throws on an empty
        // set and is still mounted underneath on the retake paths, so clearing here would crash the
        // screen the caller is about to send the user back to. Callers block the attempt instead.
        logger.error('[useVideoPrompts] Server returned an empty prompt set')
        return false
      }

      dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [verificationRequest.prompts] })
      return true
    },
    [dispatch, logger, updateVerificationRequest]
  )

  const _refresh = useCallback(async (): Promise<boolean> => {
    try {
      let verificationRequest: VerificationResponseData
      const requestId = verificationRequestIdRef.current

      if (requestId) {
        try {
          verificationRequest = await evidence.getVerificationRequestPrompts(requestId)
        } catch (error) {
          // Only a 500 means the id is gone (TTL expired, agent cancelled) and worth replacing. A
          // timeout, a 401 or a transient 502 leaves it perfectly usable, and creating a fresh request
          // for those orphans the live one and spends rate-limit budget the server enforces.
          if (!isAxiosAppError(error, DELETED_VERIFICATION_REQUEST_STATUS)) {
            throw error
          }

          logger.warn('[useVideoPrompts] Stored verification id was rejected by the server; creating a fresh request')
          verificationRequest = await evidence.createVerificationRequest()
        }
      } else {
        // NOTE: Making this request too many times will be rate limited by the server.
        verificationRequest = await evidence.createVerificationRequest()
      }

      return await _storeVerificationRequest(verificationRequest)
    } catch (error) {
      logger.error('[useVideoPrompts] Failed to refresh verification prompts', error as Error)
      return false
    }
  }, [_storeVerificationRequest, evidence, logger])

  /**
   * Fetches a fresh prompt set for the next recording. Call this from every gateway into TakeVideo.
   *
   * @returns {Promise<boolean>} Whether a usable prompt set is now in the store. On `false` the caller
   * must not start a recording — the previous prompts are still cached and would replay a stale challenge.
   */
  const refreshPrompts = useCallback(async (): Promise<boolean> => {
    inFlightRefresh ??= _refresh().finally(() => {
      inFlightRefresh = null
    })

    const refresh = inFlightRefresh
    setIsRefreshingPrompts(true)
    try {
      return await refresh
    } finally {
      setIsRefreshingPrompts(false)
    }
  }, [_refresh])

  /**
   * Opens a verification request if one isn't already open, without rotating an existing one.
   *
   * Entering the flow shouldn't burn a prompt set — the user still has the photo steps ahead of them,
   * and VideoInstructions refreshes immediately before recording. An id that is already open is taken
   * at face value rather than probed: it is persisted while its sha is not, so every resumed journey
   * would pay a rotation here. The cost is that a dead id or an unreachable backend surfaces at
   * VideoInstructions, after the photo steps, rather than on this press; `refreshPrompts` recovers
   * from both there.
   *
   * @returns {Promise<boolean>} Whether the flow can proceed.
   */
  const ensureVerificationRequest = useCallback(async (): Promise<boolean> => {
    // refreshPrompts creates a request when no id is stored, which is exactly this call.
    return verificationRequestId ? true : refreshPrompts()
  }, [refreshPrompts, verificationRequestId])

  return { refreshPrompts, ensureVerificationRequest, isRefreshingPrompts }
}

export default useVideoPrompts
