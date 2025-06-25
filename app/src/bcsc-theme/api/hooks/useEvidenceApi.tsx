import apiClient from '../client'
import { withAccount } from './withAccountGuard'

interface VerificationPrompt {
  id: number
  prompt: string
}
interface VerificationResponseData {
  id: string
  sha256: string
  prompts: VerificationPrompt[]
}

interface SendVerificationPayload {
  upload_uris: string[]
  sha256: string
}

interface VerificationStatusResponseData {
  id: string
  status: 'pending' | 'verified' | 'cancelled'
  status_message?: string
  expires_in?: string
  avg_turnaround_time_message?: string
}

interface VerificationPhotoUploadPayload {
  label: string
  content_type: string
  content_length: number
  date: string
  sha256: string
}

interface VerificationVideoUploadPayload {
  content_type: string
  content_length: number
  date: string
  sha256: string
  duration: number
  prompts: VerificationPrompt[]
}

const useEvidenceApi = () => {
  // This needs ot be called for the process to start
  const createVerificationRequest = async (): Promise<VerificationResponseData> => {
    return withAccount(async () => {
      const { data } = await apiClient.post<VerificationResponseData>(
        `${apiClient.endpoints.evidence}/v1/verifications`
      )
      return data
    })
  }

  const uploadPhotoEvidence = async (payload: VerificationPhotoUploadPayload): Promise<void> => {
    return withAccount(async () => {
      const { data } = await apiClient.post<void>(`${apiClient.endpoints.evidence}/v1/photos`, payload)
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

  const cancelVerificationRequest = async (verificationRequestId: string): Promise<void> => {
    return withAccount(async () => {
      const { data } = await apiClient.delete<void>(
        `${apiClient.endpoints.evidence}/v1/verifications/${verificationRequestId}`
      )
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
  }
}

export default useEvidenceApi
