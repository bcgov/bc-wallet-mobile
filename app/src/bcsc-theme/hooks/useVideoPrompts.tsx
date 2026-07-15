import useApi from '@/bcsc-theme/api/hooks/useApi'
import { VerificationResponseData } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useState } from 'react'

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
const useVideoPrompts = () => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { evidence } = useApi()
  const { updateVerificationRequest } = useSecureActions()
  const [isRefreshingPrompts, setIsRefreshingPrompts] = useState(false)
  const { verificationRequestId } = store.bcscSecure

  /**
   * Persists a request and its prompts, or reports that the response is unusable.
   *
   * A usable response lands its sha and prompts together — a video recorded against these prompts can
   * only be finalized with the sha they arrived with, so storing one without the other strands the flow.
   */
  const _storeVerificationRequest = useCallback(
    async (verificationRequest: VerificationResponseData): Promise<boolean> => {
      // Persisted even for an unusable response: holding the id lets the next attempt recover through
      // GET /prompts rather than burning another create, which the server rate limits.
      await updateVerificationRequest(verificationRequest.id, verificationRequest.sha256)

      if (!verificationRequest.prompts?.length) {
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

  /**
   * Fetches a fresh prompt set for the next recording. Call this from every gateway into TakeVideo.
   *
   * @returns {Promise<boolean>} Whether a usable prompt set is now in the store. On `false` the caller
   * must not start a recording — the previous prompts are still cached and would replay a stale challenge.
   */
  const refreshPrompts = useCallback(async (): Promise<boolean> => {
    setIsRefreshingPrompts(true)
    try {
      let verificationRequest: VerificationResponseData

      if (verificationRequestId) {
        try {
          verificationRequest = await evidence.getVerificationRequestPrompts(verificationRequestId)
        } catch (error) {
          // IAS returns 500 for any call against a verification id that has been deleted
          // server-side (TTL expired, agent cancelled, etc.). The local id is now useless —
          // start a fresh request so the user isn't stuck on a stale id across cycles.
          logger.warn(
            `[useVideoPrompts] Failed to fetch prompts for stored verification id; creating a fresh request: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
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
    } finally {
      setIsRefreshingPrompts(false)
    }
  }, [_storeVerificationRequest, evidence, logger, verificationRequestId])

  /**
   * Starts the verification request if one isn't open yet, without rotating an existing one.
   *
   * Entering the flow shouldn't burn a prompt set — the user still has the photo steps ahead of them, and
   * VideoInstructions refreshes immediately before recording. This exists so the entry point can still
   * surface a backend that can't issue prompts at all, before the user works through the photo steps.
   *
   * @returns {Promise<boolean>} Whether the flow can proceed.
   */
  const ensureVerificationRequest = useCallback(async (): Promise<boolean> => {
    if (verificationRequestId) {
      return true
    }

    setIsRefreshingPrompts(true)
    try {
      // NOTE: Making this request too many times will be rate limited by the server.
      const verificationRequest = await evidence.createVerificationRequest()
      return await _storeVerificationRequest(verificationRequest)
    } catch (error) {
      logger.error('[useVideoPrompts] Failed to create verification request', error as Error)
      return false
    } finally {
      setIsRefreshingPrompts(false)
    }
  }, [_storeVerificationRequest, evidence, logger, verificationRequestId])

  return { refreshPrompts, ensureVerificationRequest, isRefreshingPrompts }
}

export default useVideoPrompts
