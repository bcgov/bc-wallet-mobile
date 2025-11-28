import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { MediaCache } from '@/bcsc-theme/utils/media-cache'
import { BCDispatchAction, BCState } from '@/store'
import readFileInChunks from '@/utils/read-file'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import type { OnLoadData } from 'react-native-video'
import { Video, VideoRef } from 'react-native-video'

export const VerificationVideoCache = new MediaCache()

const pauseButtonSize = 60

type VideoReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VideoReview>
  route: {
    params: {
      videoPath: string
      videoThumbnailPath: string
    }
  }
}

const VideoReviewScreen = ({ navigation, route }: VideoReviewScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { width } = useWindowDimensions()
  const [paused, setPaused] = useState(false)
  const videoRef = useRef<VideoRef>(null)
  const { videoPath, videoThumbnailPath } = route.params
  const { t } = useTranslation()

  if (!videoPath || !videoThumbnailPath) {
    throw new Error(t('BCSC.SendVideo.VideoReview.VideoErrorPath'))
  }

  const styles = StyleSheet.create({
    pageContainer: {
      position: 'relative',
      flexGrow: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    contentContainer: {
      flexGrow: 1,
    },
    videoContainer: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
    },
    heading: {
      textAlign: 'center',
      marginBottom: Spacing.md,
      width: '100%',
    },
    video: {
      height: width - 2 * Spacing.md,
      width: width - 2 * Spacing.md,
      aspectRatio: 1,
    },
    pauseButton: {
      backgroundColor: ColorPalette.grayscale.white,
      width: pauseButtonSize,
      height: pauseButtonSize,
      borderRadius: pauseButtonSize / 2,
      marginTop: Spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    controlsContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: Spacing.md,
    },
    secondButton: {
      marginTop: Spacing.sm,
    },
  })

  const onPressUse = () => {
    dispatch({ type: BCDispatchAction.SAVE_VIDEO_THUMBNAIL, payload: [videoThumbnailPath] })
    navigation.dispatch(
      CommonActions.reset({
        index: 2,
        routes: [
          { name: BCSCScreens.SetupSteps },
          { name: BCSCScreens.VerificationMethodSelection },
          { name: BCSCScreens.InformationRequired },
        ],
      })
    )
  }

  const onTogglePause = () => {
    setPaused((prev) => !prev)
  }

  const onPressRetake = () => {
    dispatch({ type: BCDispatchAction.SAVE_VIDEO_THUMBNAIL, payload: [''] })
    navigation.goBack()
  }

  /**
   * Optimistically caches the video and extracts its metadata in the background,
   * allowing the user to upload videos with minimal waiting time.
   *
   * Note: If the user navigates quickly through the flow, the InformationRequiredScreen will just wait
   * for the video disk read to complete before proceeding.
   *
   * @param {OnLoadData} data The data object containing video load information.
   * @returns {*} {Promise<void>} A promise that resolves when the video metadata is processed and cached.
   */
  const onVideoLoad = async (data: OnLoadData) => {
    try {
      // Clear the previously cached video
      VerificationVideoCache.clearCache()

      const videoFilePromise = readFileInChunks(videoPath, logger)

      // Set cache to a promise to be resolved by whoever needs it first
      VerificationVideoCache.setCache(videoFilePromise)
    } catch (error) {
      logger.error('Error caching video file:', error as Error)
    } finally {
      // Optimistically save the video path and duration
      dispatch({
        type: BCDispatchAction.SAVE_VIDEO,
        payload: [{ videoPath: videoPath, videoDuration: Math.floor(data.duration) }],
      })
    }
  }

  return (
    <SafeAreaView style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <View style={styles.videoContainer}>
          <ThemedText variant={'headingFour'} style={styles.heading}>
            {t('BCSC.SendVideo.VideoReview.Heading')}
          </ThemedText>
          <Video
            ref={videoRef}
            source={{ uri: videoPath }}
            paused={paused}
            audioOutput={'speaker'}
            repeat
            resizeMode={'cover'}
            style={styles.video}
            onLoad={(data) => onVideoLoad(data)}
            disableAudioSessionManagement
          />
          <TouchableOpacity style={styles.pauseButton} onPress={onTogglePause}>
            <Icon
              name={paused ? 'play' : 'pause'}
              size={pauseButtonSize}
              color={ColorPalette.brand.primaryBackground}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.controlsContainer}>
          <Button
            buttonType={ButtonType.Primary}
            onPress={onPressUse}
            testID={testIdWithKey('UseVideo')}
            title={t('BCSC.SendVideo.VideoReview.UseVideo')}
            accessibilityLabel={t('BCSC.SendVideo.VideoReview.UseVideo')}
          />
          <View style={styles.secondButton}>
            <Button
              buttonType={ButtonType.Tertiary}
              onPress={onPressRetake}
              testID={testIdWithKey('RetakeVideo')}
              title={t('BCSC.SendVideo.VideoReview.RetakeVideo')}
              accessibilityLabel={t('BCSC.SendVideo.VideoReview.RetakeVideo')}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default VideoReviewScreen
