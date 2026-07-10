import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { VIDEO_MP4_MIME_TYPE } from '@/constants'
import { cancelVerificationReminders } from '@/services/notifications/verificationReminders'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import type { BarcodePayload } from 'react-native-bcsc-core'
import { createPreVerificationJWT, EvidenceType } from 'react-native-bcsc-core'
import BCSCApiClient from '../client'
import { withAccount } from './withAccountGuard'

export interface VerificationPrompt {
  id: number
  prompt: string
}

export interface VerificationPromptUploadPayload {
  id: number
  prompted_at: number // this provides the index/ order in which the prompt was given. 0 is the first prompt, 1 is the second prompt show ect.
}
export interface VerificationResponseData {
  id: string
  sha256: string
  prompts: VerificationPrompt[]
}

export interface SendVerificationPayload {
  upload_uris: string[]
  sha256: string
}

export interface VerificationStatusResponseData {
  id: string
  status: 'pending' | 'verified' | 'cancelled'
  status_message?: string
  avg_turnaround_time_message?: string
}

export interface VerificationSubmitResponseData extends VerificationStatusResponseData {
  expiry_extended_by?: number
}

export interface VerificationPhotoUploadPayload {
  label: string
  content_type: string
  content_length: number
  date: number
  sha256: string // hashed copy of the photo
  filename?: string
}

export interface VerificationVideoUploadPayload {
  content_type: string
  content_length: number
  date: number // epoch timestamp in seconds
  sha256: string // hashed copy of the video
  duration: number // video duration in seconds
  prompts: VerificationPromptUploadPayload[]
  filename?: string
}

export interface UploadEvidenceResponseData {
  label: string
  upload_uri: string
}

export interface EvidenceMetadataResponseData {
  processes: {
    process: 'IDIM L3 Remote Non-BCSC Identity Verification' | 'IDIM L3 Remote Non-photo BCSC Identity Verification'
    evidence_types: EvidenceType[]
  }[]
}
export interface EvidenceMetadataPayload {
  type?: string
  number?: string
  images: VerificationPhotoUploadPayload[]
  barcodes?: BarcodePayload[]
}

