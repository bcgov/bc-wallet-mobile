import { isRefreshTokenExpired } from '@/bcsc-theme/state/account/refresh-token'
import { selectJourney } from '@/bcsc-theme/state/verification/journey'
import { getBCSCState, selectAccountRecord, useApp } from '@/bcsc-theme/storage/hooks'
import type { Profile } from '@/bcsc-theme/storage/slices/account'
import { isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import {
  cancelVerificationReminders,
  scheduleVerificationReminders,
} from '@/services/notifications/verificationReminders'
import { BCSCSecureState, NonBCSCUserMetadata, ResidentialAddressDraft } from '@/store'
import { throwNativeBcscError } from '@bcsc-theme/utils/native-error-map'
import { BifoldLogger, TOKENS, useServices } from '@bifold/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import {
  AccountFlags,
  BarcodePayload,
  BCSCCardProcess,
  CredentialInfo,
  EvidenceMetadata,
  EvidenceType,
  NativeAuthorizationRequest,
  PhotoMetadata,
} from 'react-native-bcsc-core'
import { DeviceVerificationOption } from '../api/hooks/useAuthorizationApi'
import { TokenResponse } from '../api/hooks/useTokens'
import { ProvinceCode } from '../utils/address-utils'
import { createVerifiedCredential, isCredentialDeactivated } from '../utils/bcsc-credential'
import { isCardEvidenceComplete, isEvidenceAwaitingDocumentNumber } from '../utils/card-utils'
import { removeFileSafely } from '../utils/file-info'
import { KeyRecoveryStatus, performKeyRecovery, reRegisterNewestKey } from '../utils/key-recovery'
import {
  confirmRegistrationClientId,
  getRegistrationTokenClientId,
  isUnusableClientIdError,
} from '../utils/registration-token'
import { stripDisallowedNameCharacters } from '../utils/validation'
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
// Read when an action runs, not from the render: two updates in a row must each see the other's write
const currentEvidence = () => selectJourney(getBCSCState()).additionalEvidenceData

// The ID photos saved for the evidence (saveEvidencePhoto), deleted with it. Never throws.
const deleteEvidencePhotos = (logger: BifoldLogger) =>
  Promise.all(
    currentEvidence().flatMap((evidence) => evidence.metadata.map((photo) => removeFileSafely(photo.file_path, logger)))
  )

