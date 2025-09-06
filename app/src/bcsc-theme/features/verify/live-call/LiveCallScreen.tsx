import useApi from '@/bcsc-theme/api/hooks/useApi'
import useVideoCallFlow from '@/bcsc-theme/features/verify/live-call/hooks/useVideoCallFlow'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import ProgressBar from '@/components/ProgressBar'
import { BCDispatchAction, BCState } from '@/store'
import Mountains from '@assets/img/mountains-circle.svg'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ColorValue, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import InCallManager from 'react-native-incall-manager'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { MediaStreamTrack, RTCView } from 'react-native-webrtc'
import { formatCallTime } from './utils/formatCallTime'
import { AppBannerSection as BannerSection } from '@/bcsc-theme/components/AppBanner'

type CallIconButtonProps = {
  onPress: () => void
  primaryColor: ColorValue
  secondaryColor: ColorValue
  size: number
  iconName: string
  label: string
  testIDKey: string
}

const CallIconButton = ({
  onPress,
  primaryColor,
  secondaryColor,
  size,
  iconName,
  label,
  testIDKey,
}: CallIconButtonProps) => {
  const { Spacing } = useTheme()
  const styles = StyleSheet.create({
    iconButton: {
      width: size,
      height: size,
      borderRadius: size / 2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: secondaryColor,
      borderWidth: 1,
      borderColor: primaryColor,
    },
  })

  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testIdWithKey(testIDKey)}
      accessibilityLabel={label}
      style={{ justifyContent: 'center', alignItems: 'center' }}
    >
      <View style={styles.iconButton}>
        <Icon name={iconName} size={size - 32} color={primaryColor} />
      </View>
      <ThemedText style={{ color: primaryColor, marginTop: Spacing.xs }}>{label}</ThemedText>
    </TouchableOpacity>
  )
}

type LoadingViewProps = {
  onCancel: () => void
  message?: string
}

const LoadingView = ({ onCancel, message }: LoadingViewProps) => {
  const { Spacing, ColorPalette } = useTheme()
  const [progressPercent, setProgressPercent] = useState(0)
  const [delayReached, setDelayReached] = useState(false)

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {
      marginTop: 'auto',
    },
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev > 80) {
          setDelayReached(true)
        }

        // Logarithmic progression - slows down as it approaches 100%
        const maxProgress = 97

        if (prev >= maxProgress) {
          return prev
        }

        const increment = (maxProgress - prev) * 0.02

        return Math.min(prev + increment, maxProgress)
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <SafeAreaView style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <ProgressBar dark={true} progressPercent={progressPercent} />
        <ThemedText variant={'headingTwo'} style={{ marginTop: 2 * Spacing.xxl, textAlign: 'center' }}>
          One moment please...
        </ThemedText>
        <ThemedText style={{ marginTop: 2 * Spacing.xxl, textAlign: 'center' }}>
          {message || "We're setting things up for you"}
        </ThemedText>
        <Mountains style={{ alignSelf: 'center', marginVertical: Spacing.md }} height={200} width={200} />
        {delayReached ? (
          <ThemedText variant={'labelSubtitle'} style={{ textAlign: 'center' }}>
            This is taking longer than usual. Please be patient.
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          onPress={onCancel}
          title={'Cancel'}
          accessibilityLabel={'Cancel'}
          testID={testIdWithKey('Cancel')}
        />
      </View>
    </SafeAreaView>
  )
}

type LiveCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.LiveCall>
}

