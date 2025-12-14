import { BCDispatchAction, BCSCSecureState } from '@/store'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback } from 'react'
import type { AccountFlags, EvidenceMetadata, NativeAuthorizationRequest } from 'react-native-bcsc-core'
import {
  deleteAccountFlags,
  deleteAuthorizationRequest,
  deleteEvidenceMetadata,
  deleteToken,
  getAccountFlags,
  getAuthorizationRequest,
  getEvidenceMetadata,
  getToken,
  setAccountFlags,
  setAuthorizationRequest,
  setEvidenceMetadata,
  setToken,
  TokenType,
} from 'react-native-bcsc-core'

/**
 * Hook to manage secure state hydration from native storage.
 *
 * This hook provides methods to:
 * - Hydrate secure state from native storage after authentication
 * - Clear secure state on logout/lock
 * - Persist sensitive data to native storage
 *
 * Usage:
 * ```tsx
 * const { hydrateSecureState, clearSecureState, persistTokens } = useSecureState()
 *
 * // After successful authentication:
 * await hydrateSecureState()
 *
 * // On logout:
 * await clearSecureState()
 * ```
 */
export const useSecureState = () => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  /**
   * Loads sensitive data from native secure storage and dispatches to Redux.
   * Call this after successful authentication.
   */
  const hydrateSecureState = useCallback(
    async (dispatch: (action: any) => void) => {
      try {
        logger.info('Hydrating secure state from native storage...')

        // Load authorization request data (contains birthdate, serial, email, device codes)
        const authRequest = await getAuthorizationRequest()

        // Load tokens from secure storage
        const [refreshToken, registrationAccessToken] = await Promise.all([
          getToken(TokenType.Refresh).then((token) => token?.token),
          getToken(TokenType.Registration).then((token) => token?.token),
        ])

        // Load account flags from secure storage
        const accountFlags = await getAccountFlags()

        // Load evidence metadata from secure storage
        const evidenceData = await getEvidenceMetadata()

        // Build secure state object
        const secureData: BCSCSecureState = {
          isHydrated: true,
          // From authorization request
          birthdate: authRequest?.birthdate ? new Date(authRequest.birthdate * 1000) : undefined,
          serial: authRequest?.csn,
          email: authRequest?.verifiedEmail,
          emailConfirmed: !!authRequest?.verifiedEmail,
          deviceCode: authRequest?.deviceCode,
          userCode: authRequest?.userCode,
          deviceCodeExpiresAt: authRequest?.expiry ? new Date(authRequest.expiry * 1000) : undefined,
          // Note: userMetadata is not persisted, it's only used during verification flow

          // From token storage
          refreshToken,
          registrationAccessToken,

          // From account flags storage
          accountFlags,

          // From evidence metadata storage
          additionalEvidenceData: evidenceData,
        }

        // Dispatch to Redux
        dispatch({
          type: BCDispatchAction.HYDRATE_SECURE_STATE,
          payload: [secureData],
        })

        logger.info('Secure state hydrated successfully')
      } catch (error) {
        logger.error('Failed to hydrate secure state:', error as Error)
        // Don't throw - app can continue without secure state
      }
    },
    [logger]
  )

  /**
   * Clears secure state from Redux (does not delete from native storage).
   * Call this on logout or app lock.
   */
  const clearSecureState = useCallback(
    (dispatch: (action: any) => void) => {
      logger.info('Clearing secure state from memory')
      dispatch({
        type: BCDispatchAction.CLEAR_SECURE_STATE,
      })
    },
    [logger]
  )

  /**
   * Persists tokens to native secure storage.
   *
   * @param refreshToken OAuth refresh token
   * @param registrationAccessToken DCR registration access token
   */
  const persistTokens = useCallback(
    async (refreshToken?: string, registrationAccessToken?: string) => {
      try {
        const promises: Promise<boolean>[] = []

        if (refreshToken) {
          promises.push(setToken(TokenType.Refresh, refreshToken))
        }

        if (registrationAccessToken) {
          promises.push(setToken(TokenType.Registration, registrationAccessToken))
        }

        await Promise.all(promises)
        logger.info('Tokens persisted to native storage')
      } catch (error) {
        logger.error('Failed to persist tokens:', error as Error)
        throw error
      }
    },
    [logger]
  )

  /**
   * Persists authorization request data to native secure storage.
   * This includes PII like birthdate, serial, email, and device codes.
   */
  const persistAuthorizationRequest = useCallback(
    async (data: Partial<NativeAuthorizationRequest>) => {
      try {
        await setAuthorizationRequest(data as NativeAuthorizationRequest)
        logger.info('Authorization request persisted to native storage')
      } catch (error) {
        logger.error('Failed to persist authorization request:', error as Error)
        throw error
      }
    },
    [logger]
  )

  /**
   * Persists account flags to native secure storage.
   * This includes user preferences and verification flags.
   */
  const persistAccountFlags = useCallback(
    async (flags: AccountFlags) => {
      try {
        await setAccountFlags(flags)
        logger.info('Account flags persisted to native storage')
      } catch (error) {
        logger.error('Failed to persist account flags:', error as Error)
        throw error
      }
    },
    [logger]
  )

  /**
   * Persists evidence metadata to native secure storage.
   * This includes document numbers, photo metadata, and evidence types.
   */
  const persistEvidenceData = useCallback(
    async (evidenceData: EvidenceMetadata[]) => {
      try {
        await setEvidenceMetadata(evidenceData)
        logger.info('Evidence metadata persisted to native storage')
      } catch (error) {
        logger.error('Failed to persist evidence metadata:', error as Error)
        throw error
      }
    },
    [logger]
  )

  /**
   * Completely removes sensitive data from native storage.
   * Call this on account removal.
   */
  const deleteSecureData = useCallback(async () => {
    try {
      await Promise.all([
        deleteAuthorizationRequest(),
        deleteToken(TokenType.Refresh),
        deleteToken(TokenType.Registration),
        deleteAccountFlags(),
        deleteEvidenceMetadata(),
      ])
      logger.info('Secure data deleted from native storage')
    } catch (error) {
      logger.error('Failed to delete secure data:', error as Error)
      throw error
    }
  }, [logger])

  return {
    hydrateSecureState,
    clearSecureState,
    persistTokens,
    persistAuthorizationRequest,
    persistAccountFlags,
    persistEvidenceData,
    deleteSecureData,
  }
}

export default useSecureState
