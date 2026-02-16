import { BCDispatchAction, BCSCSecureState, BCState, NonBCSCUserMetadata } from '@/store'
import { DispatchAction, TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback } from 'react'
import {
  AccountFlags,
  BCSCAccountType,
  BCSCCardProcess,
  BCSCCardType,
  deleteAccountFlags,
  deleteAuthorizationRequest,
  deleteCredential,
  deleteEvidenceMetadata,
  deleteToken,
  EvidenceMetadata,
  EvidenceType,
  getAccount,
  getAccountFlags,
  getAuthorizationRequest,
  getCredential,
  getEvidenceMetadata,
  getToken,
  NativeAuthorizationRequest,
  PhotoMetadata,
  setAccountFlags,
  setAuthorizationRequest,
  setCredential,
  setEvidenceMetadata,
  setToken,
  TokenType,
} from 'react-native-bcsc-core'
import { DeviceVerificationOption } from '../api/hooks/useAuthorizationApi'
import { TokenResponse } from '../api/hooks/useTokens'
import { ProvinceCode } from '../utils/address-utils'
import { createMinimalCredential } from '../utils/bcsc-credential'
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
          logger.info(`Persisting refresh token`)
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
   * Merges with existing data to avoid overwriting previously saved fields.
   */
  const persistAuthorizationRequest = useCallback(
    async (data: Partial<NativeAuthorizationRequest>) => {
      try {
        const existingData = await getAuthorizationRequest()
        const mergedData = { ...existingData, ...data }
        await setAuthorizationRequest(mergedData as NativeAuthorizationRequest)
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
   * Merges with existing data to avoid overwriting previously saved fields.
   */
  const persistAccountFlags = useCallback(
    async (flags: AccountFlags) => {
      try {
        const existingFlags = await getAccountFlags()
        const mergedFlags = { ...existingFlags, ...flags }
        await setAccountFlags(mergedFlags)
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
   * Update tokens in state and persist to native storage
   */
  const updateTokens = useCallback(
    async (tokens: { refreshToken?: string; registrationAccessToken?: string; accessToken?: string }) => {
      const promises = []

      if (tokens.refreshToken !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_REFRESH_TOKEN,
          payload: [tokens.refreshToken],
        })

        // Only sync to apiClient if client is ready AND we have a valid refresh token
        if (isClientReady && apiClient && tokens.refreshToken) {
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
        const mergedStreetAddress = userMetadata.address.streetAddress2
          ? `${userMetadata.address.streetAddress}\n${userMetadata.address.streetAddress2}`
          : userMetadata.address.streetAddress

        authRequestData.address = {
          streetAddress: mergedStreetAddress,
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
    async (verified: boolean) => {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_VERIFIED,
        payload: [verified],
      })

      const account = await getAccount()
      if (!account) {
        logger.error('Cannot mark as verified: no account found')
        return
      }

      // Persist credential state for v3 rollback compatibility
      if (verified) {
        // Map cardProcess to proper enums
        const cardProcess = store.bcscSecure.cardProcess
        let cardType: BCSCCardType
        let accountType: BCSCAccountType

        if (cardProcess === BCSCCardProcess.BCSCPhoto) {
          cardType = BCSCCardType.PhotoCard
          accountType = BCSCAccountType.PhotoCard
        } else if (cardProcess === BCSCCardProcess.BCSCNonPhoto) {
          cardType = BCSCCardType.NonPhotoCard
          accountType = BCSCAccountType.NonPhotoCard
        } else if (cardProcess === BCSCCardProcess.NonBCSC) {
          cardType = BCSCCardType.NonBcsc
          accountType = BCSCAccountType.NoBcscCard
        } else {
          // Default to non-bcsc if process is unknown
          cardType = BCSCCardType.NonBcsc
          accountType = BCSCAccountType.NoBcscCard
        }

        // Create minimal credential for v3 compatibility
        const credential = createMinimalCredential(account.issuer, account.clientID, cardType, accountType)
        await setCredential(credential)
      } else {
        await deleteCredential()
      }
    },
    [dispatch, logger, store.bcscSecure.cardProcess]
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
   * Update verification request data in secure state and persist to native storage.
   * The ID is persisted as backCheckVerificationId in authorization request (matching v3).
   * The SHA is kept in memory only (not persisted, matching v3 behavior).
   */
  const updateVerificationRequest = useCallback(
    async (verificationRequestId: string | null, verificationRequestSha: string | null) => {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID,
        payload: [verificationRequestId],
      })

      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_SHA,
        payload: [verificationRequestSha],
      })

      // Persist ID to authorization request (SHA is not persisted in v3)
      if (verificationRequestId !== null) {
        await persistAuthorizationRequest({ backCheckVerificationId: verificationRequestId })
      }
    },
    [dispatch, persistAuthorizationRequest]
  )

  /**
   * Update verification options in secure state and persist to native storage
   */
  const updateVerificationOptions = useCallback(
    async (verificationOptions: DeviceVerificationOption[]) => {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_OPTIONS,
        payload: [verificationOptions],
      })

      // Persist as space-separated string to match v3 format
      const verificationOptionsString = verificationOptions.join(' ')
      await persistAuthorizationRequest({ verificationOptions: verificationOptionsString })
    },
    [dispatch, persistAuthorizationRequest]
  )

  /**
   * Add a new evidence type to secure state and persist to native storage
   */
  const addEvidenceType = useCallback(
    async (evidenceType: EvidenceType) => {
      const updatedEvidence = [...store.bcscSecure.additionalEvidenceData, { evidenceType, metadata: [] }]

      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_EVIDENCE_METADATA,
        payload: [updatedEvidence],
      })

      // Persist the updated evidence data
      await persistEvidenceData(updatedEvidence)
    },
    [dispatch, persistEvidenceData, store.bcscSecure.additionalEvidenceData]
  )

  /**
   * Update evidence metadata for a specific evidence type and persist to native storage
   */
  const updateEvidenceMetadata = useCallback(
    async (evidenceType: EvidenceType, metadata: PhotoMetadata[]) => {
      const updatedEvidence = store.bcscSecure.additionalEvidenceData.map((evidence) =>
        evidence.evidenceType === evidenceType ? { ...evidence, metadata } : evidence
      )

      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_EVIDENCE_METADATA,
        payload: [updatedEvidence],
      })

      await persistEvidenceData(updatedEvidence)
    },
    [dispatch, persistEvidenceData, store.bcscSecure.additionalEvidenceData]
  )

  /**
   * Update document number for a specific evidence type and persist to native storage
   */
  const updateEvidenceDocumentNumber = useCallback(
    async (evidenceType: EvidenceType, documentNumber: string) => {
      const updatedEvidence = store.bcscSecure.additionalEvidenceData.map((evidence) =>
        evidence.evidenceType === evidenceType ? { ...evidence, documentNumber } : evidence
      )

      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_EVIDENCE_METADATA,
        payload: [updatedEvidence],
      })

      await persistEvidenceData(updatedEvidence)
    },
    [dispatch, persistEvidenceData, store.bcscSecure.additionalEvidenceData]
  )

  /**
   * Remove incomplete evidence entries and persist to native storage
   */
  const removeIncompleteEvidence = useCallback(async () => {
    // Filter out incomplete evidence (those without photo metadata)
    const updatedEvidence = store.bcscSecure.additionalEvidenceData.filter(
      (evidence) => evidence.metadata && evidence.metadata.length > 0
    )

    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_EVIDENCE_METADATA,
      payload: [updatedEvidence],
    })

    await persistEvidenceData(updatedEvidence)
  }, [dispatch, persistEvidenceData, store.bcscSecure.additionalEvidenceData])

  /**
   * Clear all additional evidence data and persist to native storage
   */
  const clearAdditionalEvidence = useCallback(async () => {
    // Clear evidence by persisting an empty array
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_EVIDENCE_METADATA,
      payload: [[]],
    })

    // Persist empty evidence data
    await persistEvidenceData([])
  }, [dispatch, persistEvidenceData])

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
      const [
        authRequest,
        refreshTokenObj,
        registrationAccessTokenObj,
        accessTokenObj,
        accountFlags,
        evidenceData,
        credential,
      ] = await Promise.all([
        getAuthorizationRequest(),
        getToken(TokenType.Refresh),
        getToken(TokenType.Registration),
        getToken(TokenType.Access),
        getAccountFlags(),
        getEvidenceMetadata(),
        getCredential(),
      ])

      const refreshToken = refreshTokenObj?.token
      const registrationAccessToken = registrationAccessTokenObj?.token
      const accessToken = accessTokenObj?.token
      const verified = !!credential

      await updateTokens({ refreshToken, registrationAccessToken, accessToken })

      // Reconstruct userMetadata from authorizationRequest (matches IAS apps)
      let userMetadata: NonBCSCUserMetadata | undefined = undefined
      if (authRequest?.address || authRequest?.firstName || authRequest?.lastName) {
        userMetadata = {}

        if (authRequest.address) {
          const [streetAddress, streetAddress2] = (authRequest.address.streetAddress || '').split('\n')
          userMetadata.address = {
            streetAddress: streetAddress || '',
            ...(streetAddress2 ? { streetAddress2 } : {}),
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

        verified,

        userSkippedEmailVerification: accountFlags.userSkippedEmailVerification,
        emailAddress: accountFlags.emailAddress,
        temporaryEmailId: accountFlags.temporaryEmailId,
        userSubmittedVerificationVideo: accountFlags.userSubmittedVerificationVideo,

        // Parse verificationOptions from space-separated string to array
        verificationOptions: authRequest?.verificationOptions
          ? (authRequest.verificationOptions.split(' ') as DeviceVerificationOption[])
          : undefined,

        verificationRequestId: authRequest?.backCheckVerificationId,
        additionalEvidenceData: evidenceData,
        userMetadata,
      }

      logger.debug(`Hydrated secure data: ${JSON.stringify(secureData, null, 2)}`)

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
        deleteToken(TokenType.Access),
        deleteAccountFlags(),
        deleteEvidenceMetadata(),
        deleteCredential(),
      ])
      logger.info('Secure data deleted from native storage')
    } catch (error) {
      logger.error('Failed to delete secure data:', error as Error)
      throw error
    }
  }, [logger])

  /**
   *  Deletes all verification artifacts from native storage but preserves tokens.
   *  Use this when resetting verification but not account.
   */
  const deleteVerificationData = useCallback(async () => {
    try {
      await Promise.all([
        deleteAuthorizationRequest(),
        deleteAccountFlags(),
        deleteEvidenceMetadata(),
        deleteCredential(),
      ])
      logger.info('Verification data deleted from native storage')
    } catch (error) {
      logger.error('Failed to delete verification data:', error as Error)
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
    deleteVerificationData,
  }
}

export default useSecureActions