export const useSecureActions = () => {
  const app = useApp()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()
  const { client: apiClient, isClientReady } = useBCSCApiClientState()

  // ============================================================================
  // PERSISTENCE LAYER - Direct native storage operations, not for external use
  // ============================================================================

  /**
   * Persists authorization request data to native secure storage.
   * This includes PII like birthdate, serial, email, and device codes.
   * Merges with existing data to avoid overwriting previously saved fields.
   */
  const persistAuthorizationRequest = useCallback(
    async (data: Partial<NativeAuthorizationRequest>) => {
      try {
        // Merged over the slice's copy, which is the native record as last read or written
        await getBCSCState().verification.updateRequest(data)
        logger.info('Authorization request persisted to native storage')
      } catch (error) {
        logger.error('Failed to persist authorization request:', error as Error)
        throwNativeBcscError(error)
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
        await getBCSCState().verification.updateFlags(flags)
        logger.info('Account flags persisted to native storage')
      } catch (error) {
        logger.error('Failed to persist account flags:', error as Error)
        throwNativeBcscError(error)
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
        await getBCSCState().verification.setEvidence(evidenceData)
        logger.info('Evidence persisted to native storage')
      } catch (error) {
        logger.error('Failed to persist evidence metadata:', error as Error)
        throwNativeBcscError(error)
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
      // Only the tokens given change; the account slice saves them natively before the store changes
      const given = Object.fromEntries(Object.entries(tokens).filter(([, token]) => token !== undefined))
      if (Object.keys(given).length === 0) {
        return
      }
      try {
        await getBCSCState().account.setTokens(given)
        logger.info('Tokens persisted to native storage successfully')
      } catch (error) {
        logger.error('Failed to persist tokens:', error as Error)
        // The server may already have rotated (and revoked) the old ones, so the session carries on with
        // these, as it did when memory was updated before the save (#4645)
        getBCSCState().account.keepTokensInMemory(given)
        throwNativeBcscError(error)
      }
    },
    [logger]
  )

  /**
   * Update user info in state and persist to native storage
   */
  const updateUserInfo = useCallback(
    async (userInfo: { birthdate?: Date; serial?: string; email?: string; isEmailVerified?: boolean }) => {
      const authRequestData: Partial<NativeAuthorizationRequest> = {}

      if (userInfo.birthdate) {
        authRequestData.birthdate = Math.floor(userInfo.birthdate.getTime() / 1000)
      }
      if (userInfo.serial) {
        authRequestData.csn = userInfo.serial
      }
      // Only persist as verifiedEmail when the email has actually been verified.
      // Otherwise an unverified email captured mid-flow would look verified after re-auth (see hydrateSecureState).
      if (userInfo.email && userInfo.isEmailVerified) {
        authRequestData.verifiedEmail = userInfo.email
      }

      if (Object.keys(authRequestData).length > 0) {
        await persistAuthorizationRequest(authRequestData)
      }

      // Persist email + verification flag to accountFlags so they survive auto-lock during verification.
      const accountFlagsData: AccountFlags = {}
      if (userInfo.email !== undefined) {
        accountFlagsData.emailAddress = userInfo.email
      }
      if (userInfo.isEmailVerified !== undefined) {
        accountFlagsData.isEmailVerified = userInfo.isEmailVerified
      }
      if (Object.keys(accountFlagsData).length > 0) {
        await persistAccountFlags(accountFlagsData)
      }
    },
    [persistAuthorizationRequest, persistAccountFlags]
  )

  /**
   * Update device authorization codes in state and persist to native storage
   */
  const updateDeviceCodes = useCallback(
    async (codes: { deviceCode?: string; userCode?: string; deviceCodeExpiresAt?: Date }) => {
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

      // (Re)schedule the local "verify by ..." reminders off the latest expiry. This fires on the
      // initial device-authorization and again whenever the server extends the deadline, so the
      // reminders always track the current expiry. Cancellation happens at terminal states (completion,
      // agent-cancel, reset) — not here and not on lock/logout, so reminders survive the user closing
      // the app mid-verification.
      if (codes.deviceCodeExpiresAt) {
        const formattedDate = codes.deviceCodeExpiresAt.toLocaleString(t('BCSC.LocaleStringFormat'), {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
        // doesn't throw
        void scheduleVerificationReminders(
          codes.deviceCodeExpiresAt,
          {
            title: t('BCSC.VerificationReminder.Title'),
            body: t('BCSC.VerificationReminder.Body', { date: formattedDate }),
          },
          logger
        )
      }
    },
    [persistAuthorizationRequest, t, logger]
  )

  /**
   * Clear device authorization codes from state and native storage.
   *
   * Used when the user abandons a flow that issued a device code (e.g. backing out of a
   * device transfer) so a later verification flow doesn't silently reuse an authorization
   * with no identity attached. Clearing codes that don't exist succeeds.
   */
  const clearDeviceCodes = useCallback(async () => {
    try {
      const { verification } = getBCSCState()
      if (!verification.request) {
        return
      }

      await verification.updateRequest({ deviceCode: undefined, userCode: undefined, expiry: undefined })
      logger.info('Device authorization codes cleared from native storage')
    } catch (error) {
      logger.error('Failed to clear device authorization codes:', error as Error)
      throwNativeBcscError(error)
    }
  }, [logger])

  /**
   * Clear the authorization request record from native storage entirely.
   */
  const clearAuthorizationRequest = useCallback(async () => {
    try {
      await getBCSCState().verification.clearRequest()
      await getBCSCState().verification.setCardProcess(undefined)
      logger.info('Authorization request cleared from native storage')
    } catch (error) {
      logger.error('Failed to clear authorization request:', error as Error)
      throwNativeBcscError(error)
    }
  }, [logger])

  /**
   * Update the identification process type in state and persist to native storage.
   * Process value determines which verification flow to use (e.g., 'IDIM L3 Remote BCSC Photo Identity Verification').
   */
  const updateCardProcess = useCallback(
    async (cardProcess: BCSCCardProcess | undefined | null) => {
      await getBCSCState().verification.setCardProcess(cardProcess ?? undefined)

      // Also kept in the native authorization request, which hydrate still derives it from until m0002
      if (cardProcess !== undefined) {
        await persistAuthorizationRequest({ cardProcess: cardProcess ?? undefined })
      }
    },
    [persistAuthorizationRequest]
  )

  /**
   * Update user metadata (for non-BCSC verification) in state and persist to native storage.
   * Stores address data in authorizationRequest to match IAS apps behavior.
   */
  const updateUserMetadata = useCallback(
    async (userMetadata: NonBCSCUserMetadata | null) => {
      getBCSCState().session.setUserMetadata(userMetadata ?? undefined)

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
    [persistAuthorizationRequest]
  )

  /**
   * Keep the residential address form as the user left it, in memory only. Unlike the other
   * updates here nothing is written to native storage: the draft lives for the signed-in session and
   * is dropped with the rest of the secure state on lock, logout or a verification reset, so only a
   * submitted address (see updateUserMetadata) survives. Pass undefined to discard it.
   */
  const updateResidentialAddressDraft = useCallback((draft: ResidentialAddressDraft | undefined) => {
    getBCSCState().session.setResidentialAddressDraft(draft)
  }, [])

  /**
   * Update verification status: persists the credential record (the marker hydration reads on every
   * unlock, kept in the v3 format for rollback) and then updates the store. When marking as verified,
   * stores the credential object; when unverified, removes it.
   *
   * The native write goes first and its failure is thrown: a session that says verified while the next
   * unlock says otherwise is the status mismatch this ordering rules out.
   */
  const updateVerified = useCallback(
    async (verified: boolean) => {
      if (verified) {
        const account = selectAccountRecord(getBCSCState())
        if (!account) {
          throw new Error('Cannot mark as verified: no account found')
        }

        // The credential record is what makes the account verified (selectVerified)
        await getBCSCState().account.setCredential(
          createVerifiedCredential(account.issuer, account.clientID, getBCSCState().verification.cardProcess)
        )
      } else {
        await getBCSCState().account.setCredential(undefined)
      }

      getBCSCState().session.update({ inVerifyFlow: false, credentialDeactivated: false })
      if (verified) {
        // Verification is finished: nothing is left to resume on launch, and the user is no longer a
        // first-time verifier (a later re-verification, e.g. a renewal, starts from Home)
        void getBCSCState().app.update({ verificationStarted: false, verificationSkipped: true })
        // Clean up scheduled verification reminders, the user is verified
        await cancelVerificationReminders(logger)
      }
    },
    [logger]
  )

  /**
   * Enters (or re-enters) the verification flow: RootStack shows the VerifyStack while the user is in
   * the verify flow, and marking it started makes every later launch resume it until the user is verified.
   */
  const continueVerificationProcess = useCallback(() => {
    void getBCSCState().app.update({ verificationStarted: true })
    getBCSCState().session.setInVerifyFlow(true)
  }, [])

  /**
   * Update wallet key in state
   * This is the PBKDF2 hash of the PIN used for Askar wallet encryption
   */
  const updateWalletKey = useCallback((walletKey?: string) => {
    getBCSCState().session.setWalletKey(walletKey)
  }, [])

  /**
   * Update account flags in state and persist to native storage
   */
  const updateAccountFlags = useCallback(
    async (flags: AccountFlags) => {
      await persistAccountFlags(flags)
    },
    [persistAccountFlags]
  )

  /**
   * Clear account flags from native storage, and so from state
   */
  const clearAccountFlags = useCallback(() => getBCSCState().verification.clearFlags(), [])

  /**
   * Update verification request data in secure state and persist to native storage.
   * The ID is persisted as backCheckVerificationId in authorization request (matching v3).
   * The SHA is kept in memory only (not persisted, matching v3 behavior).
   */
  const updateVerificationRequest = useCallback(
    async (verificationRequestId: string | undefined, verificationRequestSha: string | null) => {
      // A status belongs to one request, so it must not outlive a change of request ID
      // Read from the store, not a render, so the callback keeps one identity (useVideoPrompts relies on it)
      if (verificationRequestId !== getBCSCState().verification.request?.backCheckVerificationId) {
        getBCSCState().session.clearVerificationStatus()
      }

      getBCSCState().session.update({ verificationRequestSha: verificationRequestSha ?? undefined })

      try {
        // Persist ID to authorization request (SHA is not persisted in v3)
        await persistAuthorizationRequest({ backCheckVerificationId: verificationRequestId })
      } catch (error) {
        logger.warn(
          `[updateVerificationRequest] Failed to persist verification request id: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    },
    [persistAuthorizationRequest, logger]
  )

  /**
   * Update verification options in secure state and persist to native storage
   */
  const updateVerificationOptions = useCallback(
    async (verificationOptions: DeviceVerificationOption[]) => {
      // Persist as space-separated string to match v3 format
      const verificationOptionsString = verificationOptions.join(' ')
      await persistAuthorizationRequest({ verificationOptions: verificationOptionsString })
    },
    [persistAuthorizationRequest]
  )

  /**
   * Add a new evidence type to secure state and persist to native storage
   */
  const addEvidenceType = useCallback(
    async (evidenceType: EvidenceType) => {
      const updatedEvidence = [...currentEvidence(), { evidenceType, metadata: [] }]

      // Persist the updated evidence data
      await persistEvidenceData(updatedEvidence)
    },
    [persistEvidenceData]
  )

  /**
   * Update evidence metadata for a specific evidence type and persist to native storage
   */
  const updateEvidenceMetadata = useCallback(
    async (evidenceType: EvidenceType, metadata: PhotoMetadata[], barcodes?: BarcodePayload[]) => {
      const updatedEvidence = currentEvidence().map((evidence) =>
        evidence.evidenceType?.evidence_type === evidenceType.evidence_type
          ? { ...evidence, metadata, barcodes }
          : evidence
      )

      await persistEvidenceData(updatedEvidence)
    },
    [persistEvidenceData]
  )

  /**
   * Update document number for a specific evidence type and persist to native storage
   */
  const updateEvidenceDocumentNumber = useCallback(
    async (evidenceType: EvidenceType, documentNumber: string) => {
      const updatedEvidence = currentEvidence().map((evidence) =>
        evidence.evidenceType?.evidence_type === evidenceType.evidence_type ? { ...evidence, documentNumber } : evidence
      )

      await persistEvidenceData(updatedEvidence)
    },
    [persistEvidenceData]
  )

  /**
   * Remove a specific evidence type from secure state and persist to native storage
   *
   * @param evidenceType The evidence type to remove
   * @returns The evidence metadata left
   */
  const removeEvidenceByType = useCallback(
    async (evidenceType: EvidenceType) => {
      const updatedEvidence = currentEvidence().filter(
        (evidence) => evidence.evidenceType?.evidence_type !== evidenceType.evidence_type
      )

      await persistEvidenceData(updatedEvidence)

      return updatedEvidence
    },
    [persistEvidenceData]
  )

  /**
   * Remove incomplete evidence entries and persist to native storage
   *
   * @param evidence Array of evidence metadata to filter and persist
   * @returns An updated list of evidence metadata with incomplete entries removed
   */
  const removeIncompleteEvidence = useCallback(
    async (evidence: EvidenceMetadata[]) => {
      if (!evidence.length) {
        return []
      }

      // Filter out incomplete evidence (those without photo metadata)
      const updatedEvidence = evidence.filter((item) => isCardEvidenceComplete(item))

      if (updatedEvidence.length === evidence.length) {
        // Only persist if there was a change to avoid unnecessary writes
        return evidence
      }

      await persistEvidenceData(updatedEvidence)

      return updatedEvidence
    },
    [persistEvidenceData]
  )

  /**
   * Keep only the first `count` evidence entries (dropping the rest) and persist. Used when the user
   * navigates back to an evidence-type list to release the ID(s) selected from that list onward so
   * they can be picked again, while keeping the ones collected before it.
   *
   * @param evidence Current evidence metadata array
   * @param count Number of leading entries to keep
   * @returns The kept evidence metadata array
   */
  const truncateEvidence = useCallback(
    async (evidence: EvidenceMetadata[], count: number) => {
      if (evidence.length <= count) {
        return evidence
      }

      const kept = evidence.slice(0, count)
      await persistEvidenceData(kept)

      return kept
    },
    [persistEvidenceData]
  )

  /**
   * Remove abandoned evidence entries (a card was selected but no photos were ever
   * captured) and persist the result.
   *
   * Unlike {@link removeIncompleteEvidence}, this PRESERVES evidence whose photos are all
   * captured but whose document number is still pending — the state a user is in while on
   * EvidenceIDCollection. This is used during hydration (which runs on every unlock) so
   * locking the app mid-collection doesn't discard the captured photos; the user resumes
   * on EvidenceIDCollection instead of being bounced to the start of the ID flow.
   *
   * @param evidence Array of evidence metadata to filter and persist
   * @returns An updated list with abandoned (never-captured) entries removed
   */
  const removeAbandonedEvidence = useCallback(
    async (evidence: EvidenceMetadata[]) => {
      if (!evidence.length) {
        return []
      }

      const updatedEvidence = evidence.filter(
        (item) => isCardEvidenceComplete(item) || isEvidenceAwaitingDocumentNumber(item)
      )

      if (updatedEvidence.length === evidence.length) {
        // Only persist if there was a change to avoid unnecessary writes
        return evidence
      }

      await persistEvidenceData(updatedEvidence)

      return updatedEvidence
    },
    [persistEvidenceData]
  )

  /**
   * Clear all additional evidence data and persist to native storage
   */
  const clearAdditionalEvidence = useCallback(async () => {
    // Clear evidence by persisting an empty array

    await persistEvidenceData([])
  }, [persistEvidenceData])

  /**
   * Update a saved service bookmark status. Only the bookmarked IDs are kept (D6).
   *
   * @param clientRefId The service client_ref_id
   * @param bookmarked Whether to bookmark (true) or unbookmark (false)
   */
  const updateSavedService = useCallback(
    async (clientRefId: string, bookmarked: boolean) => {
      try {
        await getBCSCState().savedServices.setBookmarked(clientRefId, bookmarked)
        logger.info(`Saved service ${clientRefId} ${bookmarked ? 'bookmarked' : 'unbookmarked'}`)
      } catch (error) {
        logger.error('Failed to persist saved service update:', error as Error)
      }
    },
    [logger]
  )

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

      // The store has these since open(); nothing else writes them
      const state = getBCSCState()
      const account = selectAccountRecord(state)
      const authRequest = (state.verification.request ?? null) as NativeAuthorizationRequest | null
      const { refreshToken, accessToken } = state.account.tokens ?? {}
      let registrationAccessToken = state.account.tokens?.registrationAccessToken
      const evidenceData = state.verification.evidence ?? []
      const credential = state.account.credential

      let issuer = account?.issuer
      let clientID = account?.clientID
      const tokenClientID = getRegistrationTokenClientId(registrationAccessToken)

      if (account && (!issuer || !clientID)) {
        // A missing issuer or clientID breaks refresh. Prefer the registration token's `aud`; the
        // authorization request (possibly re-imported from v3) is the fallback only when there is no token.
        const clientIDSource = registrationAccessToken ? 'registration token' : 'authorization request'
        logger.warn(
          `[hydrateSecureState] Account missing required fields: issuer=${!issuer ? 'MISSING' : 'OK'}, clientID=${!clientID ? 'MISSING' : 'OK'}. Attempting recovery (clientID source: ${clientIDSource}).`
        )

        try {
          issuer = issuer || authRequest?.issuer
          clientID = clientID || (registrationAccessToken ? tokenClientID : authRequest?.clientID)

          if (issuer && clientID) {
            logger.info(
              `[hydrateSecureState] Recovered issuer/clientID (clientID source: ${clientIDSource}); updating account`
            )
            await getBCSCState().account.updateProfile({ issuer, clientId: clientID })
          } else {
            logger.warn(
              `[hydrateSecureState] Could not recover account fields: issuer=${issuer ? 'OK' : 'MISSING'}, clientID=${clientID ? 'OK' : 'MISSING'}`
            )
          }
        } catch (error) {
          logger.warn(
            `[hydrateSecureState] Failed to update account with recovered values: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      // Android only: iOS keeps its tokens in the keychain under the client ID, so switching the ID
      // there would make every stored token unreadable.
      const driftDetected = Boolean(
        Platform.OS === 'android' &&
          account &&
          issuer &&
          clientID &&
          tokenClientID &&
          registrationAccessToken &&
          clientID !== tokenClientID
      )

      // Switches the account to the client ID the registration token was issued for, but only after the
      // server confirms that registration. Returns whether the local clientID now equals the token's.
      const repairClientIdDrift = async (): Promise<boolean> => {
        // Narrowing only: the enclosing refresh branch guarantees apiClient, driftDetected the rest.
        if (!apiClient || !account || !issuer || !tokenClientID || !registrationAccessToken) {
          return false
        }

        logger.warn(
          '[hydrateSecureState] event=client_id_drift_detected stored client ID differs from registration token'
        )
        const confirmation = await confirmRegistrationClientId(apiClient, tokenClientID, registrationAccessToken)

        // The server revokes the old token when it rotates, so persist the new one whatever the outcome.
        if (confirmation.status !== 'request_failed' && confirmation.newRegistrationAccessToken) {
          registrationAccessToken = confirmation.newRegistrationAccessToken
          try {
            await updateTokens({ registrationAccessToken })
          } catch {
            logger.error('[hydrateSecureState] event=client_id_drift_rejected reason=persist_failed')
            return false
          }
        }

        if (confirmation.status !== 'confirmed') {
          const httpStatus = confirmation.status === 'request_failed' ? (confirmation.httpStatus ?? 'none') : 'none'
          logger.warn(
            `[hydrateSecureState] event=client_id_drift_rejected reason=${confirmation.status} http_status=${httpStatus}`
          )
          return false
        }

        try {
          await getBCSCState().account.updateProfile({ issuer, clientId: tokenClientID })
          clientID = tokenClientID
        } catch {
          logger.error('[hydrateSecureState] event=client_id_drift_rejected reason=persist_failed')
          return false
        }

        logger.info(
          '[hydrateSecureState] event=client_id_drift_repaired account client ID now matches registration token'
        )
        return true
      }

      let freshTokens: TokenResponse | null = null
      // Populated when the recovery probe (or the no-match re-registration fallback) surfaces a
      // rotated registration_access_token — always persisted below when present, regardless of
      // which branch this ends up taking (RFC 7592: the reg token may rotate on GET or PUT).
      let recoveredRegistrationAccessToken: string | undefined
      // Production never rotates the refresh token, so its `exp` is the device credential's
      // 5-year lifetime (#4654): when expired, skip the refresh and key recovery — renewal is the only fix.
      const refreshTokenExpired = isRefreshTokenExpired(refreshToken, new Date())

      if (refreshTokenExpired) {
        logger.warn(
          '[hydrateSecureState] event=refresh_token_expired stored refresh token is past its exp; skipping refresh and key recovery — account renewal required'
        )
      } else if (refreshToken && apiClient && isClientReady) {
        try {
          freshTokens = await apiClient.getTokensForRefreshToken(refreshToken)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          logger.error(`[hydrateSecureState] Failed to refresh tokens with stored refresh token: ${message}`)

          // Retries the refresh once after a recovery strategy, logging under a shared label.
          const retryRefreshAfter = async (strategyLabel: string): Promise<TokenResponse | null> => {
            try {
              const tokens = await apiClient.getTokensForRefreshToken(refreshToken)
              logger.info(`[hydrateSecureState] token refresh succeeded after ${strategyLabel}`)
              return tokens
            } catch (retryError) {
              const retryMessage = retryError instanceof Error ? retryError.message : String(retryError)
              logger.error(`[hydrateSecureState] token refresh still failed after ${strategyLabel}: ${retryMessage}`)
              return null
            }
          }

          if (isAppError(error, AppEventCode.INVALID_TOKEN)) {
            // Server rejected a locally-valid token: stop here so the user sees one alert, not several.
            // A signing-key mismatch (#4166) never carries INVALID_TOKEN, so key recovery is unaffected.
            logger.error(
              '[hydrateSecureState] event=refresh_token_rejected server rejected a locally-valid refresh token (invalid_token); skipping key recovery'
            )
          } else if (isAppError(error, AppEventCode.CLOCK_SKEW_ERROR)) {
            // The keys are fine: the refresh was refused, or its assertion rejected, for the device clock
            logger.warn(
              '[hydrateSecureState] event=clock_skew token refresh failed on the device clock; skipping key recovery'
            )
          } else {
            // Only a 401 naming an unknown client, or one that doesn't own the token, proves the stored ID is
            // bad. Other 401s (bad signature) and network/timeout/5xx go straight to key recovery.
            if (driftDetected && isUnusableClientIdError(error)) {
              const repaired = await repairClientIdDrift()
              if (repaired) {
                freshTokens = await retryRefreshAfter('client id repair')
              }
            }

            if (!freshTokens && clientID && registrationAccessToken) {
              logger.info('[hydrateSecureState] Attempting key recovery in case of signing key mismatch...')
              const recovery = await performKeyRecovery(apiClient, clientID, registrationAccessToken, logger)
              recoveredRegistrationAccessToken = recovery.newRegistrationAccessToken

              if (recovery.status === KeyRecoveryStatus.Recovered) {
                freshTokens = await retryRefreshAfter('key recovery')
              } else if (recovery.status === KeyRecoveryStatus.NoMatch) {
                logger.info(
                  '[hydrateSecureState] No local key matches server jwks; attempting to re-register the newest local key...'
                )
                const reRegisterResult = await reRegisterNewestKey(
                  apiClient,
                  clientID,
                  recoveredRegistrationAccessToken ?? registrationAccessToken,
                  logger
                )
                recoveredRegistrationAccessToken =
                  reRegisterResult.newRegistrationAccessToken ?? recoveredRegistrationAccessToken

                if (reRegisterResult.success) {
                  freshTokens = await retryRefreshAfter('re-registration')
                } else {
                  logger.warn(
                    '[hydrateSecureState] Re-registration of newest local key did not succeed; tokens remain stale.'
                  )
                }
              } else {
                logger.warn('[hydrateSecureState] Key recovery did not occur or did not succeed; tokens remain stale.')
              }
            }
          }
        }
      }

      // Computed once and used for both the keychain write-back and the store, so the
      // store can't end up with a token older than the one just refreshed or rotated.
      const effectiveTokens = {
        refreshToken: freshTokens?.refresh_token ?? refreshToken,
        registrationAccessToken: recoveredRegistrationAccessToken ?? registrationAccessToken,
        accessToken: freshTokens?.access_token ?? accessToken,
      }

      // A keychain write failure here used to abort an already-successful unlock and surface as
      // "Device Authentication Failed" (#4645). The tokens are in memory either way, and the next
      // unlock refreshes from the stored token again, so log and continue.
      try {
        await updateTokens(effectiveTokens)
      } catch (error) {
        // updateTokens kept them in memory
        logger.error('[hydrateSecureState] Failed to persist tokens; continuing with in-memory tokens', error as Error)
      }

      // Reconstruct userMetadata from authorizationRequest (matches IAS apps)
      let userMetadata: NonBCSCUserMetadata | undefined = undefined
      if (authRequest?.address || authRequest?.firstName || authRequest?.lastName) {
        userMetadata = {}

        if (authRequest.address) {
          const [streetAddress, streetAddress2] = (authRequest.address.streetAddress || '').split('\n')
          userMetadata.address = {
            streetAddress: streetAddress || '',
            postalCode: authRequest.address.postalCode || '',
            city: authRequest.address.locality || '',
            province: (authRequest.address.region as ProvinceCode) || 'BC',
            country: 'CA',
          }
          if (streetAddress2) {
            userMetadata.address.streetAddress2 = streetAddress2
          }
        }

        if (authRequest.firstName || authRequest.lastName) {
          userMetadata.name = {
            first: stripDisallowedNameCharacters(authRequest.firstName),
            last: stripDisallowedNameCharacters(authRequest.lastName),
            middle:
              authRequest.middleNames !== undefined
                ? stripDisallowedNameCharacters(authRequest.middleNames)
                : undefined,
          }
        }
      }

      let cleanedEvidence = evidenceData
      try {
        // Only drop abandoned selections (no photos captured). Evidence that has its photos
        // but no document number yet is in-progress collection — preserve it so a user who
        // locked the app on EvidenceIDCollection can resume there instead of losing the photo.
        cleanedEvidence = await removeAbandonedEvidence(evidenceData)
      } catch (error) {
        // If removing abandoned evidence fails, log the error but continue hydration
        logger.error('Error removing abandoned evidence during hydration:', error as Error)
      }

      const cardProcess = hydrateCardProcess(authRequest, cleanedEvidence)
      // Derived again on every unlock, so a failed save shouldn't fail the unlock
      await getBCSCState()
        .verification.setCardProcess(cardProcess)
        .catch((error) => logger.error('[hydrateSecureState] Failed to save card process', error as Error))

      // The credential record is the persisted "verified" marker, written when the user finishes setup
      // (see updateVerified). A device can hold a refresh token IAS still accepts without that record:
      // the finish step never ran, or its write failed. Treating such a device as unverified is the
      // status mismatch users report, so once IAS has confirmed the device by issuing fresh tokens the
      // record is restored. Not while a started verification is still being resumed: that resume ends
      // on the finish step, which also sets the nickname and clears the authorization request.
      let restoredCredential: CredentialInfo | null = null
      if (!credential && refreshToken) {
        if (freshTokens && issuer && clientID && app.verificationStarted !== true) {
          try {
            restoredCredential = createVerifiedCredential(issuer, clientID, cardProcess)
            await getBCSCState().account.setCredential(restoredCredential)
            logger.info(
              '[hydrateSecureState] event=verified_credential_restored no credential record, but IAS accepted the stored refresh token; record restored'
            )
          } catch (error) {
            restoredCredential = null
            logger.error(
              '[hydrateSecureState] Failed to restore the verified credential record; continuing as not verified',
              error as Error
            )
          }
        } else {
          logger.warn('[hydrateSecureState] No credential record but a refresh token exists; treating as not verified')
        }
      }

      const record = credential ?? restoredCredential
      const credentialDeactivated = isCredentialDeactivated(record)
      // Everything else hydrate used to hand to Bifold's store is in the slices now: the reloads above, the
      // token write and the credential restore put it there
      getBCSCState().session.update({ inVerifyFlow: false, credentialDeactivated, userMetadata, isHydrated: true })

      logger.info('Secure state hydrated successfully')
    } catch (error) {
      logger.error('Failed to hydrate secure state:', error as Error)
      // Native read failures map to a distinct storage error (raw code preserved); an error already
      // mapped downstream (e.g. token persistence) passes through the mapper unchanged.
      throwNativeBcscError(error)
    }
  }, [logger, apiClient, isClientReady, updateTokens, removeAbandonedEvidence, app.verificationStarted])

  /**
   * Clears secure state from store (does not delete from native storage).
   * Call this on logout or app lock.
   */
  const clearSecureState = useCallback(
    (secureState?: Partial<BCSCSecureState>) => {
      logger.info('Clearing secure state from memory')
      const { session } = getBCSCState()
      session.clearSignedIn()
      // Fields the caller keeps across the clear (a verification reset keeps the wallet key, for one)
      const { walletKey, inVerifyFlow, credentialDeactivated, isHydrated } = secureState ?? {}
      session.update(
        Object.fromEntries(
          Object.entries({ walletKey, inVerifyFlow, credentialDeactivated, isHydrated }).filter(
            ([, value]) => value !== undefined
          )
        )
      )
    },
    [logger]
  )

  /**
   * Logs out the user by clearing secure state from memory and marking as not authenticated.
   * Does NOT delete persisted data from native storage.
   */
  const logout = useCallback(() => {
    logger.info('Logging out user - clearing secure state and marking as not authenticated')
    clearSecureState()
    getBCSCState().session.setDidAuthenticate(false)
  }, [logger, clearSecureState])

  /**
   * Completely removes the account's sensitive data. Call this on account removal, once the profile is gone
   * (hasAccount false), so nothing mid-reset reroutes on a half-cleared store.
   */
  const deleteSecureData = useCallback(async () => {
    try {
      const { verification, account, savedServices } = getBCSCState()
      await deleteEvidencePhotos(logger)
      await Promise.all([
        verification.clearRequest(),
        verification.clearFlags(),
        verification.clearEvidence(),
        savedServices.clear(),
        account.setCredential(undefined),
        account.clearTokens(),
      ])
      // doesn't throw
      await cancelVerificationReminders(logger)
      logger.info('Secure data deleted')
    } catch (error) {
      logger.error('Failed to delete secure data:', error as Error)
      throwNativeBcscError(error)
    }
  }, [logger])

  /**
   *  Deletes all verification artifacts from native storage but preserves tokens.
   *  Use this when resetting verification but not account.
   */
  const deleteVerificationData = useCallback(async () => {
    try {
      await deleteEvidencePhotos(logger)
      await Promise.all([
        getBCSCState().verification.clearRequest(),
        getBCSCState().verification.clearFlags(),
        getBCSCState().verification.clearEvidence(),
        getBCSCState().account.setCredential(undefined),
      ])
      await getBCSCState().verification.setCardProcess(undefined)
      // doesn't throw
      await cancelVerificationReminders(logger)
      logger.info('Verification data deleted from native storage')
    } catch (error) {
      logger.error('Failed to delete verification data:', error as Error)
      throwNativeBcscError(error)
    }
  }, [logger])

  /**
   * Deletes card info (birthdate and serial) from the stored authorization request.
   */
  const deleteCardInfo = useCallback(async () => {
    const { verification } = getBCSCState()
    if (verification.request) {
      await verification.updateRequest({ birthdate: undefined, csn: undefined })
    }
  }, [])

  /**
   * Handles successful authentication by updating wallet key, hydrating state, and dispatching auth success.
   * Call this after setPIN, setupDeviceSecurity, unlockWithDeviceSecurity, or verifyPIN succeeds.
   * @param walletKey wallet key (PBKDF2 hash of PIN) for Askar wallet encryption
   * @param newProfile a new account's profile, from onboarding, saved once authenticated
   */
  const handleSuccessfulAuth = useCallback(
    async (walletKey?: string, newProfile?: Profile) => {
      await hydrateSecureState()
      updateWalletKey(walletKey)
      getBCSCState().session.setDidAuthenticate(true)
      // A new account's profile is saved only now: hasAccount turning true before didAuthenticate would have
      // RootStack show the unlock screen to someone finishing onboarding
      if (newProfile) {
        await getBCSCState().account.setProfile(newProfile)
      }
    },
    [hydrateSecureState, updateWalletKey]
  )

  return {
    // Actions
    updateTokens,
    updateUserInfo,
    updateDeviceCodes,
    clearDeviceCodes,
    clearAuthorizationRequest,
    updateCardProcess,
    updateUserMetadata,
    updateResidentialAddressDraft,
    updateVerified,
    updateWalletKey,
    updateAccountFlags,
    clearAccountFlags,
    updateVerificationRequest,
    updateVerificationOptions,
    continueVerificationProcess,
    addEvidenceType,
    updateEvidenceMetadata,
    updateEvidenceDocumentNumber,
    removeEvidenceByType,
    removeIncompleteEvidence,
    truncateEvidence,
    removeAbandonedEvidence,
    clearAdditionalEvidence,
    updateSavedService,
    handleSuccessfulAuth,
    // Hydration & clearing
    hydrateSecureState,
    clearSecureState,
    logout,
    deleteSecureData,
    deleteVerificationData,
    deleteScannedCardData: deleteCardInfo,
  }
}

/**
 * Hydrate the card process based on evidence data and the authorization request.
 * @param authRequest Authorization request to check for existing card process
 * @param evidenceData Array of evidence metadata to analyze
 * @returns The hydrated card process, or undefined if it cannot be determined
 */
function hydrateCardProcess(
  authRequest: NativeAuthorizationRequest | null,
  evidenceData: EvidenceMetadata[]
): BCSCCardProcess | undefined {
  // If there's no authorization request, we can't determine the card process
  if (!authRequest) {
    return
  }

  // If cardProcess is already set in the authRequest, use that
  if (authRequest.cardProcess) {
    return authRequest.cardProcess
  }

  // If there's no deviceCode and there is evidence data, assume NonBCSC process
  if (!authRequest.deviceCode && evidenceData.length > 0) {
    return BCSCCardProcess.NonBCSC
  }
}

export default useSecureActions
