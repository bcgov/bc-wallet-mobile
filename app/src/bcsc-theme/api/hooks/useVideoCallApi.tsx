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
    if (!code) throw new Error('Device code is missing. Re install the app and try again.')
    return code
  }, [store.bcsc.deviceCode])

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

  const sendEvidenceMetadata = useCallback(
    async (payload: EvidenceMetadataPayload): Promise<UploadEvidenceResponseData[]> => {
      return withAccount(async (account) => {
        const token = await createEvidenceRequestJWT(_getDeviceCode(), account.clientID)
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
