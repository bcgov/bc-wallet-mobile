import { BCDispatchAction, BCState, NonBCSCUserMetadata } from '@/store'
import { useStore } from '@bifold/core'
import type { AccountFlags, NativeAuthorizationRequest } from 'react-native-bcsc-core'
import { deleteCredential, setCredential } from 'react-native-bcsc-core'
import { DeviceVerificationOption } from '../api/hooks/useAuthorizationApi'
import { EvidenceType } from '../api/hooks/useEvidenceApi'
import { PhotoMetadata } from '../utils/file-info'
import { useSecureState } from './useSecureState'

/**
 * Hook to update secure state values and persist them to native storage.
 *
 * This hook provides methods to update sensitive data that:
 * - Updates Redux state immediately for UI consistency
 * - Persists to native secure storage for durability
 * - Handles errors gracefully
 *
 * Usage:
 * ```tsx
 * const { updateTokens, updateUserInfo, updateDeviceCodes } = useBCSCSecureActions()
 *
 * // Save tokens received from API
 * await updateTokens({ refreshToken: 'abc123' })
 *
 * // Save user info from verification
 * await updateUserInfo({
 *   birthdate: new Date('1990-01-01'),
 *   serial: 'CSN123456789',
 *   email: 'user@example.com'
 * })
 * ```
 */
export const useBCSCSecureActions = () => {
  const [store, dispatch] = useStore<BCState>()
  const { persistTokens, persistAuthorizationRequest, persistAccountFlags, persistEvidenceData } = useSecureState()

  /**
   * Update tokens in state and persist to native storage
   */
  const updateTokens = async (tokens: { refreshToken?: string; registrationAccessToken?: string }) => {
    // Update Redux state first for immediate UI feedback
    if (tokens.refreshToken !== undefined) {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_REFRESH_TOKEN,
        payload: [tokens.refreshToken],
      })
    }

    if (tokens.registrationAccessToken !== undefined) {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_REGISTRATION_ACCESS_TOKEN,
        payload: [tokens.registrationAccessToken],
      })
    }

    // Persist to native storage
    await persistTokens(tokens.refreshToken, tokens.registrationAccessToken)
  }

  /**
   * Update user info in state and persist to native storage
   */
  const updateUserInfo = async (userInfo: {
    birthdate?: Date
    serial?: string
    email?: string
    emailConfirmed?: boolean
  }) => {
    // Update Redux state
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

    if (userInfo.emailConfirmed !== undefined) {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_EMAIL_CONFIRMED,
        payload: [userInfo.emailConfirmed],
      })
    }

    // Persist to native storage as authorization request data
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
  }

  /**
   * Update device authorization codes in state and persist to native storage
   */
  const updateDeviceCodes = async (codes: { deviceCode?: string; userCode?: string; deviceCodeExpiresAt?: Date }) => {
    // Update Redux state
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

    // Persist to native storage as authorization request data
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
  }

  /**
   * Update user metadata (for non-BCSC verification) in state only.
   * This data is temporary and cleared after verification.
   */
  const updateUserMetadata = (userMetadata?: NonBCSCUserMetadata) => {
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_USER_METADATA,
      payload: [userMetadata],
    })
  }

  /**
   * Update verification status in state and persist as credential for v3 compatibility
   * When marking as verified, stores the credential object; when unverified, removes it
   */
  const updateVerified = async (verified: boolean, credentialData?: any) => {
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
  }

  /**
   * Update wallet key in state
   * This is the PBKDF2 hash of the PIN used for Askar wallet encryption
   */
  const updateWalletKey = (walletKey?: string) => {
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_WALLET_KEY,
      payload: [walletKey],
    })
  }

  /**
   * Update account flags in state and persist to native storage
   */
  const updateAccountFlags = async (flags: AccountFlags) => {
    // Update Redux state
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_ACCOUNT_FLAGS,
      payload: [flags],
    })

    // Persist to native storage
    await persistAccountFlags(flags)
  }

  /**
   * Clear account flags from state and native storage
   */
  const clearAccountFlags = () => {
    dispatch({
      type: BCDispatchAction.CLEAR_SECURE_ACCOUNT_FLAGS,
    })
  }

  /**
   * Update verification request data in secure state
   */
  const updateVerificationRequest = (verificationRequestId?: string, verificationRequestSha?: string) => {
    if (verificationRequestId !== undefined) {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID,
        payload: [verificationRequestId],
      })
    }
    if (verificationRequestSha !== undefined) {
      dispatch({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_SHA,
        payload: [verificationRequestSha],
      })
    }
  }

  /**
   * Update verification options in secure state
   */
  const updateVerificationOptions = (verificationOptions: DeviceVerificationOption[]) => {
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_OPTIONS,
      payload: [verificationOptions],
    })
  }

  /**
   * Helper function to persist current evidence data to native storage
   */
  const persistCurrentEvidenceData = async () => {
    const evidenceData = store.bcscSecure.additionalEvidenceData || []
    await persistEvidenceData(evidenceData)
  }

  /**
   * Add a new evidence type to secure state and persist to native storage
   */
  const addEvidenceType = async (evidenceType: EvidenceType) => {
    dispatch({
      type: BCDispatchAction.ADD_SECURE_EVIDENCE_TYPE,
      payload: [evidenceType],
    })
    await persistCurrentEvidenceData()
  }

  /**
   * Update evidence metadata for a specific evidence type and persist to native storage
   */
  const updateEvidenceMetadata = async (evidenceType: EvidenceType, metadata: PhotoMetadata[]) => {
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_EVIDENCE_METADATA,
      payload: [{ evidenceType, metadata }],
    })
    await persistCurrentEvidenceData()
  }

  /**
   * Update document number for a specific evidence type and persist to native storage
   */
  const updateEvidenceDocumentNumber = async (evidenceType: EvidenceType, documentNumber: string) => {
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_EVIDENCE_DOCUMENT_NUMBER,
      payload: [{ evidenceType, documentNumber }],
    })
    await persistCurrentEvidenceData()
  }

  /**
   * Remove incomplete evidence entries and persist to native storage
   */
  const removeIncompleteEvidence = async () => {
    dispatch({
      type: BCDispatchAction.REMOVE_INCOMPLETE_SECURE_EVIDENCE,
    })
    await persistCurrentEvidenceData()
  }

  /**
   * Clear all additional evidence data and persist to native storage
   */
  const clearAdditionalEvidence = async () => {
    dispatch({
      type: BCDispatchAction.CLEAR_SECURE_ADDITIONAL_EVIDENCE,
    })
    await persistCurrentEvidenceData()
  }

  return {
    updateTokens,
    updateUserInfo,
    updateDeviceCodes,
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
  }
}

export default useBCSCSecureActions
