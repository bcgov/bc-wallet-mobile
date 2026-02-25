import useApi from '@/bcsc-theme/api/hooks/useApi'
import { UploadEvidenceResponseData } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { BCState } from '@/store'
import readFileInChunks from '@/utils/read-file'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback } from 'react'

export interface EvidenceUploadItem {
  uploadUri: string
  imageBytes: Buffer
}

const useEvidenceUpload = () => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
  const { evidence } = useApi()

  /**
   * Uploads the selfie photo (metadata + binary) that was captured during the
   * pre-verification photo step. No-ops if no photo is available in the store.
   */
  const uploadSelfiePhoto = useCallback(async () => {
    const { photoPath, photoMetadata } = store.bcsc
    if (!photoPath || !photoMetadata) {
      logger.debug('No selfie photo to upload')
      return
    }

    logger.info('Uploading selfie photo...')
    const metadataResponse = await evidence.uploadPhotoEvidenceMetadata(photoMetadata)
    const photoBytes = await readFileInChunks(photoPath, logger)
    await evidence.uploadPhotoEvidenceBinary(metadataResponse.upload_uri, photoBytes)
    logger.info(`Selfie photo uploaded: ${photoBytes.length} bytes`)
  }, [evidence, logger, store.bcsc])

  /**
   * Processes additional evidence documents (secondary ID for NonPhoto BCSC).
   * Sends metadata to the evidence API and reads image files from disk.
   * Returns an array of { uploadUri, imageBytes } items ready for binary upload.
   *
   * Used by both the live-call flow (uploads immediately) and the send-video
   * flow (batches with photo + video in a single Promise.all).
   */
  const processAdditionalEvidence = useCallback(async (): Promise<EvidenceUploadItem[]> => {
    const additionalEvidence = store.bcscSecure.additionalEvidenceData
    const evidenceUploads: EvidenceUploadItem[] = []

    if (!additionalEvidence || additionalEvidence.length === 0) {
      logger.debug('No additional evidence to process')
      return evidenceUploads
    }

    logger.info(`Processing ${additionalEvidence.length} additional evidence item(s)...`)

    for (const evidenceItem of additionalEvidence) {
      const metadataPayload = {
        type: evidenceItem.evidenceType.evidence_type,
        number: evidenceItem.documentNumber,
        images: evidenceItem.metadata.map((data) => {
          return { ...data, file_path: undefined }
        }),
      }

      const evidenceMetadataResponse = await evidence.sendEvidenceMetadata(metadataPayload)
      logger.debug(`Evidence metadata sent for ${metadataPayload.type}`)

      for (const metadataItem of evidenceItem.metadata) {
        const matchingResponse = evidenceMetadataResponse.find(
          (response: UploadEvidenceResponseData) => response.label === metadataItem.label
        )

        if (matchingResponse) {
          const imageBytes = await readFileInChunks(metadataItem.file_path, logger)
          logger.debug(`Evidence file read for ${metadataItem.label}: ${imageBytes.length} bytes`)
          evidenceUploads.push({ uploadUri: matchingResponse.upload_uri, imageBytes })
        }
      }
    }

    return evidenceUploads
  }, [evidence, logger, store.bcscSecure.additionalEvidenceData])

  /**
   * Uploads binary data for a list of evidence items that were previously
   * processed by processAdditionalEvidence.
   */
  const uploadEvidenceBinaries = useCallback(
    async (items: EvidenceUploadItem[]) => {
      for (const { uploadUri, imageBytes } of items) {
        await evidence.uploadPhotoEvidenceBinary(uploadUri, imageBytes)
      }
      if (items.length > 0) {
        logger.info(`All additional evidence uploaded (${items.length} file(s))`)
      }
    },
    [evidence, logger]
  )

  return {
    uploadSelfiePhoto,
    processAdditionalEvidence,
    uploadEvidenceBinaries,
  }
}

export default useEvidenceUpload
