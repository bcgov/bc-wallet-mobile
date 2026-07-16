import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import useVideoPrompts from '@/bcsc-theme/hooks/useVideoPrompts'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { MediaCache } from '@/bcsc-theme/utils/media-cache'
import { useAlerts } from '@/hooks/useAlerts'
import usePreventGestureBack from '@/hooks/usePreventGestureBack'
import { BCDispatchAction, BCState } from '@/store'
import { withAlert } from '@/utils/alert'
import readFileInChunks from '@/utils/read-file'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import type { OnLoadData } from 'react-native-video'
import { Video, VideoRef } from 'react-native-video'

export const VerificationVideoCache = new MediaCache()

const pauseButtonSize = 40

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
  const { width, height } = useWindowDimensions()
  const [paused, setPaused] = useState(false)
  const videoRef = useRef<VideoRef>(null)
  const { videoPath, videoThumbnailPath } = route.params
  const { t } = useTranslation()
  const { failedToReadFromLocalStorageAlert, videoPromptsMissingAlert } = useAlerts(navigation)
  const { refreshPrompts, isRefreshingPrompts } = useVideoPrompts()

  if (!videoPath || !videoThumbnailPath) {
    throw new Error(t('BCSC.SendVideo.VideoReview.VideoErrorPath'))
  }

  const styles = StyleSheet.create({
    pageContainer: {
      paddingTop: Spacing.lg,
    },
    videoContainer: {
      alignItems: 'center',
    },
    heading: {
      textAlign: 'center',
      marginBottom: Spacing.lg,
      width: '100%',
      color: ColorPalette.grayscale.black,
    },
    video: {
      width: width - 2 * Spacing.md,
      aspectRatio: 3 / 4,
      maxHeight: height * 0.4,
    },
    pauseButton: {
      backgroundColor: ColorPalette.brand.primary,
      width: pauseButtonSize,
      height: pauseButtonSize,
      borderRadius: pauseButtonSize / 2,
      marginTop: Spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  const onPressUse = () => {
    dispatch({ type: BCDispatchAction.SAVE_VIDEO_THUMBNAIL, payload: [videoThumbnailPath] })
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: BCSCScreens.VerificationMethodSelection }, { name: BCSCScreens.EvidenceUploading }],
      })
    )
  }

  const onTogglePause = () => {
    setPaused((prev) => !prev)
  }

  /**
   * Retake drops the recording and goes straight back to the camera, so this is the only chance to issue
   * the challenge set for the next attempt — TakeVideoScreen re-arms recording the moment it refocuses.
   * Safe to rotate here because the video being discarded is the only one bound to the current sha.
   */
  const onPressRetake = async () => {
    const promptsReady = await refreshPrompts()
    if (!promptsReady) {
      // Recording against the current set would replay a challenge the server already issued, so hold the
      // user here rather than sending them back to the camera with stale prompts.
      videoPromptsMissingAlert()
      return
    }

    dispatch({ type: BCDispatchAction.SAVE_VIDEO_THUMBNAIL, payload: [''] })
    navigation.goBack()
  }

  /**
   * Sends Android's hardware back to VideoInstructions rather than letting it pop to TakeVideo, which
   * re-arms recording on focus against the set this video already answered — the replay `onPressRetake`
   * refreshes to avoid, reachable without ever pressing Retake. VideoInstructions sits below TakeVideo, so
   * navigating there pops the camera off the stack, and its own focus effect issues the next set and shows
   * it to the user before recording can start. That keeps the fetch out of here: refreshing on the way out
   * would mean holding the screen through a network call with no way to signal it.
   *
   * The iOS swipe is disabled in VerifyStack rather than redirected: it reveals the camera underneath as
   * you drag, so landing elsewhere would contradict the gesture.
   */
  usePreventGestureBack(
    useCallback(() => {
      if (isRefreshingPrompts) {
        // `onPressRetake` is mid-refresh and will goBack() once it lands. Leaving now would fire that
        // goBack() from an unmounted screen: it carries a source but no target, so the router falls back
        // to popping whatever is on top rather than this route, dumping the user two screens back. The
        // buttons below are disabled for the same window.
        return
      }

      navigation.navigate(BCSCScreens.VideoInstructions)
    }, [isRefreshingPrompts, navigation])
  )

  /**
   * Optimistically caches the video and extracts its metadata in the background,
   * allowing the user to upload videos with minimal waiting time.
   *
   * Note: If the user navigates quickly through the flow, the UploadingScreen will just wait
   * for the video disk read to complete before proceeding.
   *
   * @param {OnLoadData} data The data object containing video load information.
   * @returns {*} {Promise<void>} A promise that resolves when the video metadata is processed and cached.
   */
  const onVideoLoad = async (data: OnLoadData) => {
    try {
      // Clear the previously cached video
      VerificationVideoCache.clearCache()

      // Wrap the file reader with alert
      const readFileInChunksWithAlert = withAlert(readFileInChunks, failedToReadFromLocalStorageAlert)
      const videoFilePromise = readFileInChunksWithAlert(videoPath, logger)

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

  const controls = (
    <ControlContainer>
      {/* A refresh in flight is about to rotate the sha this recording is bound to, so accepting the video
          mid-refresh would finalize it against a sha the server has already replaced. */}
      <Button
        buttonType={ButtonType.Primary}
        onPress={onPressUse}
        testID={testIdWithKey('UseVideo')}
        title={t('BCSC.SendVideo.VideoReview.UseVideo')}
        accessibilityLabel={t('BCSC.SendVideo.VideoReview.UseVideo')}
        disabled={isRefreshingPrompts}
      />
      <Button
        buttonType={ButtonType.Secondary}
        onPress={onPressRetake}
        testID={testIdWithKey('RetakeVideo')}
        title={t('BCSC.SendVideo.VideoReview.RetakeVideo')}
        accessibilityLabel={t('BCSC.SendVideo.VideoReview.RetakeVideo')}
        disabled={isRefreshingPrompts}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      edges={['bottom', 'left', 'right']}
      style={styles.pageContainer}
      controls={controls}
      padded={false}
      scrollViewContainerStyle={styles.videoContainer}
    >
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
      <TouchableOpacity
        style={styles.pauseButton}
        onPress={onTogglePause}
        accessibilityLabel={t('BCSC.SendVideo.VideoReview.TogglePlayPause')}
        accessibilityRole="button"
        testID={testIdWithKey('TogglePlayPause')}
      >
        <Icon name={paused ? 'play' : 'pause'} size={pauseButtonSize} color={ColorPalette.brand.primaryBackground} />
      </TouchableOpacity>
    </ScreenWrapper>
  )
}

export default VideoReviewScreen