const useEvidenceApi = (apiClient: BCSCApiClient) => {
  const [store] = useStore<BCState>()
  const { updateDeviceCodes } = useSecureActions()

  /**
   * A terminal `status` means the session is over, so any pending "verify by ..." reminders are
   * cleared. (Completion is also caught when the device_code is exchanged for tokens; this just
   * clears them sooner, and covers an agent-cancelled video.)
   *
   * Returns whether the status was terminal.
   */
  const cancelRemindersOnTerminalStatus = useCallback(
    async (data: VerificationStatusResponseData): Promise<boolean> => {
      if (data.status !== 'verified' && data.status !== 'cancelled') {
        return false
      }
      // doesn't throw
      await cancelVerificationReminders(apiClient.logger)
      return true
    },
    [apiClient.logger]
  )

  /**
   * Applies the server's video-submission deadline extension.
   *
   * `expiry_extended_by` is a delta in seconds added to the EXISTING deadline, pinned to end-of-day
   * local, and only ever pushed later — a stale/shorter value can never cut an in-progress session
   * short. With no existing expiry there is nothing to extend. It rides only on the evidence-submit
   * PUT, never on the status GET, so repeated status polls cannot compound the deadline.
   *
   * Mirrors ias-ios PreBackcheckVideoChecks / `dateBeforeMidnightWithSeconds` and ias-android
   * DocumentUploadViewModel. Note both name their local variable `expiresIn`, but the wire field is
   * `expiry_extended_by` — it is NOT the OAuth `expires_in` seconds-from-now convention.
   */
  const applyExpiryExtension = useCallback(
    async (data: VerificationSubmitResponseData) => {
      const seconds = data.expiry_extended_by
      if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
        return
      }
      const currentExpiry = store.bcscSecure.deviceCodeExpiresAt
      if (!currentExpiry) {
        return
      }
      const extendedExpiry = new Date(currentExpiry.getTime() + seconds * 1000)
      extendedExpiry.setHours(23, 59, 59, 0)
      if (extendedExpiry.getTime() <= currentExpiry.getTime()) {
        return
      }
      // Best-effort: persisting the extended expiry (and the reminder reschedule it triggers) must not
      // fail the verification response it rode in on.
      try {
        await updateDeviceCodes({ deviceCodeExpiresAt: extendedExpiry })
      } catch (error) {
        apiClient.logger.warn('[applyExpiryExtension] Failed to persist extended expiry', {
          error,
        })
      }
    },
    [apiClient?.logger, store.bcscSecure.deviceCodeExpiresAt, updateDeviceCodes]
  )

  const _getDeviceCode = useCallback(() => {
    const code = store.bcscSecure.deviceCode
    if (!code) {
      throw new Error('Device code is missing. Re install the app and setup try again.')
    }

    // Intentionally NOT pre-checking expiry here: a client-side throw bypasses the axios interceptor,
    // and callers that catch+log would silently drop it. Instead let an expired/superseded device_code
    // 401 so the centralized verificationSessionExpiredErrorPolicy routes to the restart modal; the
    // startup system check covers the relaunch case. See issue #4050.
    return code
  }, [store.bcscSecure.deviceCode])

  const getEvidenceMetadata = useCallback(async (): Promise<EvidenceMetadataResponseData> => {
    const { data } = await apiClient.get<EvidenceMetadataResponseData>(`${apiClient.endpoints.evidence}/metadata`, {
      // Evidence endpoints do not require a full access token
      skipBearerAuth: true,
    })
    return data
  }, [apiClient])

  // This needs ot be called for the process to start
  const createVerificationRequest = useCallback(async (): Promise<VerificationResponseData> => {
    return withAccount(async (account) => {
      const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
      const { data } = await apiClient.post<VerificationResponseData>(
        `${apiClient.endpoints.evidence}/v1/verifications`,
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          // Evidence endpoints do not require a full access token
          skipBearerAuth: true,
        }
      )
      return data
    })
  }, [_getDeviceCode, apiClient])

  const uploadPhotoEvidenceMetadata = useCallback(
    async (payload: VerificationPhotoUploadPayload): Promise<UploadEvidenceResponseData> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.post<UploadEvidenceResponseData>(
          `${apiClient.endpoints.evidence}/v1/photos`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    [_getDeviceCode, apiClient]
  )
  const uploadVideoEvidenceMetadata = useCallback(
    async (payload: VerificationVideoUploadPayload): Promise<UploadEvidenceResponseData> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.post<UploadEvidenceResponseData>(
          `${apiClient.endpoints.evidence}/v1/videos`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    [_getDeviceCode, apiClient]
  )

  const sendVerificationRequest = useCallback(
    async (
      verificationRequestId: string,
      payload: SendVerificationPayload
    ): Promise<VerificationSubmitResponseData> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.put<VerificationSubmitResponseData>(
          `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        const isTerminal = await cancelRemindersOnTerminalStatus(data)
        if (!isTerminal) {
          await applyExpiryExtension(data)
        }
        return data
      })
    },
    [_getDeviceCode, apiClient, applyExpiryExtension, cancelRemindersOnTerminalStatus]
  )

  const getVerificationRequestPrompts = useCallback(
    async (verificationRequestId: string): Promise<VerificationResponseData> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.get<VerificationResponseData>(
          `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}/prompts`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    [_getDeviceCode, apiClient]
  )

  const getVerificationRequestStatus = useCallback(
    async (verificationRequestId: string): Promise<VerificationStatusResponseData> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.get<VerificationStatusResponseData>(
          `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        await cancelRemindersOnTerminalStatus(data)
        return data
      })
    },
    [_getDeviceCode, apiClient, cancelRemindersOnTerminalStatus]
  )

  // This is only valid once sendVerificationRequest has been called
  // meaning the user has uploaded their photo, video and document evidence
  // In the mean time the ID is 'held' for the time being and discarded if the user backs out
  const cancelVerificationRequest = useCallback(
    async (verificationRequestId: string): Promise<any> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.delete<any>(
          `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
            // Note: Errors handled in `useEvidenceService`
            skipOnErrorHandler: true,
          }
        )

        return data
      })
    },
    [_getDeviceCode, apiClient]
  )

  const createEmailVerification = useCallback(
    async (email: string): Promise<any> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.post<any>(
          `${apiClient.endpoints.evidence}/v1/emails`,
          { email_address: email },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    [_getDeviceCode, apiClient]
  )

  const sendEmailVerificationCode = useCallback(
    async (code: string, emailAddressId: string): Promise<void> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.put<void>(
          `${apiClient.endpoints.evidence}/v1/emails/${emailAddressId}`,
          {
            verification_code: code,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    [_getDeviceCode, apiClient]
  )

  const uploadPhotoEvidenceBinary = useCallback(
    async (url: string, binaryData: any): Promise<any> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.put<any>(url, binaryData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'image/jpeg',
            Accept: 'image/jpeg',
          },
          skipBearerAuth: true,
        })
        return data
      })
    },
    [_getDeviceCode, apiClient]
  )

  const uploadVideoEvidenceBinary = useCallback(
    async (url: string, binaryData: any): Promise<any> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.put<any>(url, binaryData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': VIDEO_MP4_MIME_TYPE,
            Accept: VIDEO_MP4_MIME_TYPE,
          },
          skipBearerAuth: true,
        })
        return data
      })
    },
    [_getDeviceCode, apiClient]
  )

  const sendEvidenceMetadata = useCallback(
    async (payload: EvidenceMetadataPayload): Promise<UploadEvidenceResponseData[]> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.post<UploadEvidenceResponseData[]>(
          `${apiClient.endpoints.evidence}/v1/documents`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    [_getDeviceCode, apiClient]
  )

  return useMemo(
    () => ({
      createVerificationRequest,
      uploadPhotoEvidenceMetadata,
      uploadVideoEvidenceMetadata,
      uploadPhotoEvidenceBinary,
      uploadVideoEvidenceBinary,
      sendVerificationRequest,
      getVerificationRequestStatus,
      cancelVerificationRequest,
      getVerificationRequestPrompts,
      createEmailVerification,
      sendEmailVerificationCode,
      sendEvidenceMetadata,
      getEvidenceMetadata,
    }),
    [
      createVerificationRequest,
      uploadPhotoEvidenceMetadata,
      uploadVideoEvidenceMetadata,
      uploadPhotoEvidenceBinary,
      uploadVideoEvidenceBinary,
      sendVerificationRequest,
      getVerificationRequestStatus,
      cancelVerificationRequest,
      getVerificationRequestPrompts,
      createEmailVerification,
      sendEmailVerificationCode,
      sendEvidenceMetadata,
      getEvidenceMetadata,
    ]
  )
}

export default useEvidenceApi
