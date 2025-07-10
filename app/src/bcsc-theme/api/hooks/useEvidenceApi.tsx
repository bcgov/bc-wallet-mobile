import apiClient from '../client'
import { withAccount } from './withAccountGuard'
import { createEvidenceRequestJWT } from 'react-native-bcsc-core'

export interface VerificationPrompt {
  id: number
  prompt: string
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
  sha256: string
  filename?: string
}

export interface VerificationVideoUploadPayload {
  content_type: string
  content_length: number
  date: string
  sha256: string
  duration: number
  prompts: VerificationPrompt[]
}

const useEvidenceApi = () => {
  // This needs ot be called for the process to start
  const createVerificationRequest = async (deviceCode: string): Promise<VerificationResponseData> => {
    return withAccount(async (account) => {
      // generate a custom token hear with client and device code
      // this endpoint needs to be ignored in the request interceptor
      // TODO: move this into a request interceptor
      const token = await createEvidenceRequestJWT(deviceCode, account.clientID)

      const { data } = await apiClient.post<VerificationResponseData>(
        `${apiClient.endpoints.evidence}/v1/verifications`,
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      return data
    })
  }

  const uploadPhotoEvidence = async (payload: VerificationPhotoUploadPayload, deviceCode: string): Promise<any> => {
    return withAccount(async (account) => {
      const token = await createEvidenceRequestJWT(deviceCode, account.clientID)
      const { data } = await apiClient.post<any>(`${apiClient.endpoints.evidence}/v1/photos`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      return data
    })
  }
  const uploadVideoEvidence = async (payload: VerificationVideoUploadPayload): Promise<void> => {
    return withAccount(async () => {
      const { data } = await apiClient.post<void>(`${apiClient.endpoints.evidence}/v1/videos`, payload)
      return data
    })
  }

  const sendVerificationRequest = async (
    verificationRequestId: string,
    payload: SendVerificationPayload
  ): Promise<VerificationStatusResponseData> => {
    return withAccount(async () => {
      const { data } = await apiClient.put<VerificationStatusResponseData>(
        `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}`,
        payload
      )
      return data
    })
  }

  const getVerificationRequestPrompts = async (verificationRequestId: string): Promise<VerificationResponseData> => {
    return withAccount(async () => {
      const { data } = await apiClient.get<VerificationResponseData>(
        `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}/prompts`
      )
      return data
    })
  }

  const getVerificationRequestStatus = async (
    verificationRequestId: string
  ): Promise<VerificationStatusResponseData> => {
    return withAccount(async () => {
      const { data } = await apiClient.get<VerificationStatusResponseData>(
        `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}`
      )
      return data
    })
  }

  // This is only valid once the verification flow has truly started
  // meaning the user has uploaded their photo, video and document evidence
  // In the mean time the ID is 'held' for the time being and discarded if teh user backs out
  const cancelVerificationRequest = async (verificationRequestId: string, deviceCode: string): Promise<any> => {
    return withAccount(async (account) => {
      const token = await createEvidenceRequestJWT(deviceCode, account.clientID)
      const { data } = await apiClient.delete<any>(
        `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      return data
    })
  }

  const createEmailVerification = async (email: string): Promise<any> => {
    return withAccount(async () => {
      const { data } = await apiClient.post<any>(`${apiClient.endpoints.evidence}/v1/emails`, { email_address: email })
      return data
    })
  }

  const sendEmailVerificationCode = async (code: string, emailAddressId: string): Promise<void> => {
    return withAccount(async () => {
      const { data } = await apiClient.put<void>(`${apiClient.endpoints.evidence}/v1/emails/${emailAddressId}`, {
        verification_code: code,
      })
      return data
    })
  }

  return {
    createVerificationRequest,
    uploadPhotoEvidence,
    uploadVideoEvidence,
    sendVerificationRequest,
    getVerificationRequestStatus,
    cancelVerificationRequest,
    getVerificationRequestPrompts,
    createEmailVerification,
    sendEmailVerificationCode,
  }
}

export default useEvidenceApi
