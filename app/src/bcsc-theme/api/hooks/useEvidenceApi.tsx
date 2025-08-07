import { useCallback, useMemo } from 'react'
import { useStore } from '@bifold/core'
import apiClient from '../client'
import { withAccount } from './withAccountGuard'
import { createEvidenceRequestJWT } from 'react-native-bcsc-core'
import { BCState } from '@/store'

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
  expires_in?: string
  avg_turnaround_time_message?: string
}

export interface VerificationPhotoUploadPayload {
  label: 'front' | 'back'
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

const useEvidenceApi = () => {
  const [store] = useStore<BCState>()

  const _getDeviceCode = useCallback(() => {
    const code = store.bcsc.deviceCode
    if (!code) throw new Error('Device code is missing. Re install the app and setup try again.')
    return code
  }, [store.bcsc.deviceCode])

  // This needs ot be called for the process to start
  const createVerificationRequest = useCallback(async (): Promise<VerificationResponseData> => {
    return withAccount(async (account) => {
      const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
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
  }, [_getDeviceCode])

  const uploadPhotoEvidenceMetadata = useCallback(
    async (payload: VerificationPhotoUploadPayload): Promise<UploadEvidenceResponseData> => {
      return withAccount(async (account) => {
        const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
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
    [_getDeviceCode]
  )
  const uploadVideoEvidenceMetadata = useCallback(
    async (payload: VerificationVideoUploadPayload): Promise<UploadEvidenceResponseData> => {
      return withAccount(async (account) => {
        const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
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
    [_getDeviceCode]
  )

  const sendVerificationRequest = useCallback(
    async (
      verificationRequestId: string,
      payload: SendVerificationPayload
    ): Promise<VerificationStatusResponseData> => {
      return withAccount(async (account) => {
        const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.put<VerificationStatusResponseData>(
          `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}`,
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
    [_getDeviceCode]
  )

  const getVerificationRequestPrompts = useCallback(
    async (verificationRequestId: string): Promise<VerificationResponseData> => {
      return withAccount(async (account) => {
        const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
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
    [_getDeviceCode]
  )

  const getVerificationRequestStatus = useCallback(
    async (verificationRequestId: string): Promise<VerificationStatusResponseData> => {
      return withAccount(async (account) => {
        const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.get<VerificationStatusResponseData>(
          `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}`,
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
    [_getDeviceCode]
  )

  // This is only valid once sendVerificationRequest has been called
  // meaning the user has uploaded their photo, video and document evidence
  // In the mean time the ID is 'held' for the time being and discarded if the user backs out
  const cancelVerificationRequest = useCallback(
    async (verificationRequestId: string): Promise<any> => {
      return withAccount(async (account) => {
        const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.delete<any>(
          `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}`,
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
    [_getDeviceCode]
  )

  const createEmailVerification = useCallback(
    async (email: string): Promise<any> => {
      return withAccount(async (account) => {
        const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
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
    [_getDeviceCode]
  )

  const sendEmailVerificationCode = useCallback(
    async (code: string, emailAddressId: string): Promise<void> => {
      return withAccount(async (account) => {
        const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
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
    [_getDeviceCode]
  )

  const uploadPhotoEvidenceBinary = useCallback(
    async (url: string, binaryData: any): Promise<any> => {
      return withAccount(async (account) => {
        const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
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
    [_getDeviceCode]
  )

  const uploadVideoEvidenceBinary = useCallback(
    async (url: string, binaryData: any): Promise<any> => {
      return withAccount(async (account) => {
        const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.put<any>(url, binaryData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'video/mp4',
            Accept: 'video/mp4',
          },
          skipBearerAuth: true,
        })
        return data
      })
    },
    [_getDeviceCode]
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
    ]
  )
}

export default useEvidenceApi
