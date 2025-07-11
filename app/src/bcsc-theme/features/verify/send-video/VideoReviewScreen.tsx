import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { useTheme, Button, ButtonType, testIdWithKey, useStore, ThemedText, useAnimatedComponents } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { Video, VideoRef } from 'react-native-video'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useRef, useState } from 'react'
import { hashBase64 } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'
import type { OnLoadData } from 'react-native-video'
import { VerificationVideoUploadPayload } from '@/bcsc-theme/api/hooks/useEvidenceApi'

type VideoReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VideoReview>
  route: {
    params: {
      videoPath: string
      videoThumbnailPath: string
    }
  }
}

const VideoReviewScreen = ({ navigation, route }: VideoReviewScreenProps) => {
  const { ColorPallet, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const { width } = useWindowDimensions()
  const { ButtonLoading } = useAnimatedComponents()
  const [paused, setPaused] = useState(false)
  const videoRef = useRef<VideoRef>(null)
  const { videoPath, videoThumbnailPath } = route.params
  const [videoMetadata, setVideoMetadata] = useState<VerificationVideoUploadPayload>()

  if (!videoPath || !videoThumbnailPath) {
    throw new Error('Video path and thumbnail path are required')
  }

  const styles = StyleSheet.create({
    pageContainer: {
      position: 'relative',
      flexGrow: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    contentContainer: {
      flexGrow: 1,
      marginTop: Spacing.xl,
    },
    videoContainer: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
    },
    heading: { marginBottom: Spacing.md, width: '100%' },
    video: {
      height: width - 2 * Spacing.md,
      width: width - 2 * Spacing.md,
      aspectRatio: 1,
    },
    pauseButton: {
      backgroundColor: ColorPallet.grayscale.white,
      width: 80,
      height: 80,
      borderRadius: 40,
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
    const videoBytes = await RNFS.readFile(videoPath, 'base64')
    const videoSHA = await hashBase64(videoBytes)
    const prompts = store.bcsc.prompts!.map(({ id }, i) => ({
      id,
      prompted_at: i,
    }))

    setVideoMetadata({
      content_type: 'video/mp4',
      content_length: videoBytes.length,
      date,
      sha256: videoSHA,
      duration,
      filename,
      prompts,
    })
  }

  return (
    <SafeAreaView style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <View style={styles.videoContainer}>
          <ThemedText variant={'headingFour'} style={styles.heading}>
            Can you see and hear yourself clearly in the video?
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
          />
          <TouchableOpacity style={styles.pauseButton} onPress={onTogglePause}>
            <Icon name={paused ? 'play' : 'pause'} size={80} color={ColorPallet.brand.primaryBackground} />
          </TouchableOpacity>
        </View>
        <View style={styles.controlsContainer}>
          <Button
            buttonType={ButtonType.Primary}
            onPress={onPressUse}
            testID={testIdWithKey('UseVideo')}
            title={'Use this video'}
            accessibilityLabel={'Use this video'}
            disabled={!videoMetadata}
          >
            {!videoMetadata && <ButtonLoading />}
          </Button>
          <View style={styles.secondButton}>
            <Button
              buttonType={ButtonType.Tertiary}
              onPress={onPressRetake}
              testID={testIdWithKey('RetakeVideo')}
              title={'Retake video'}
              accessibilityLabel={'Retake video'}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default VideoReviewScreen
