import { VerificationVideoUploadPayload } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { MediaCache } from '@/bcsc-theme/utils/media-cache'
import { BCDispatchAction, BCState } from '@/store'
import readFileInChunks from '@/utils/read-file'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { hashBase64 } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'
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
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { width } = useWindowDimensions()
  const { ButtonLoading } = useAnimatedComponents()
  const [paused, setPaused] = useState(false)
  const videoRef = useRef<VideoRef>(null)
  const { videoPath, videoThumbnailPath } = route.params
  const [videoMetadata, setVideoMetadata] = useState<VerificationVideoUploadPayload>()
  const { t } = useTranslation()

  if (!videoPath || !videoThumbnailPath) {
    throw new Error(t('BCSC.SendVideo.VideoReview.VideoErrorPath'))
  }

  const styles = StyleSheet.create({
    pageContainer: {
      position: 'relative',
      flexGrow: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
      marginTop: Spacing.xl,
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
      padding: Spacing.md,
    },
    secondButton: {
      marginTop: Spacing.sm,
    },
  })

  const onPressUse = () => {
    dispatch({ type: BCDispatchAction.SAVE_VIDEO, payload: [{ videoPath, videoMetadata }] })
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

  const onVideoLoad = async (data: OnLoadData) => {
    const duration = Math.ceil(data.duration)
    const { mtime } = await RNFS.stat(videoPath)
    const filename = 'selfieVideo.mp4'
    const date = Math.floor(mtime / 1000)

    const videoBytes = await readFileInChunks(videoPath, logger)

    // Cache the video for later use
    VerificationVideoCache.setCachedMedia(videoBytes)

    const videoSHA = await hashBase64(videoBytes.toString('base64'))
    const prompts = store.bcsc.prompts!.map(({ id }, i) => ({
      id,
      prompted_at: i,
    }))

    setVideoMetadata({
      content_type: 'video/mp4',
      content_length: videoBytes.byteLength,
      date,
      sha256: videoSHA,
      duration,
      filename,
      prompts,
    })
  }

  const controls = (
    <>
      <Button
        buttonType={ButtonType.Primary}
        onPress={onPressUse}
        testID={testIdWithKey('UseVideo')}
        title={t('BCSC.SendVideo.VideoReview.UseVideo')}
        accessibilityLabel={t('BCSC.SendVideo.VideoReview.UseVideo')}
        disabled={!videoMetadata}
      >
        {!videoMetadata && <ButtonLoading />}
      </Button>
      <View style={styles.secondButton}>
        <Button
          buttonType={ButtonType.Tertiary}
          onPress={onPressRetake}
          testID={testIdWithKey('RetakeVideo')}
          title={t('BCSC.SendVideo.VideoReview.RetakeVideo')}
          accessibilityLabel={t('BCSC.SendVideo.VideoReview.RetakeVideo')}
        />
      </View>
    </>
  )

  return (
    <ScreenWrapper
      padded={false}
      style={styles.pageContainer}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
    >
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
          <Icon name={paused ? 'play' : 'pause'} size={pauseButtonSize} color={ColorPalette.brand.primaryBackground} />
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  )
}

export default VideoReviewScreen
