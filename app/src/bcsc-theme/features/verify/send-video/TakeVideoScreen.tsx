import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { hitSlop } from '@/constants'
import { BCState } from '@/store'
import { Button, ButtonType, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { StyleSheet, View, Text, Alert, TouchableOpacity, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera'

type PhotoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.TakeVideo>
}

const TakeVideoScreen = ({ navigation }: PhotoInstructionsScreenProps) => {
  const { ColorPalette, Spacing, TextTheme } = useTheme()
  const [store] = useStore<BCState>()
  const prompts = useMemo(() => store.bcsc.prompts?.map(({ prompt }) => prompt) || [], [store.bcsc.prompts])

  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission()
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } =
    useMicrophonePermission()
  const device = useCameraDevice('front')
  const [isActive, setIsActive] = useState(false)
  const [prompt, setPrompt] = useState('3')
  const [recordingInProgress, setRecordingInProgress] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [over30Seconds, setOver30Seconds] = useState(false)
  const cameraRef = useRef<Camera>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const promptOpacity = useRef(new Animated.Value(1)).current
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  useEffect(() => {
    promptOpacity.setValue(0)
    Animated.timing(promptOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt])

  const styles = StyleSheet.create({
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
    cancelButton: {},
  })

  const handleCancel = () => {
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

    timerRef.current = setInterval(() => {
      const currentTime = Date.now()
      const elapsed = Math.floor((currentTime - startTime) / 1000)
      if (elapsed >= 30 && !over30Seconds) {
        setOver30Seconds(true)
      }
      setElapsedTime(elapsed)
    }, 1000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
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

    cameraRef.current?.startRecording({
      fileType: 'mp4',
      onRecordingError: (error) => {
        logger.error(`Recording error: ${error}`)
        stopTimer() // Stop timer on error
        Alert.alert('Recording Error', 'There was an issue with the recording. Please try again.')
      },
      onRecordingFinished: async (video) => {
        logger.info(`Recording finished: ${video}`)
        stopTimer() // Stop timer when manually stopping recording
        setPrompt('')
        const snapshot = await cameraRef.current!.takeSnapshot()
        if (over30Seconds) {
          navigation.navigate(BCSCScreens.VideoTooLong, { videoLengthSeconds: elapsedTime })
        } else {
          navigation.navigate(BCSCScreens.VideoReview, {
            videoPath: video.path,
            videoThumbnailPath: snapshot.path,
          })
        }
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logger, startTimer, stopTimer, navigation, prompts])

  const onPressNextPrompt = async () => {
    if (prompts.indexOf(prompt) === prompts.length - 1) {
      await cameraRef.current?.stopRecording()
    }
    setPrompt((prevPrompt) => prompts[prompts.indexOf(prevPrompt) + 1])
  }

  useFocusEffect(
    useCallback(() => {
      const checkPermissions = async () => {
        if (!hasCameraPermission) {
          const permission = await requestCameraPermission()
          if (!permission) {
            Alert.alert('Camera Permission Required', 'Please enable camera permission to take a photo.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ])
            return
          }
        }
        if (!hasMicrophonePermission) {
          const permission = await requestMicrophonePermission()
          if (!permission) {
            Alert.alert('Microphone Permission Required', 'Please enable microphone permission to record a video.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ])
            return
          }
        }

        startRecording()
      }

      checkPermissions()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      startRecording,
      hasCameraPermission,
      requestCameraPermission,
      hasMicrophonePermission,
      requestMicrophonePermission,
      navigation,
    ])
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const onInitialized = () => {
    setIsActive(true)
  }

  const onError = (error: any) => {
    // eslint-disable-next-line no-console
    console.error('Camera error:', error)
    Alert.alert('Camera Error', 'There was an issue with the camera. Please try again.')
  }

  if (!hasCameraPermission || !hasMicrophonePermission) {
    return (
      <SafeAreaView style={styles.pageContainer}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white' }}>Camera and microphone permissions required</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.pageContainer}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white' }}>No front camera available</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.pageContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
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
                Recording will start in
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
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} hitSlop={hitSlop}>
                <ThemedText style={{ color: 'white' }}>Cancel</ThemedText>
              </TouchableOpacity>
              <View style={styles.recordingLengthContainer}>
                <ThemedText style={{ color: ColorPalette.semantic.error }}>{'\u2B24'}</ThemedText>
                <ThemedText style={{ color: over30Seconds ? ColorPalette.semantic.error : ColorPalette.grayscale.white }}>
                  {formatTime(elapsedTime)}
                </ThemedText>
              </View>
            </View>
            <Button
              buttonType={ButtonType.Primary}
              title={prompts.indexOf(prompt) < prompts.length - 1 ? 'Show Next Prompt' : 'Done'}
              onPress={onPressNextPrompt}
              testID={'StartRecordingButton'}
              accessibilityLabel={'Start Recording Video'}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

export default TakeVideoScreen
