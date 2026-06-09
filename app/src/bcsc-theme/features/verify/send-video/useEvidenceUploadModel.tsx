import useApi from '@/bcsc-theme/api/hooks/useApi'
import {
  VerificationPhotoUploadPayload,
  VerificationPrompt,
  VerificationVideoUploadPayload,
} from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import useEvidenceUpload from '@/bcsc-theme/hooks/useEvidenceUpload'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { safeHost } from '@/bcsc-theme/utils/axios-error-utils'
import { getVideoMetadata } from '@/bcsc-theme/utils/file-info'
import { buildUploadFailureDiagnostics, tagUploadFailure } from '@/bcsc-theme/utils/network-diagnostics'
import { AppError, ErrorRegistry } from '@/errors'
import { useAlerts } from '@/hooks/useAlerts'
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
  const { processAdditionalEvidence } = useEvidenceUpload()
  const { t } = useTranslation()
  const loadingScreen = useLoadingScreen()
  const { fileUploadErrorAlert } = useAlerts(navigation)

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
      // Tag each upload so the first rejection carries which file/host/size failed — without
      // changing Promise.all first-failure-wins semantics (see buildUploadFailureDiagnostics).
      await Promise.all([
        tagUploadFailure(evidence.uploadPhotoEvidenceBinary(photoUploadUri, photoBytes), {
          kind: 'photo',
          host: safeHost(photoUploadUri),
          sizeBytes: photoBytes.length,
        }),
        tagUploadFailure(evidence.uploadVideoEvidenceBinary(videoUploadUri, videoBytes), {
          kind: 'video',
          host: safeHost(videoUploadUri),
          sizeBytes: videoBytes.length,
        }),
        ...additionalUploads.map(({ uploadUri, imageBytes }) =>
          tagUploadFailure(evidence.uploadPhotoEvidenceBinary(uploadUri, imageBytes), {
            kind: 'document',
            host: safeHost(uploadUri),
            sizeBytes: imageBytes.length,
          })
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
    const startedAt = Date.now()
    // Tracks which step is executing so a failure can report where it occurred.
    let stage = 'validate'
    const stopLoading = loadingScreen.startLoading(t('BCSC.SendVideo.UploadProgress.PreparingVideo'))
    try {
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

      stage = 'prepare-local-files'
      const localFiles = await prepareLocalFiles(photoPath, videoPath, videoDuration, prompts)

      stage = 'process-additional-evidence'
      loadingScreen.updateLoadingMessage(t('BCSC.SendVideo.UploadProgress.PreparingDocuments'))
      const additionalEvidence = await processAdditionalEvidence()

      stage = 'upload-metadata'
      loadingScreen.updateLoadingMessage(t('BCSC.SendVideo.UploadProgress.UploadingInformation'))
      const evidenceMetadata = await uploadEvidenceMetadata(photoMetadata, localFiles.videoMetadata)

      stage = 'upload-binaries'
      await uploadEvidenceFiles(
        evidenceMetadata.photoMetadataResponse.upload_uri,
        localFiles.photoBytes,
        evidenceMetadata.videoMetadataResponse.upload_uri,
        localFiles.videoBytes,
        additionalEvidence
      )

      stage = 'finalize'
      loadingScreen.updateLoadingMessage(t('BCSC.SendVideo.UploadProgress.FinalizingVerification'))
      const additionalUploadUris = additionalEvidence.map(({ uploadUri }) => uploadUri)
      await finalizeVerification(
        evidenceMetadata.photoMetadataResponse.upload_uri,
        evidenceMetadata.videoMetadataResponse.upload_uri,
        additionalUploadUris,
        verificationRequestId,
        verificationRequestSha
      )

      stage = 'update-flags'
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
      /**
       * Dev note: evidence_upload_server_error + evidence_upload_unkown_error are both deprecated in the IAS documentation.
       * So all errors during the upload process will be categorized as FILE_UPLOAD_ERROR.
       */
      const appError = AppError.fromErrorDefinition(ErrorRegistry.FILE_UPLOAD_ERROR, { cause: error })

      // Surface user feedback immediately, then gather + log failure-time diagnostics in the
      // background so a (possibly slow) NetInfo.refresh() can't keep the user on the loading
      // spinner. The diagnostics distinguish a genuinely offline device from a host-specific
      // transport failure — the wrapped FILE_UPLOAD_ERROR otherwise flattens an axios
      // ERR_NETWORK into a misleading "no internet" message (issue #4010).
      fileUploadErrorAlert(appError)
      void buildUploadFailureDiagnostics(error, { stage, startedAt })
        .then((diagnostics) =>
          logger.error('[useEvidenceUploadModel] Error during evidence upload process', diagnostics, appError)
        )
        .catch(() => {
          // Diagnostics are best-effort; never let them mask the original failure handling.
        })
    } finally {
      stopLoading()
    }
  }, [
    fileUploadErrorAlert,
    finalizeVerification,
    loadingScreen,
    logger,
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
