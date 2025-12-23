import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { getVideoMetadata } from '@/bcsc-theme/utils/file-info'
import { BCState } from '@/store'
import readFileInChunks from '@/utils/read-file'
import { Button, ButtonType, ScreenWrapper, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import RNFS from 'react-native-fs'
import TakeMediaButton from './components/TakeMediaButton'
import { VerificationVideoCache } from './VideoReviewScreen'

type InformationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.InformationRequired>
}

const InformationRequiredScreen = ({ navigation }: InformationRequiredScreenProps) => {
  const { Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
  const { evidence } = useApi()
  const { updateAccountFlags } = useSecureActions()
  const { t } = useTranslation()
  const loadingScreen = useLoadingScreen()

  const uploadedBoth = store.bcsc.photoPath && store.bcsc.videoPath && store.bcsc.videoThumbnailPath
  const prompts = store.bcsc.prompts

  const styles = StyleSheet.create({
    controlsContainer: {
      padding: Spacing.md,
    },
  })

  // TODO (MD): Split this into smaller functions for better readability and testability (MVC pattern?)
  const onPressSend = async () => {
    try {
      loadingScreen.startLoading(t('BCSC.SendVideo.UploadProgress.PreparingVideo'))

      if (!store.bcsc.photoPath || !store.bcsc.videoPath || !store.bcsc.videoDuration) {
        throw new Error('Error - missing photo or video data')
      }

      if (!prompts || prompts.length === 0) {
        throw new Error('Error - missing video prompts data')
      }

      // Fetch photo and video then convert into bytes
      const [photoBytes, videoBytes, videoStats] = await Promise.all([
        readFileInChunks(store.bcsc.photoPath, logger),
        VerificationVideoCache.getCache(logger),
        RNFS.stat(store.bcsc.videoPath),
      ])

      if (!videoBytes) {
        throw new Error('Error - cache missing video data')
      }

      const videoMetadata = await getVideoMetadata(videoBytes, store.bcsc.videoDuration, prompts, videoStats.mtime)

      logger.debug(`Selfie photo bytes length: ${photoBytes.length}`)
      logger.debug(`Selfie video bytes length: ${videoBytes.length}`)

      // Process additional evidence data
      // TODO (bm): store properly typed additional evidence in state
      const additionalEvidence = store.bcscSecure.additionalEvidenceData
      const evidenceUploadPromises: Promise<any>[] = []
      const evidenceUploadUris: string[] = []

      loadingScreen.updateLoadingMessage(t('BCSC.SendVideo.UploadProgress.PreparingDocuments'))

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
        // For each metadata item, find matching upload URI and upload binary
        for (const metadataItem of evidenceItem.metadata) {
          const matchingResponse = evidenceMetadataResponse.find(
            (response: any) => response.label === metadataItem.label
          )

          if (matchingResponse) {
            // Read the image file
            const imageBytes = await readFileInChunks(metadataItem.file_path, logger)
            logger.debug(`Evidence metadata ${metadataItem.label}: ${imageBytes.length}`)

            // Add upload promise
            evidenceUploadPromises.push(evidence.uploadPhotoEvidenceBinary(matchingResponse.upload_uri, imageBytes))

            // Store upload URI for final verification request
            evidenceUploadUris.push(matchingResponse.upload_uri)
          }
        }
      }

      loadingScreen.updateLoadingMessage(t('BCSC.SendVideo.UploadProgress.UploadingInformation'))

      // Send photo and video metadata to API
      const [photoMetadataResponse, videoMetadataResponse] = await Promise.all([
        evidence.uploadPhotoEvidenceMetadata(store.bcsc.photoMetadata!),
        evidence.uploadVideoEvidenceMetadata(videoMetadata),
      ])

      logger.debug(`Photo/ Video metadata responded`)

      // Upload all binaries in parallel (photo, video, and additional evidence)
      await Promise.all([
        evidence.uploadPhotoEvidenceBinary(photoMetadataResponse.upload_uri, photoBytes),
        evidence.uploadVideoEvidenceBinary(videoMetadataResponse.upload_uri, videoBytes),
        ...evidenceUploadPromises, // Spread the additional evidence upload promises
      ])
      logger.debug(`Uploaded all binaries`)

      // Combine all upload URIs for final verification request
      const allUploadUris = [photoMetadataResponse.upload_uri, videoMetadataResponse.upload_uri, ...evidenceUploadUris]

      loadingScreen.updateLoadingMessage(t('BCSC.SendVideo.UploadProgress.FinalizingVerification'))

      // Send final verification request
      await evidence.sendVerificationRequest(store.bcscSecure.verificationRequestId!, {
        upload_uris: allUploadUris,
        sha256: store.bcscSecure.verificationRequestSha!,
      })
      logger.debug(`Completed verification request`)

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
      // TODO (MD): Handle this error properly (show user feedback etc...)
      logger.error('Error during sending information to Service BC', error as Error)
    } finally {
      loadingScreen.stopLoading()
    }
  }

  const controls = (
    <Button
      buttonType={ButtonType.Primary}
      title={t('BCSC.SendVideo.InformationRequired.ButtonText')}
      onPress={onPressSend}
      testID={'SendToServiceBCNow'}
      accessibilityLabel={t('BCSC.SendVideo.InformationRequired.ButtonText')}
      disabled={!uploadedBoth || loadingScreen.isLoading}
    />
  )

  return (
    <ScreenWrapper
      padded={false}
      edges={['bottom']}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
    >
      <TakeMediaButton
        onPress={() => {
          navigation.navigate(BCSCScreens.PhotoInstructions, { forLiveCall: false })
        }}
        title={t('BCSC.SendVideo.InformationRequired.Heading1')}
        actionLabel={t('BCSC.SendVideo.InformationRequired.ActionLabel')}
        thumbnailUri={store.bcsc.photoPath && `file://${store.bcsc.photoPath}`}
        style={{ borderBottomWidth: 0 }}
      />
      <TakeMediaButton
        onPress={() => {
          navigation.navigate(BCSCScreens.VideoInstructions)
        }}
        title={t('BCSC.SendVideo.InformationRequired.Heading2')}
        actionLabel={t('BCSC.SendVideo.InformationRequired.ActionLabel2')}
        thumbnailUri={
          store.bcsc.videoPath && store.bcsc.videoThumbnailPath && `file://${store.bcsc.videoThumbnailPath}`
        }
      />
    </ScreenWrapper>
  )
}

export default InformationRequiredScreen
