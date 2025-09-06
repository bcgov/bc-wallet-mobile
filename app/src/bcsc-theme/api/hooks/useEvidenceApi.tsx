import { useCallback, useMemo } from 'react'
import { useStore } from '@bifold/core'
import apiClient from '../client'
import { withAccount } from './withAccountGuard'
import { createPreVerificationJWT } from 'react-native-bcsc-core'
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

export interface EvidenceImageSide {
  image_side_name: 'FRONT_SIDE' | 'BACK_SIDE'
  image_side_label: string
  image_side_tip: string
}

export interface EvidenceType {
  evidence_type: string
  has_photo: boolean
  group: 'BRITISH COLUMBIA' | 'CANADA, OR OTHER LOCATION IN CANADA' | 'UNITED STATES' | 'OTHER COUNTRIES'
  group_sort_order: number
  sort_order: number
  collection_order: 'FIRST' | 'SECOND' | 'BOTH'
  document_reference_input_mask: string // a regex mask for ID document reference input, number only can indicate to use a number only keyboard
  document_reference_label: string
  document_reference_sample: string
  image_sides: EvidenceImageSide[]
  evidence_type_label: string
}
export interface EvidenceMetadataResponseData {
  processes: {
    process: 'IDIM L3 Remote Non-BCSC Identity Verification' | 'IDIM L3 Remote Non-photo BCSC Identity Verification'
    evidence_types: EvidenceType[]
  }[]
}
export interface EvidenceMetadataPayload {
  type: string
  number: string
  images: VerificationPhotoUploadPayload[]
  barcodes?: {
    type: string
  }[]
}

const useEvidenceApi = () => {
  const [store] = useStore<BCState>()

  const _getDeviceCode = useCallback(() => {
    const code = store.bcsc.deviceCode
    if (!code) throw new Error('Device code is missing. Re install the app and setup try again.')
    return code
  }, [store.bcsc.deviceCode])

  const getEvidenceMetadata = useCallback(async (): Promise<EvidenceMetadataResponseData> => {
    const { data } = await apiClient.get<EvidenceMetadataResponseData>(`${apiClient.endpoints.evidence}/metadata`, {
      // Evidence endpoints do not require a full access token
      skipBearerAuth: true,
    })
    return data
  }, [])

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
  }, [_getDeviceCode])

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
    [_getDeviceCode]
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
    [_getDeviceCode]
  )

  const sendVerificationRequest = useCallback(
    async (
      verificationRequestId: string,
      payload: SendVerificationPayload
    ): Promise<VerificationStatusResponseData> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
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
    [_getDeviceCode]
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
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
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
    [_getDeviceCode]
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
    [_getDeviceCode]
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
    [_getDeviceCode]
  )

  const uploadVideoEvidenceBinary = useCallback(
    async (url: string, binaryData: any): Promise<any> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
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
