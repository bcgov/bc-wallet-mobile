import { BCDispatchAction, BCSCSecureState, BCState, NonBCSCUserMetadata } from '@/store'
import { DispatchAction, TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback } from 'react'
import type { AccountFlags, EvidenceMetadata, NativeAuthorizationRequest } from 'react-native-bcsc-core'
import {
  BCSCCardProcess,
  deleteAccountFlags,
  deleteAuthorizationRequest,
  deleteCredential,
  deleteEvidenceMetadata,
  deleteToken,
  getAccountFlags,
  getAuthorizationRequest,
  getEvidenceMetadata,
  getToken,
  setAccountFlags,
  setAuthorizationRequest,
  setCredential,
  setEvidenceMetadata,
  setToken,
  TokenType,
} from 'react-native-bcsc-core'
import { DeviceVerificationOption } from '../api/hooks/useAuthorizationApi'
import { EvidenceType } from '../api/hooks/useEvidenceApi'
import { TokenResponse } from '../api/hooks/useTokens'
import { ProvinceCode } from '../utils/address-utils'
import { PhotoMetadata } from '../utils/file-info'
import { useBCSCApiClientState } from './useBCSCApiClient'

/**
 * Hook to manage secure state and actions for sensitive data.
 *
 * This hook provides methods to:
 * - Update secure state values and persist them to native storage
 * - Hydrate secure state from native storage after authentication
 * - Clear secure state (eg. on logout/lock)
 * - Remove everything from native storage (eg. on account removal)
 *
 * Usage:
 * ```tsx
 * const {
 *   updateTokens,
 *   updateUserInfo,
 *   hydrateSecureState,
 *   clearSecureState,
 *   deleteSecureData
 * } = useSecureActions()
 *
 * // Save tokens received from API
 * await updateTokens({ refreshToken: 'abc123' })
 *
 * // After successful authentication:
 * await hydrateSecureState()
 *
 * // On logout:
 * clearSecureState()
 *
 * // On account removal:
 * await deleteSecureData()
 * ```
 */
