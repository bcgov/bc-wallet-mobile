import useApi from '@/bcsc-theme/api/hooks/useApi'
import {
  UploadEvidenceResponseData,
  VerificationPhotoUploadPayload,
  VerificationPrompt,
  VerificationVideoUploadPayload,
} from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { getVideoMetadata } from '@/bcsc-theme/utils/file-info'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppError, ErrorRegistry } from '@/errors'
import { BCState } from '@/store'
import readFileInChunks from '@/utils/read-file'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import RNFS from 'react-native-fs'
import { VerificationVideoCache } from './VideoReviewScreen'

const useEvidenceUploadModel = (
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.InformationRequired>
) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
  const { evidence } = useApi()
  const { updateAccountFlags } = useSecureActions()
  const { t } = useTranslation()
  const loadingScreen = useLoadingScreen()
  const { emitErrorAlert } = useErrorAlert()

  const { photoPath, videoPath, videoThumbnailPath, videoDuration, prompts, photoMetadata } = store.bcsc
  const { verificationRequestId, verificationRequestSha } = store.bcscSecure

  const isReady = useMemo(
    () => Boolean(photoPath && videoPath && videoThumbnailPath),
    [photoPath, videoPath, videoThumbnailPath]
  )

  const prepareLocalFiles = useCallback(
    async (photoPath: string, videoPath: string, videoDuration: number, prompts: VerificationPrompt[]) => {
      const [photoBytes, videoBytes, videoStats] = await Promise.all([
        readFileInChunks(photoPath, logger),
        VerificationVideoCache.getCache(logger),
        RNFS.stat(videoPath),
      ])

      if (!videoBytes) {
        throw new Error('Cache missing video data')
      }

      const videoMetadata = await getVideoMetadata(videoBytes, videoDuration, prompts, videoStats.mtime)

      logger.debug(`Selfie photo bytes length: ${photoBytes.length}`)
      logger.debug(`Selfie video bytes length: ${videoBytes.length}`)

      return { photoBytes, videoBytes, videoMetadata }
    },
    [logger]
  )

  const processAdditionalEvidence = useCallback(async () => {
    // Process additional evidence data
    // TODO (bm): store properly typed additional evidence in state
    const additionalEvidence = store.bcscSecure.additionalEvidenceData
    const evidenceUploads: { uploadUri: string; imageBytes: Buffer }[] = []

    // Process each piece of additional evidence
    for (const evidenceItem of additionalEvidence) {
      // Upload metadata for each evidence type to get upload URIs
      const metadataPayload = {
        type: evidenceItem.evidenceType.evidence_type,
        number: evidenceItem.documentNumber,
        images: evidenceItem.metadata.map((data) => {
          return { ...data, file_path: undefined }
        }),
      }

      const evidenceMetadataResponse = await evidence.sendEvidenceMetadata(metadataPayload)
      logger.debug(`Evidence metadata for ${metadataPayload.type}`)
      // For each metadata item, find matching upload URI and read binary
      for (const metadataItem of evidenceItem.metadata) {
        const matchingResponse = evidenceMetadataResponse.find(
          (response: UploadEvidenceResponseData) => response.label === metadataItem.label
        )

        if (matchingResponse) {
          // Read the image file
          const imageBytes = await readFileInChunks(metadataItem.file_path, logger)
          logger.debug(`Evidence metadata ${metadataItem.label}: ${imageBytes.length}`)

          evidenceUploads.push({ uploadUri: matchingResponse.upload_uri, imageBytes })
        }
      }
    }

    return evidenceUploads
  }, [evidence, logger, store.bcscSecure.additionalEvidenceData])

  const uploadEvidenceMetadata = useCallback(
    async (photoMetadata: VerificationPhotoUploadPayload, videoMetadata: VerificationVideoUploadPayload) => {
      const [photoMetadataResponse, videoMetadataResponse] = await Promise.all([
        evidence.uploadPhotoEvidenceMetadata(photoMetadata),
        evidence.uploadVideoEvidenceMetadata(videoMetadata),
      ])

      logger.debug('Photo/Video metadata responded')

      return { photoMetadataResponse, videoMetadataResponse }
    },
    [evidence, logger]
  )

  const uploadEvidenceFiles = useCallback(
    async (
      photoUploadUri: string,
      photoBytes: Buffer,
      videoUploadUri: string,
      videoBytes: Buffer,
      additionalUploads: { uploadUri: string; imageBytes: Buffer }[]
    ) => {
      await Promise.all([
        evidence.uploadPhotoEvidenceBinary(photoUploadUri, photoBytes),
        evidence.uploadVideoEvidenceBinary(videoUploadUri, videoBytes),
        ...additionalUploads.map(({ uploadUri, imageBytes }) =>
          evidence.uploadPhotoEvidenceBinary(uploadUri, imageBytes)
        ),
      ])
      logger.debug('Uploaded all evidence files')
    },
    [evidence, logger]
  )

  const finalizeVerification = useCallback(
    async (
      photoUploadUri: string,
      videoUploadUri: string,
      additionalUploadUris: string[],
      requestId: string,
      requestSha: string
    ) => {
      const allUploadUris = [photoUploadUri, videoUploadUri, ...additionalUploadUris]
      await evidence.sendVerificationRequest(requestId, {
        upload_uris: allUploadUris,
        sha256: requestSha,
      })
      logger.debug('Completed verification request')
    },
    [evidence, logger]
  )

  const handleSend = useCallback(async () => {
    emitErrorAlert(AppError.fromErrorDefinition(ErrorRegistry.FILE_UPLOAD_ERROR, { cause: new Error('blarh') }))
    return
    try {
      loadingScreen.startLoading(t('BCSC.SendVideo.UploadProgress.PreparingVideo'))

      if (!photoPath || !videoPath || !videoDuration) {
        throw new Error('Missing photo or video data')
      }

      if (!prompts || prompts.length === 0) {
        throw new Error('Missing video prompts data')
      }

      if (!verificationRequestId || !verificationRequestSha) {
        throw new Error('Missing verification request data')
      }

      if (!photoMetadata) {
        throw new Error('Missing photo metadata')
      }

      let photoBytes: Buffer
      let videoBytes: Buffer
      let videoMetadata: VerificationVideoUploadPayload
      try {
        const result = await prepareLocalFiles(photoPath, videoPath, videoDuration, prompts)
        photoBytes = result.photoBytes
        videoBytes = result.videoBytes
        videoMetadata = result.videoMetadata
      } catch (error) {
        emitErrorAlert(AppError.fromErrorDefinition(ErrorRegistry.FILE_UPLOAD_ERROR, { cause: error }))
        return
      }

      loadingScreen.updateLoadingMessage(t('BCSC.SendVideo.UploadProgress.PreparingDocuments'))
      let additionalEvidence: { uploadUri: string; imageBytes: Buffer }[]
      try {
        additionalEvidence = await processAdditionalEvidence()
      } catch (error) {
        emitErrorAlert(AppError.fromErrorDefinition(ErrorRegistry.EVIDENCE_UPLOAD_SERVER_ERROR, { cause: error }))
        return
      }

      loadingScreen.updateLoadingMessage(t('BCSC.SendVideo.UploadProgress.UploadingInformation'))

      let photoMetadataResponse: { upload_uri: string }
      let videoMetadataResponse: { upload_uri: string }
      try {
        const result = await uploadEvidenceMetadata(photoMetadata, videoMetadata)
        photoMetadataResponse = result.photoMetadataResponse
        videoMetadataResponse = result.videoMetadataResponse
      } catch (error) {
        emitErrorAlert(AppError.fromErrorDefinition(ErrorRegistry.EVIDENCE_UPLOAD_SERVER_ERROR, { cause: error }))
        return
      }

      try {
        await uploadEvidenceFiles(
          photoMetadataResponse.upload_uri,
          photoBytes,
          videoMetadataResponse.upload_uri,
          videoBytes,
          additionalEvidence
        )
      } catch (error) {
        emitErrorAlert(AppError.fromErrorDefinition(ErrorRegistry.EVIDENCE_UPLOAD_SERVER_ERROR, { cause: error }))
        return
      }

      loadingScreen.updateLoadingMessage(t('BCSC.SendVideo.UploadProgress.FinalizingVerification'))
      try {
        const additionalUploadUris = additionalEvidence.map(({ uploadUri }) => uploadUri)
        await finalizeVerification(
          photoMetadataResponse.upload_uri,
          videoMetadataResponse.upload_uri,
          additionalUploadUris,
          verificationRequestId,
          verificationRequestSha
        )
      } catch (error) {
        emitErrorAlert(AppError.fromErrorDefinition(ErrorRegistry.EVIDENCE_UPLOAD_SERVER_ERROR, { cause: error }))
        return
      }

      await updateAccountFlags({
        userSubmittedVerificationVideo: true,
      })

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SuccessfullySent }],
        })
      )
    } catch (error) {
      emitErrorAlert(AppError.fromErrorDefinition(ErrorRegistry.EVIDENCE_UPLOAD_UNKNOWN_ERROR, { cause: error }))
    } finally {
      loadingScreen.stopLoading()
    }
  }, [
    emitErrorAlert,
    finalizeVerification,
    loadingScreen,
    navigation,
    photoMetadata,
    photoPath,
    prepareLocalFiles,
    processAdditionalEvidence,
    prompts,
    t,
    updateAccountFlags,
    uploadEvidenceFiles,
    uploadEvidenceMetadata,
    verificationRequestId,
    verificationRequestSha,
    videoDuration,
    videoPath,
  ])

  return {
    handleSend,
    isReady,
    isLoading: loadingScreen.isLoading,
  }
}

export default useEvidenceUploadModel
