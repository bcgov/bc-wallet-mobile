import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import {
  hitSlop,
  MAX_SELFIE_VIDEO_DURATION_SECONDS,
  MIN_PROMPT_DURATION_SECONDS,
  SELFIE_VIDEO_FRAME_RATE,
  VIDEO_RESOLUTION_480P,
} from '@/constants'
import { useAlerts } from '@/hooks/useAlerts'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Camera,
  CameraCaptureError,
  CameraRuntimeError,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera'
import { LoadingScreenContent } from '../../splash-loading/LoadingScreenContent'

type TakeVideoScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.TakeVideo>
}

const TakeVideoScreen = ({ navigation }: TakeVideoScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing, TextTheme } = useTheme()
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const device = useCameraDevice('front')
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission()
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } =
    useMicrophonePermission()

  // Video format for 480p at 24fps to reduce file size
  const format = useCameraFormat(device, [
    {
      videoResolution: VIDEO_RESOLUTION_480P,
      videoAspectRatio: VIDEO_RESOLUTION_480P.width / VIDEO_RESOLUTION_480P.height,
    },
    { fps: SELFIE_VIDEO_FRAME_RATE },
  ])

  const [isActive, setIsActive] = useState(false)
  const [prompt, setPrompt] = useState('3')
  const [recordingInProgress, setRecordingInProgress] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [promptTimestamp, setPromptTimestamp] = useState(0)
  const [exceedsMaxDuration, setExceedsMaxDuration] = useState(false)
  const cameraRef = useRef<Camera>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const exceedsMaxDurationRef = useRef(false)
  const elapsedTimeRef = useRef(0)
  const promptOpacity = useRef(new Animated.Value(1)).current
  const prompts = useMemo(() => store.bcsc.prompts?.map(({ prompt }) => prompt) || [], [store.bcsc.prompts])
  const safeAreaInsets = useSafeAreaInsets()
  const { failedToWriteToLocalStorageAlert } = useAlerts(navigation)
  const isLastPrompt = useMemo(() => {
    if (prompt === '') {
      return true // Recording finished, treat as last prompt
    }
    const currentIndex = prompts.indexOf(prompt)
    return currentIndex >= prompts.length - 1
  }, [prompts, prompt])

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pageContainer: {
          flex: 1,
        },
        camera: {
          flex: 1,
        },
        promptContainer: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: ColorPalette.notification.popupOverlay,
          paddingVertical: Spacing.lg,
          paddingHorizontal: Spacing.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        controlsContainer: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: ColorPalette.notification.popupOverlay,
          paddingBottom: Spacing.md,
          paddingHorizontal: Spacing.md,
          flexDirection: 'column',
        },
        cancelContainer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: Spacing.md,
          paddingBottom: Spacing.xl,
        },
        recordingLengthContainer: {
          flexDirection: 'row',
          gap: Spacing.sm,
          justifyContent: 'flex-end',
          alignItems: 'center',
          flex: 1,
        },
        buttonContainer: {
          marginBottom: safeAreaInsets.bottom,
        },
      }),
    [ColorPalette.notification.popupOverlay, Spacing.lg, Spacing.md, Spacing.sm, Spacing.xl, safeAreaInsets.bottom]
  )

  const handleCancel = () => {
    if (cameraRef.current) {
      cameraRef.current.cancelRecording()
    }

    navigation.goBack()
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const startTimer = useCallback(() => {
    const startTime = Date.now()
    setElapsedTime(0)
    setExceedsMaxDuration(false)
    elapsedTimeRef.current = 0
    exceedsMaxDurationRef.current = false

    timerRef.current = setInterval(() => {
      const currentTime = Date.now()
      const elapsed = Math.floor((currentTime - startTime) / 1000)

      // Check if we've exceeded the max duration, but only trigger once
      if (elapsed > MAX_SELFIE_VIDEO_DURATION_SECONDS && !exceedsMaxDurationRef.current) {
        exceedsMaxDurationRef.current = true
        setExceedsMaxDuration(true) // Trigger re-render for UI
      }

      elapsedTimeRef.current = elapsed
      setElapsedTime(elapsed)
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    setElapsedTime(0)
    setPromptTimestamp(0)
    setRecordingInProgress(false)
    for (let i = 2; i >= 0; i--) {
      await new Promise((resolve) =>
        setTimeout(() => {
          setPrompt(`${i}`)
          resolve(true)
        }, 1000)
      )
    }

    setRecordingInProgress(true)
    setPrompt(prompts[0])
    startTimer() // Start the timer when recording begins

    if (!cameraRef.current) {
      logger.error('Camera reference is null, cannot start recording')
      return
    }

    try {
      const snapshot = await cameraRef.current.takeSnapshot()

      cameraRef.current.startRecording({
        fileType: 'mp4',
        videoCodec: 'h265',
        onRecordingError: (error) => {
          stopTimer() // Stop timer on error

          // If recording was canceled, do not show an alert
          if (error.code === 'capture/recording-canceled') {
            logger.debug('Video recording canceled')
            return
          }

          logger.debug(`Recording error (${error.code}): ${error.message}`)

          // Handle file I/O errors separately to provide a specific alert
          if (error.code === 'capture/file-io-error') {
            throw error
          }

          Alert.alert(
            t('BCSC.SendVideo.TakeVideo.RecordingError'),
            t('BCSC.SendVideo.TakeVideo.RecordingErrorDescription')
          )
        },
        onRecordingFinished: async (video) => {
          logger.info(`Recording finished, duration: ${video.duration}`)
          stopTimer() // Stop timer when manually stopping recording
          setPrompt('')
          if (exceedsMaxDurationRef.current) {
            navigation.navigate(BCSCScreens.VideoTooLong, { videoLengthSeconds: elapsedTimeRef.current })
            return
          }

          navigation.navigate(BCSCScreens.VideoReview, { videoPath: video.path, videoThumbnailPath: snapshot.path })
        },
      })
    } catch (error) {
      logger.error('Error starting video recording:', error as Error)

      if (error instanceof CameraCaptureError && error.code === 'capture/file-io-error') {
        failedToWriteToLocalStorageAlert()
      }
    }
  }, [prompts, startTimer, logger, stopTimer, t, failedToWriteToLocalStorageAlert, navigation])

  const onPressNextPrompt = async () => {
    const currentIndex = prompts.indexOf(prompt)
    if (currentIndex === prompts.length - 1) {
      return cameraRef.current?.stopRecording()
    }

    setPromptTimestamp(elapsedTime)
    setPrompt(prompts[currentIndex + 1])
  }

  const onInitialized = () => {
    setIsActive(true)
  }

  const onError = (error: CameraRuntimeError) => {
    logger.error('Camera error:', error)
    Alert.alert(t('BCSC.SendVideo.TakeVideo.CameraError'), t('BCSC.SendVideo.TakeVideo.CameraErrorMessage'))
  }

  useEffect(() => {
    promptOpacity.setValue(0)
    Animated.timing(promptOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start()
  }, [prompt, promptOpacity])

  const { isLoading: isCameraLoading } = useAutoRequestPermission(hasCameraPermission, requestCameraPermission)
  // Only request microphone permission after camera permission is resolved (to avoid dialog conflicts)
  const { isLoading: isMicrophoneLoading } = useAutoRequestPermission(
    hasMicrophonePermission,
    requestMicrophonePermission,
    !isCameraLoading
  )

  useFocusEffect(
    useCallback(() => {
      if (isActive && hasCameraPermission && hasMicrophonePermission) {
        startRecording()
      }
    }, [startRecording, isActive, hasCameraPermission, hasMicrophonePermission])
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  if (isCameraLoading || isMicrophoneLoading) {
    return <LoadingScreenContent loading={isCameraLoading || isMicrophoneLoading} onLoaded={() => {}} />
  }

  if (!hasCameraPermission || !hasMicrophonePermission) {
    let permissionType: 'camera' | 'microphone' | 'cameraAndMicrophone'
    if (hasCameraPermission) {
      permissionType = 'microphone'
    } else if (hasMicrophonePermission) {
      permissionType = 'camera'
    } else {
      permissionType = 'cameraAndMicrophone'
    }
    return <PermissionDisabled permissionType={permissionType} headerPadding />
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.pageContainer}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white' }}>{t('BCSC.SendVideo.TakeVideo.NoFrontCameraAvailable')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <ScreenWrapper padded={false} scrollable={false} edges={['top']}>
      <View style={styles.pageContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          format={format}
          isActive={isActive}
          video={true}
          onInitialized={onInitialized}
          onError={onError}
          audio
        />

        {/* Top overlay with prompt text */}
        <View style={styles.promptContainer}>
          {recordingInProgress ? (
            <Animated.Text style={[{ textAlign: 'center', opacity: promptOpacity }, TextTheme.headingTwo]}>
              {prompt}
            </Animated.Text>
          ) : (
            <>
              <ThemedText variant={'headingTwo'} style={{ textAlign: 'center' }}>
                {t('BCSC.SendVideo.TakeVideo.RecordingWillStartIn')}
              </ThemedText>
              <Animated.Text style={[{ textAlign: 'center', opacity: promptOpacity }, TextTheme.headingTwo]}>
                {prompt}
              </Animated.Text>
            </>
          )}
        </View>

        {/* Bottom overlay with controls */}
        {recordingInProgress ? (
          <View style={styles.controlsContainer}>
            <View style={styles.cancelContainer}>
              <TouchableOpacity
                onPress={handleCancel}
                hitSlop={hitSlop}
                accessibilityLabel={t('Global.Cancel')}
                accessibilityRole="button"
              >
                <ThemedText style={{ color: 'white' }}>{t('Global.Cancel')}</ThemedText>
              </TouchableOpacity>
              <View style={styles.recordingLengthContainer}>
                <ThemedText style={{ color: ColorPalette.semantic.error }}>{'\u2B24'}</ThemedText>
                <ThemedText
                  style={{
                    color: exceedsMaxDuration ? ColorPalette.semantic.error : ColorPalette.grayscale.white,
                  }}
                >
                  {formatTime(elapsedTime)}
                </ThemedText>
              </View>
            </View>
            <View style={styles.buttonContainer}>
              <Button
                buttonType={ButtonType.Primary}
                title={isLastPrompt ? t('BCSC.SendVideo.TakeVideo.Done') : t('BCSC.SendVideo.TakeVideo.ShowNextPrompt')}
                onPress={onPressNextPrompt}
                testID={'StartRecordingButton'}
                accessibilityLabel={t('BCSC.SendVideo.TakeVideo.StartRecordingButton')}
                disabled={elapsedTime - promptTimestamp < MIN_PROMPT_DURATION_SECONDS}
              />
            </View>
          </View>
        ) : null}
      </View>
    </ScreenWrapper>
  )
}

export default TakeVideoScreen