export const useSecureActions = () => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { client: apiClient, isClientReady } = useBCSCApiClientState()

  // ============================================================================
  // PERSISTENCE LAYER - Direct native storage operations, not for external use
  // ============================================================================

  /**
   * Persists tokens to native secure storage.
   *
   * @param refreshToken OAuth refresh token
   * @param registrationAccessToken DCR registration access token
   * @param accessToken OAuth access token (not used much from storage in v3, for
   * most use cases access token doesn't live long enough to need persistence)
   */
  const persistTokens = useCallback(
    async (refreshToken?: string, registrationAccessToken?: string, accessToken?: string) => {
      try {
        const promises: Promise<boolean | TokenResponse>[] = []

        if (refreshToken) {
          logger.info(`Persisting refresh token and updating api client`)
          promises.push(setToken(TokenType.Refresh, refreshToken))
        }

        if (registrationAccessToken) {
          logger.info(`Persisting registration access token`)
          promises.push(setToken(TokenType.Registration, registrationAccessToken))
        }

        if (accessToken) {
          logger.info(`Persisting access token`)
          promises.push(setToken(TokenType.Access, accessToken))
        }

        await Promise.all(promises)
        logger.info(`Tokens persisted to native storage successfully`)
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

  // ============================================================================
  // ACTIONS - High-level operations that update store and persist to storage
  // ============================================================================

  /**
   * Update tokens in state, in API client, and persist to native storage
   */
  const updateTokens = useCallback(
    async (tokens: { refreshToken?: string; registrationAccessToken?: string; accessToken?: string }) => {
      const promises = []

      if (tokens.refreshToken !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_REFRESH_TOKEN,
          payload: [tokens.refreshToken],
        })
        if (isClientReady && apiClient) {
          promises.push(apiClient.getTokensForRefreshToken(tokens.refreshToken))
        }
      }

      if (tokens.registrationAccessToken !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_REGISTRATION_ACCESS_TOKEN,
          payload: [tokens.registrationAccessToken],
        })
      }

      if (tokens.accessToken !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_ACCESS_TOKEN,
          payload: [tokens.accessToken],
        })
      }

      promises.push(persistTokens(tokens.refreshToken, tokens.registrationAccessToken, tokens.accessToken))
      await Promise.all(promises)
    },
    [dispatch, persistTokens, apiClient, isClientReady]
  )

  /**
   * Update user info in state and persist to native storage
   */
  const updateUserInfo = useCallback(
    async (userInfo: { birthdate?: Date; serial?: string; email?: string; isEmailVerified?: boolean }) => {
      if (userInfo.birthdate !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_BIRTHDATE,
          payload: [userInfo.birthdate],
        })
      }

      if (userInfo.serial !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_SERIAL,
          payload: [userInfo.serial],
        })
      }

      if (userInfo.email !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_EMAIL,
          payload: [userInfo.email],
        })
      }

      if (userInfo.isEmailVerified !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_IS_EMAIL_VERIFIED,
          payload: [userInfo.isEmailVerified],
        })
      }

      const authRequestData: Partial<NativeAuthorizationRequest> = {}

      if (userInfo.birthdate) {
        authRequestData.birthdate = Math.floor(userInfo.birthdate.getTime() / 1000)
      }
      if (userInfo.serial) {
        authRequestData.csn = userInfo.serial
      }
      if (userInfo.email) {
        authRequestData.verifiedEmail = userInfo.email
      }

      if (Object.keys(authRequestData).length > 0) {
        await persistAuthorizationRequest(authRequestData)
      }
    },
    [dispatch, persistAuthorizationRequest]
  )

  /**
   * Update device authorization codes in state and persist to native storage
   */
  const updateDeviceCodes = useCallback(
    async (codes: { deviceCode?: string; userCode?: string; deviceCodeExpiresAt?: Date }) => {
      if (codes.deviceCode !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_DEVICE_CODE,
          payload: [codes.deviceCode],
        })
      }

      if (codes.userCode !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_USER_CODE,
          payload: [codes.userCode],
        })
      }

      if (codes.deviceCodeExpiresAt !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_DEVICE_CODE_EXPIRES_AT,
          payload: [codes.deviceCodeExpiresAt],
        })
      }

      const authRequestData: Partial<NativeAuthorizationRequest> = {}

      if (codes.deviceCode) {
        authRequestData.deviceCode = codes.deviceCode
      }
      if (codes.userCode) {
        authRequestData.userCode = codes.userCode
      }
      if (codes.deviceCodeExpiresAt) {
        authRequestData.expiry = Math.floor(codes.deviceCodeExpiresAt.getTime() / 1000)
      }

      if (Object.keys(authRequestData).length > 0) {
        await persistAuthorizationRequest(authRequestData)
      }
    },
    [dispatch, persistAuthorizationRequest]
  )

  /**
   * Update the identification process type in state and persist to native storage.
   * Process value determines which verification flow to use (e.g., 'IDIM L3 Remote BCSC Photo Identity Verification').
   */
  const updateCardProcess = useCallback(
    async (cardProcess: BCSCCardProcess | undefined) => {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_CARD_PROCESS,
        payload: [cardProcess],
      })

      if (cardProcess !== undefined) {
        await persistAuthorizationRequest({ cardProcess })
      }
    },
    [dispatch, persistAuthorizationRequest]
  )

  /**
   * Update user metadata (for non-BCSC verification) in state and persist to native storage.
   * Stores address data in authorizationRequest to match IAS apps behavior.
   */
  const updateUserMetadata = useCallback(
    async (userMetadata: NonBCSCUserMetadata | null) => {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_USER_METADATA,
        payload: [userMetadata],
      })

      // Persist address to authorizationRequest to match IAS apps
      // This ensures data survives app restarts during verification
      const authRequestData: Partial<NativeAuthorizationRequest> = {}

      if (userMetadata?.address) {
        authRequestData.address = {
          streetAddress: userMetadata.address.streetAddress,
          locality: userMetadata.address.city,
          postalCode: userMetadata.address.postalCode,
          country: userMetadata.address.country,
          region: userMetadata.address.province,
        }
      }

      if (userMetadata?.name) {
        authRequestData.firstName = userMetadata.name.first
        authRequestData.lastName = userMetadata.name.last
        authRequestData.middleNames = userMetadata.name.middle
      }

      if (Object.keys(authRequestData).length > 0) {
        await persistAuthorizationRequest(authRequestData)
      }
    },
    [dispatch, persistAuthorizationRequest]
  )

  /**
   * Update verification status in state and persist as credential for v3 compatibility
   * When marking as verified, stores the credential object; when unverified, removes it
   */
  const updateVerified = useCallback(
    async (verified: boolean, credentialData?: any) => {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_VERIFIED,
        payload: [verified],
      })

      // Persist credential state for v3 rollback compatibility
      if (verified && credentialData) {
        await setCredential(credentialData)
      } else if (!verified) {
        await deleteCredential()
      }
    },
    [dispatch]
  )

  /**
   * Update wallet key in state
   * This is the PBKDF2 hash of the PIN used for Askar wallet encryption
   */
  const updateWalletKey = useCallback(
    (walletKey?: string) => {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_WALLET_KEY,
        payload: [walletKey],
      })
    },
    [dispatch]
  )

  /**
   * Update account flags in state and persist to native storage
   */
  const updateAccountFlags = useCallback(
    async (flags: AccountFlags) => {
      if (flags.isEmailVerified !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_IS_EMAIL_VERIFIED,
          payload: [flags.isEmailVerified],
        })
      }
      if (flags.userSkippedEmailVerification !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_USER_SKIPPED_EMAIL_VERIFICATION,
          payload: [flags.userSkippedEmailVerification],
        })
      }
      if (flags.emailAddress !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_EMAIL_ADDRESS,
          payload: [flags.emailAddress],
        })
      }
      if (flags.temporaryEmailId !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_TEMPORARY_EMAIL_ID,
          payload: [flags.temporaryEmailId],
        })
      }
      if (flags.userSubmittedVerificationVideo !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_USER_SUBMITTED_VERIFICATION_VIDEO,
          payload: [flags.userSubmittedVerificationVideo],
        })
      }

      await persistAccountFlags(flags)
    },
    [dispatch, persistAccountFlags]
  )

  /**
   * Clear account flags from state and native storage
   */
  const clearAccountFlags = useCallback(() => {
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_IS_EMAIL_VERIFIED,
      payload: [undefined],
    })
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_USER_SKIPPED_EMAIL_VERIFICATION,
      payload: [undefined],
    })
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_EMAIL_ADDRESS,
      payload: [undefined],
    })
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_TEMPORARY_EMAIL_ID,
      payload: [undefined],
    })
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_USER_SUBMITTED_VERIFICATION_VIDEO,
      payload: [undefined],
    })
  }, [dispatch])

  /**
   * Update verification request data in secure state
   */
  const updateVerificationRequest = useCallback(
    (verificationRequestId: string | null, verificationRequestSha: string | null) => {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID,
        payload: [verificationRequestId],
      })

      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_SHA,
        payload: [verificationRequestSha],
      })
    },
    [dispatch]
  )

  /**
   * Update verification options in secure state
   */
  const updateVerificationOptions = useCallback(
    (verificationOptions: DeviceVerificationOption[]) => {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_OPTIONS,
        payload: [verificationOptions],
      })
    },
    [dispatch]
  )

  /**
   * Helper function to persist current evidence data to native storage
   */
  const persistCurrentEvidenceData = useCallback(async () => {
    const evidenceData = store.bcscSecure.additionalEvidenceData || []
    await persistEvidenceData(evidenceData)
  }, [store.bcscSecure.additionalEvidenceData, persistEvidenceData])

  /**
   * Add a new evidence type to secure state and persist to native storage
   */
  const addEvidenceType = useCallback(
    async (evidenceType: EvidenceType) => {
      dispatch({
        type: BCDispatchAction.ADD_SECURE_EVIDENCE_TYPE,
        payload: [evidenceType],
      })
      await persistCurrentEvidenceData()
    },
    [dispatch, persistCurrentEvidenceData]
  )

  /**
   * Update evidence metadata for a specific evidence type and persist to native storage
   */
  const updateEvidenceMetadata = useCallback(
    async (evidenceType: EvidenceType, metadata: PhotoMetadata[]) => {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_EVIDENCE_METADATA,
        payload: [{ evidenceType, metadata }],
      })
      await persistCurrentEvidenceData()
    },
    [dispatch, persistCurrentEvidenceData]
  )

  /**
   * Update document number for a specific evidence type and persist to native storage
   */
  const updateEvidenceDocumentNumber = useCallback(
    async (evidenceType: EvidenceType, documentNumber: string) => {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_EVIDENCE_DOCUMENT_NUMBER,
        payload: [{ evidenceType, documentNumber }],
      })
      await persistCurrentEvidenceData()
    },
    [dispatch, persistCurrentEvidenceData]
  )

  /**
   * Remove incomplete evidence entries and persist to native storage
   */
  const removeIncompleteEvidence = useCallback(async () => {
    dispatch({
      type: BCDispatchAction.REMOVE_INCOMPLETE_SECURE_EVIDENCE,
    })
    await persistCurrentEvidenceData()
  }, [dispatch, persistCurrentEvidenceData])

  /**
   * Clear all additional evidence data and persist to native storage
   */
  const clearAdditionalEvidence = useCallback(async () => {
    dispatch({
      type: BCDispatchAction.CLEAR_SECURE_ADDITIONAL_EVIDENCE,
    })
    await persistCurrentEvidenceData()
  }, [dispatch, persistCurrentEvidenceData])

  // ============================================================================
  // HYDRATION & CLEARING - Loading and clearing secure state
  // ============================================================================

  /**
   * Loads sensitive data from native secure storage and dispatches to store.
   * Call this after successful authentication.
   */
  const hydrateSecureState = useCallback(async () => {
    try {
      logger.info('Hydrating secure state from native storage...')

      // Load all data from native storage in parallel
      const [authRequest, refreshTokenObj, registrationAccessTokenObj, accessTokenObj, accountFlags, evidenceData] =
        await Promise.all([
          getAuthorizationRequest(),
          getToken(TokenType.Refresh),
          getToken(TokenType.Registration),
          getToken(TokenType.Access),
          getAccountFlags(),
          getEvidenceMetadata(),
        ])

      const refreshToken = refreshTokenObj?.token
      const registrationAccessToken = registrationAccessTokenObj?.token
      const accessToken = accessTokenObj?.token

      await updateTokens({ refreshToken, registrationAccessToken, accessToken })

      // Reconstruct userMetadata from authorizationRequest (matches IAS apps)
      let userMetadata: NonBCSCUserMetadata | undefined = undefined
      if (authRequest?.address || authRequest?.firstName || authRequest?.lastName) {
        userMetadata = {}

        if (authRequest.address) {
          userMetadata.address = {
            streetAddress: authRequest.address.streetAddress || '',
            postalCode: authRequest.address.postalCode || '',
            city: authRequest.address.locality || '',
            province: (authRequest.address.region as ProvinceCode) || 'BC',
            country: 'CA',
          }
        }

        if (authRequest.firstName || authRequest.lastName) {
          userMetadata.name = {
            first: authRequest.firstName || '',
            last: authRequest.lastName || '',
            middle: authRequest.middleNames,
          }
        }
      }

      const secureData: BCSCSecureState = {
        isHydrated: true,

        birthdate: authRequest?.birthdate ? new Date(authRequest.birthdate * 1000) : undefined,
        serial: authRequest?.csn,
        email: authRequest?.verifiedEmail,
        isEmailVerified: accountFlags.isEmailVerified ?? !!authRequest?.verifiedEmail,
        deviceCode: authRequest?.deviceCode,
        userCode: authRequest?.userCode,
        deviceCodeExpiresAt: authRequest?.expiry ? new Date(authRequest.expiry * 1000) : undefined,
        cardProcess: authRequest?.cardProcess,

        refreshToken,
        registrationAccessToken,
        accessToken,

        userSkippedEmailVerification: accountFlags.userSkippedEmailVerification,
        emailAddress: accountFlags.emailAddress,
        temporaryEmailId: accountFlags.temporaryEmailId,
        userSubmittedVerificationVideo: accountFlags.userSubmittedVerificationVideo,

        additionalEvidenceData: evidenceData,
        userMetadata,
      }

      dispatch({
        type: BCDispatchAction.HYDRATE_SECURE_STATE,
        payload: [secureData],
      })

      logger.info('Secure state hydrated successfully')
    } catch (error) {
      logger.error('Failed to hydrate secure state:', error as Error)
      throw error
    }
  }, [logger, dispatch, updateTokens])

  /**
   * Clears secure state from store (does not delete from native storage).
   * Call this on logout or app lock.
   */
  const clearSecureState = useCallback(() => {
    logger.info('Clearing secure state from memory')
    dispatch({
      type: BCDispatchAction.CLEAR_SECURE_STATE,
    })
  }, [logger, dispatch])

  /**
   * Logs out the user by clearing secure state from memory and marking as not authenticated.
   * Does NOT delete persisted data from native storage.
   */
  const logout = useCallback(() => {
    logger.info('Logging out user - clearing secure state and marking as not authenticated')
    clearSecureState()
    dispatch({ type: BCDispatchAction.SET_HAS_ACCOUNT, payload: [true] })
    dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [undefined] })
    dispatch({
      type: DispatchAction.DID_AUTHENTICATE,
      payload: [false],
    })
  }, [logger, clearSecureState, dispatch])

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

  /**
   * Handles successful authentication by updating wallet key, hydrating state, and dispatching auth success.
   * Call this after setPIN, setupDeviceSecurity, unlockWithDeviceSecurity, or verifyPIN succeeds.
   * @param walletKey wallet key (PBKDF2 hash of PIN) for Askar wallet encryption
   */
  const handleSuccessfulAuth = useCallback(
    async (walletKey?: string) => {
      await hydrateSecureState()
      updateWalletKey(walletKey)
      dispatch({ type: BCDispatchAction.SUCCESSFUL_AUTH })
    },
    [hydrateSecureState, updateWalletKey, dispatch]
  )

  return {
    // Actions
    updateTokens,
    updateUserInfo,
    updateDeviceCodes,
    updateCardProcess,
    updateUserMetadata,
    updateVerified,
    updateWalletKey,
    updateAccountFlags,
    clearAccountFlags,
    updateVerificationRequest,
    updateVerificationOptions,
    addEvidenceType,
    updateEvidenceMetadata,
    updateEvidenceDocumentNumber,
    removeIncompleteEvidence,
    clearAdditionalEvidence,
    handleSuccessfulAuth,
    // Hydration & clearing
    hydrateSecureState,
    clearSecureState,
    logout,
    deleteSecureData,
  }
}

export default useSecureActions