const LiveCallScreen = ({ navigation }: LiveCallScreenProps) => {
  const { width } = useWindowDimensions()
  const [store, dispatch] = useStore<BCState>()
  const { ColorPalette, Spacing } = useTheme()
  const iconSize = useMemo(() => width / 6, [width])
  const [videoHidden, setVideoHidden] = useState(false)
  const [onMute, setOnMute] = useState(false)
  const [callStartTime, setCallStartTime] = useState<number | null>(null)
  const [callTimer, setCallTimer] = useState<string>('')
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const leaveCall = useCallback(async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setCallStartTime(null)
    setCallTimer('')

    try {
      if (!store.bcsc.deviceCode || !store.bcsc.userCode) {
        throw new Error('Missing device or user code')
      }

      const { refresh_token, bcsc_devices_count } = await token.checkDeviceCodeStatus(
        store.bcsc.deviceCode,
        store.bcsc.userCode
      )

      if (refresh_token) {
        dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [refresh_token] })
      }

      if (bcsc_devices_count !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_DEVICE_COUNT,
          payload: [bcsc_devices_count],
        })
      }
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.VerificationSuccess }],
        })
      )
    } catch {
      logger.info('User not verified')
      navigation.dispatch(
        CommonActions.reset({
          index: 2,
          routes: [
            { name: BCSCScreens.SetupSteps },
            { name: BCSCScreens.VerificationMethodSelection },
            { name: BCSCScreens.VerifyNotComplete },
          ],
        })
      )
    }
  }, [store.bcsc.deviceCode, store.bcsc.userCode, token, dispatch, navigation, logger])

  const { flowState, error, localStream, remoteStream, startVideoCall, cleanup, retryConnection, isInBackground } =
    useVideoCallFlow(leaveCall)

  const inCall = useMemo(() => flowState === 'in_call', [flowState])

  useEffect(() => {
    if (flowState === 'in_call' && !callStartTime) {
      const startTime = Date.now()
      setCallStartTime(startTime)
    } else if (flowState !== 'in_call' && callStartTime) {
      setCallStartTime(null)
      setCallTimer('')
    }
  }, [flowState, callStartTime])

  useEffect(() => {
    if (callStartTime) {
      const updateTimer = () => {
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - callStartTime) / 1000)
        setCallTimer(formatCallTime(elapsedSeconds))
      }

      updateTimer()

      timerIntervalRef.current = setInterval(updateTimer, 1000)

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
      }
    } else {
      setCallTimer('')
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [callStartTime])

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [])

  const banner: { type: 'warning' | 'error'; title: string } | null = useMemo(() => {
    if (isInBackground) {
      return { type: 'warning', title: 'Video will resume when you return to this app' }
    }
    if (videoHidden) {
      return { type: 'error', title: `Agent can't see you while your video is off` }
    }
    if (onMute) {
      return { type: 'error', title: `Agent can't hear you while your microphone is muted` }
    }

    return null
  }, [isInBackground, onMute, videoHidden])

  useEffect(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks()
      audioTracks.forEach((track: MediaStreamTrack) => {
        track.enabled = !onMute
      })
    }
  }, [onMute, localStream])

  useEffect(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks()
      videoTracks.forEach((track: MediaStreamTrack) => {
        track.enabled = !videoHidden
      })
    }
  }, [videoHidden, localStream])

  const toggleMute = useCallback(() => {
    setOnMute((prev) => !prev)
  }, [])

  const toggleVideo = useCallback(() => {
    setVideoHidden((prev) => !prev)
  }, [])

  useEffect(() => {
    // only start call automatically once (flow state doesn't go back to idle)
    if (flowState === 'idle') {
      startVideoCall()
      InCallManager.start({ media: 'video', auto: true })
    }
  }, [flowState, startVideoCall])

  const stateMessage = useMemo(() => {
    switch (flowState) {
      case 'creating_session':
        return 'Creating video session...'
      case 'connecting_webrtc':
        return 'Connecting to video service...'
      case 'waiting_for_agent':
        return 'Waiting for an agent to join...'
      case 'in_call':
        return null
      case 'error':
        return error?.message || 'An error occurred'
      default:
        return 'Initializing...'
    }
  }, [flowState, error])

  const handleEndCall = useCallback(async () => {
    try {
      await cleanup()
      await leaveCall()
    } catch (error) {
      logger.error('Error while leaving video call', error)
    }
  }, [cleanup, leaveCall, logger])

  if (flowState === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground, padding: Spacing.md }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Icon name="alert-circle" size={64} color={ColorPalette.semantic.error} />
          <ThemedText variant={'headingTwo'} style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
            Connection Error
          </ThemedText>
          <ThemedText style={{ marginTop: Spacing.md, textAlign: 'center' }}>{stateMessage}</ThemedText>
        </View>
        <View style={{ gap: Spacing.sm }}>
          {error?.retryable && (
            <Button
              buttonType={ButtonType.Primary}
              onPress={retryConnection}
              title={'Try Again'}
              accessibilityLabel={'Try Again'}
              testID={testIdWithKey('TryAgain')}
            />
          )}
          <Button
            buttonType={ButtonType.Secondary}
            onPress={() => navigation.goBack()}
            title={'Go Back'}
            accessibilityLabel={'Go Back'}
            testID={testIdWithKey('GoBack')}
          />
        </View>
      </SafeAreaView>
    )
  }

  if (flowState !== 'in_call') {
    return <LoadingView onCancel={handleEndCall} message={stateMessage || undefined} />
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'black',
    },
    agentVideo: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      flex: 1,
    },
    // just helpful labels, no properties needed
    upperContainer: {},
    lowerContainer: {},
    timeAndLabelContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: Spacing.md,
      backgroundColor: ColorPalette.notification.popupOverlay,
    },
    controlsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: Spacing.lg,
      backgroundColor: ColorPalette.notification.popupOverlay,
    },
    selfieVideoContainer: {
      width: width / 4,
      height: (width / 4) * 1.5,
      overflow: 'hidden',
    },
    selfieVideo: {
      flex: 1,
    },
  })

  return (
    <View style={styles.container}>
      {remoteStream && <RTCView style={styles.agentVideo} objectFit={'contain'} streamURL={remoteStream.toURL()} />}

      <SafeAreaView edges={['top']} style={{ flex: 0, backgroundColor: ColorPalette.notification.popupOverlay }} />
      <SafeAreaView edges={['left', 'right']} style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={styles.upperContainer}>
          <View style={styles.timeAndLabelContainer}>
            <ThemedText>{inCall ? 'Service BC' : 'In Queue'}</ThemedText>
            {callTimer ? <ThemedText>{callTimer}</ThemedText> : null}
          </View>
          {banner ? <BannerSection type={banner.type} title={banner.title} dismissible={false} /> : null}
        </View>
        <View style={styles.lowerContainer}>
          {localStream && !videoHidden && (
            <View style={styles.selfieVideoContainer}>
              <RTCView mirror style={styles.selfieVideo} objectFit={'cover'} streamURL={localStream.toURL()} />
            </View>
          )}

          <View style={styles.controlsContainer}>
            <CallIconButton
              onPress={toggleMute}
              primaryColor={ColorPalette.grayscale.white}
              secondaryColor={'transparent'}
              size={iconSize}
              iconName={onMute ? 'microphone-off' : 'microphone'}
              label={onMute ? 'Unmute' : 'Mute'}
              testIDKey={'Mute'}
            />
            <CallIconButton
              onPress={toggleVideo}
              primaryColor={ColorPalette.grayscale.white}
              secondaryColor={'transparent'}
              size={iconSize}
              iconName={videoHidden ? 'video-off' : 'video'}
              label={videoHidden ? 'Show Video' : 'Hide Video'}
              testIDKey={'Video'}
            />
            <CallIconButton
              onPress={handleEndCall}
              primaryColor={ColorPalette.grayscale.white}
              secondaryColor={ColorPalette.semantic.error}
              size={iconSize}
              iconName={'phone-cancel'}
              label={'End Call'}
              testIDKey={'EndCall'}
            />
          </View>
        </View>
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} style={{ flex: 0, backgroundColor: ColorPalette.notification.popupOverlay }} />
    </View>
  )
}

export default LiveCallScreen
