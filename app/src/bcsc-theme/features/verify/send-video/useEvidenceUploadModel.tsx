import {
  VerificationPhotoUploadPayload,
  VerificationPrompt,
  VerificationVideoUploadPayload,
} from '@/bcsc-theme/api/hooks/useEvidenceApi'
import useAlreadyVerifiedRecovery from '@/bcsc-theme/hooks/useAlreadyVerifiedRecovery'
import useEvidenceUpload from '@/bcsc-theme/hooks/useEvidenceUpload'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useEvidenceService } from '@/bcsc-theme/services/hooks/useEvidenceService'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { withPlausibleCaptureDate } from '@/bcsc-theme/utils/capture-date'
import { getVideoMetadata, removeFileSafely } from '@/bcsc-theme/utils/file-info'
import type { MediaFormat } from '@/bcsc-theme/utils/media-format'
import { normalizeMp4MajorBrand, sniffMediaFormat } from '@/bcsc-theme/utils/media-format'
import { getResumeStepRoute } from '@/bcsc-theme/utils/resume-step-route'
import { VerificationRequestStatus } from '@/constants'
import { isAxiosAppError } from '@/errors/appError'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { BCDispatchAction, BCState } from '@/store'
import readFileInChunks from '@/utils/read-file'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import RNFS from 'react-native-fs'
import { VerificationVideoCache } from './VideoReviewScreen'

enum UploadStage {
  PreparingVideo = 'preparingVideo',
  PreparingDocuments = 'preparingDocuments',
  UploadingFiles = 'uploadingFiles',
  FinalizingVerification = 'finalizingVerification',
  Complete = 'complete',
}

const UPLOAD_PROGRESS: Record<UploadStage, number> = {
  [UploadStage.PreparingVideo]: 0,
  [UploadStage.PreparingDocuments]: 25,
  [UploadStage.UploadingFiles]: 50,
  [UploadStage.FinalizingVerification]: 75,
  [UploadStage.Complete]: 100,
}

/** How a submit run ended. The run only touches the server and the store; `settleSubmit` applies the UI effects. */
type SubmitOutcome =
  | { kind: 'submitted'; avgTurnaroundTimeMessage?: string }
  | { kind: 'reviewCancelled'; agentReason?: string }
  | { kind: 'requestMissing'; error: Error }
  | { kind: 'cancelled' }
  | { kind: 'failed'; error: unknown }

/** The live state of a submit run, shared with every instance showing it. */
interface SubmitProgress {
  stage: UploadStage
  /**
   * Set by any instance's Cancel; the run stops at its next stage boundary and settles as cancelled. Until then it
   * is not joined: a caller arriving after the cancel is a new attempt and starts its own run.
   */
  cancelled: boolean
  /** Stage setters of the instances currently mirroring this run. */
  listeners: Set<(stage: UploadStage) => void>
}

/** One submit of a verification request, awaited by every instance that joined it. */
interface SubmitRun {
  requestId: string | undefined
  progress: SubmitProgress
  /** The most recent caller: the only instance that applies the outcome, so the user sees it once. */
  settler: object
  promise: Promise<SubmitOutcome>
}

/**
 * The submit in flight, shared across every instance of this hook so a second UploadingScreen joins it instead of
 * submitting the same verification request again (#4928, see CONVENTIONS.md).
 */
let inFlightSubmit: SubmitRun | null = null

/**
 * Drops the shared run so a case that failed mid-run cannot be joined by the next one, and reports whether there
 * was one to drop. Tests call this between cases; production code must not.
 */
export const resetInFlightSubmitForTests = (): { wasInFlight: boolean } => {
  const wasInFlight = inFlightSubmit !== null
  inFlightSubmit = null
  return { wasInFlight }
}

const useEvidenceUploadModel = (
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceUploading>
) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store, dispatch] = useStore<BCState>()
  // Identity for the settler check
  const instanceRef = useRef<object>({})
  const evidence = useEvidenceService()
  const { updateAccountFlags, updateVerificationRequest } = useSecureActions()
  const { processAdditionalEvidence } = useEvidenceUpload()
  const { t } = useTranslation()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStage, setUploadStage] = useState(UploadStage.PreparingVideo)
  const { fileUploadErrorAlert, alreadyVerifiedAlert } = useAlerts(navigation)
  const { recoverFromAlreadyVerified } = useAlreadyVerifiedRecovery()

  const { photoPath, videoPath, videoThumbnailPath, videoDuration, prompts, photoMetadata } = store.bcsc
  const { verificationRequestId, verificationRequestSha } = store.bcscSecure

  // Derived from the stage alone so the text keeps matching the bar after an error or completion.
  const uploadMessage = useMemo(() => {
    const messages: Record<UploadStage, string> = {
      [UploadStage.PreparingVideo]: t('BCSC.SendVideo.UploadProgress.PreparingVideo'),
      [UploadStage.PreparingDocuments]: t('BCSC.SendVideo.UploadProgress.PreparingDocuments'),
      [UploadStage.UploadingFiles]: t('BCSC.SendVideo.UploadProgress.UploadingFiles'),
      [UploadStage.FinalizingVerification]: t('BCSC.SendVideo.UploadProgress.FinalizingVerification'),
      [UploadStage.Complete]: t('BCSC.SendVideo.UploadProgress.FinalizingVerification'),
    }
    return messages[uploadStage]
  }, [t, uploadStage])

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

      // Must run before getVideoMetadata hashes the bytes, so the sha256 matches what is uploaded.
      const rewrittenBrand = normalizeMp4MajorBrand(videoBytes)
      if (rewrittenBrand) {
        logger.info(`Rewrote selfie video MP4 brand from ${rewrittenBrand} to mp42`)
      }

      // Implausible-mtime substitution (#4338) lives inside getVideoMetadata now — see file-info.ts.
      const videoMetadata = await getVideoMetadata(videoBytes, videoDuration, prompts, videoStats.mtime, logger)

      logger.debug(`Selfie photo bytes length: ${photoBytes.length}`)
      logger.debug(`Selfie video bytes length: ${videoBytes.length}`)

      return { photoBytes, videoBytes, videoMetadata }
    },
    [logger]
  )

  const uploadEvidenceMetadata = useCallback(
    async (
      photoMetadata: VerificationPhotoUploadPayload,
      videoMetadata: VerificationVideoUploadPayload,
      formats: { photo?: MediaFormat; video?: MediaFormat }
    ) => {
      const [photoMetadataResponse, videoMetadataResponse] = await Promise.all([
        evidence.uploadPhotoEvidenceMetadata(photoMetadata, formats.photo),
        evidence.uploadVideoEvidenceMetadata(videoMetadata, formats.video),
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
        evidence.uploadPhotoEvidenceBinary(photoUploadUri, photoBytes, 'image'),
        evidence.uploadVideoEvidenceBinary(videoUploadUri, videoBytes),
        ...additionalUploads.map(({ uploadUri, imageBytes }) =>
          evidence.uploadPhotoEvidenceBinary(uploadUri, imageBytes, 'document')
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
      const response = await evidence.sendVerificationRequest(requestId, {
        upload_uris: allUploadUris,
        sha256: requestSha,
      })
      logger.debug('Completed verification request')
      return response
    },
    [evidence, logger]
  )

  /**
   * Uploads the evidence and submits the verification request. Server and store effects only: every way it can
   * end is returned for `settleSubmit`, so a run shared by two screens changes the server and the store once and
   * the screen the user is looking at applies the result.
   */
  const runSubmit = useCallback(
    async (progress: SubmitProgress): Promise<SubmitOutcome> => {
      const setStage = (stage: UploadStage) => {
        progress.stage = stage
        progress.listeners.forEach((listener) => listener(stage))
      }

      try {
        if (!photoPath || !videoPath || !videoDuration) {
          throw new Error('Missing photo or video data')
        }

        if (!prompts || prompts.length === 0) {
          throw new Error('Missing video prompts data')
        }

        if (!verificationRequestId || !verificationRequestSha) {
          logger.warn(
            '[useEvidenceUploadModel] Missing verification request data at submit; routing back to Verification Method Selection so prompts can be refreshed and video re-recorded'
          )
          await updateVerificationRequest(undefined, null)
          dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [undefined] })
          dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
          return {
            kind: 'requestMissing',
            error: new Error('Missing verification request data, resetting so you can try again.'),
          }
        }

        if (!photoMetadata) {
          throw new Error('Missing photo metadata')
        }

        const localFiles = await prepareLocalFiles(photoPath, videoPath, videoDuration, prompts)
        if (progress.cancelled) {
          return { kind: 'cancelled' }
        }

        setStage(UploadStage.PreparingDocuments)
        const additionalEvidence = await processAdditionalEvidence()
        if (progress.cancelled) {
          return { kind: 'cancelled' }
        }

        setStage(UploadStage.UploadingFiles)
        // AC3 boundary check — see capture-date.ts's file header for scoping. Reached
        // independently of the live-call flow's equivalent guard in uploadSelfiePhoto: send-video
        // is a first-class choice on Verification Method Selection, and the fallback when a call
        // is busy or closed, so it needs its own.
        const selfieMetadata = await withPlausibleCaptureDate(photoMetadata, logger)

        const evidenceMetadata = await uploadEvidenceMetadata(selfieMetadata, localFiles.videoMetadata, {
          photo: sniffMediaFormat(localFiles.photoBytes),
          video: sniffMediaFormat(localFiles.videoBytes),
        })
        if (progress.cancelled) {
          return { kind: 'cancelled' }
        }

        await uploadEvidenceFiles(
          evidenceMetadata.photoMetadataResponse.upload_uri,
          localFiles.photoBytes,
          evidenceMetadata.videoMetadataResponse.upload_uri,
          localFiles.videoBytes,
          additionalEvidence
        )
        if (progress.cancelled) {
          return { kind: 'cancelled' }
        }

        setStage(UploadStage.FinalizingVerification)
        const additionalUploadUris = additionalEvidence.map(({ uploadUri }) => uploadUri)
        const verificationResponse = await finalizeVerification(
          evidenceMetadata.photoMetadataResponse.upload_uri,
          evidenceMetadata.videoMetadataResponse.upload_uri,
          additionalUploadUris,
          verificationRequestId,
          verificationRequestSha
        )

        // A submit reconciled against a request the server already reviewed (see useEvidenceService) can come
        // back cancelled: "Successfully sent" would only bounce the user here through the pending screen's check
        if (verificationResponse?.status === VerificationRequestStatus.CANCELLED) {
          setStage(UploadStage.Complete)
          return { kind: 'reviewCancelled', agentReason: verificationResponse.status_message }
        }

        await updateAccountFlags({
          userSubmittedVerificationVideo: true,
        })

        // Capture a timestamp when the user successfully submits their verification video. This is needed on the pending review screen
        dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_VIDEO_SUBMITTED_AT, payload: [new Date()] })

        setStage(UploadStage.Complete)
        return { kind: 'submitted', avgTurnaroundTimeMessage: verificationResponse?.avg_turnaround_time_message }
      } catch (error) {
        // Cancel removes the media out from under the run, so a failure after it is the cancel, not news
        return progress.cancelled ? { kind: 'cancelled' } : { kind: 'failed', error }
      }
    },
    [
      dispatch,
      finalizeVerification,
      logger,
      photoMetadata,
      photoPath,
      prepareLocalFiles,
      processAdditionalEvidence,
      prompts,
      updateAccountFlags,
      updateVerificationRequest,
      uploadEvidenceFiles,
      uploadEvidenceMetadata,
      verificationRequestId,
      verificationRequestSha,
      videoDuration,
      videoPath,
    ]
  )

  const surfaceFailure = useCallback(
    async (error: unknown) => {
      // 409 on the evidence endpoints means the registration request is already approved
      if (isAxiosAppError(error, 409)) {
        const recovered = await recoverFromAlreadyVerified()
        if (!recovered) {
          alreadyVerifiedAlert(error)
        }
        return
      }

      // Use the original AppError and fallback to FILE_UPLOAD_ERROR
      const appError = ensureAppError(error, AppEventCode.FILE_UPLOAD_ERROR)

      logger.error('[useEvidenceUploadModel] Error during evidence upload process', appError)

      if (!appError.handled) {
        fileUploadErrorAlert(appError)
      }
    },
    [alreadyVerifiedAlert, fileUploadErrorAlert, logger, recoverFromAlreadyVerified]
  )

  /** Applies a settled run to the screen — navigation and alerts — once, from the most recent caller. */
  const settleSubmit = useCallback(
    async (outcome: SubmitOutcome) => {
      switch (outcome.kind) {
        case 'submitted':
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: BCSCScreens.SuccessfullySent,
                  params: { avgTurnaroundTimeMessage: outcome.avgTurnaroundTimeMessage },
                },
              ],
            })
          )
          return
        case 'reviewCancelled':
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: BCSCScreens.CancelledReview,
                  params: { agentReason: outcome.agentReason },
                },
              ],
            })
          )
          return
        case 'requestMissing':
          // The alert then pops on top of the destination screen, so the user knows why they were moved
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [getResumeStepRoute(store)],
            })
          )
          await surfaceFailure(outcome.error)
          return
        case 'failed':
          await surfaceFailure(outcome.error)
          return
        case 'cancelled':
          return
      }
    },
    [navigation, store, surfaceFailure]
  )

  const handleSend = useCallback(async () => {
    setIsUploading(true)

    let run = inFlightSubmit
    // A cancelled run is draining, not submitting (see SubmitProgress.cancelled)
    if (run === null || run.requestId !== verificationRequestId || run.progress.cancelled) {
      const progress: SubmitProgress = { stage: UploadStage.PreparingVideo, cancelled: false, listeners: new Set() }
      const started: SubmitRun = {
        requestId: verificationRequestId,
        progress,
        settler: instanceRef.current,
        promise: runSubmit(progress),
      }
      started.promise = started.promise.finally(() => {
        if (inFlightSubmit === started) {
          inFlightSubmit = null
        }
      })
      inFlightSubmit = started
      run = started
    } else {
      logger.warn(
        '[useEvidenceUploadModel] A submit for this verification request is already in flight; joining it instead of submitting again'
      )
    }

    run.settler = instanceRef.current
    run.progress.listeners.add(setUploadStage)
    setUploadStage(run.progress.stage)

    try {
      const outcome = await run.promise
      if (run.settler === instanceRef.current) {
        await settleSubmit(outcome)
      }
    } finally {
      run.progress.listeners.delete(setUploadStage)
      setIsUploading(false)
    }
  }, [logger, runSubmit, settleSubmit, verificationRequestId])

  const handleCancel = useCallback(async () => {
    if (inFlightSubmit !== null) {
      inFlightSubmit.progress.cancelled = true
    }
    await Promise.allSettled([
      removeFileSafely(photoPath, logger),
      removeFileSafely(videoPath, logger),
      removeFileSafely(videoThumbnailPath, logger),
    ])
    VerificationVideoCache.clearCache()
    dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
    navigation.goBack()
  }, [dispatch, logger, navigation, photoPath, videoPath, videoThumbnailPath])

  return {
    handleSend,
    handleCancel,
    isReady,
    isUploading,
    uploadMessage,
    progressPercent: UPLOAD_PROGRESS[uploadStage],
  }
}

export default useEvidenceUploadModel
