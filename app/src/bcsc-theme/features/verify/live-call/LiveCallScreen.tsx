import useApi from '@/bcsc-theme/api/hooks/useApi'
import { AppBannerSection as BannerSection } from '@/bcsc-theme/components/AppBanner'
import useVideoCallFlow from '@/bcsc-theme/features/verify/live-call/hooks/useVideoCallFlow'
import { VideoCallFlowState } from '@/bcsc-theme/features/verify/live-call/types/live-call'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import InCallManager from 'react-native-incall-manager'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import VolumeManager from 'react-native-volume-manager'
import { MediaStreamTrack, RTCView } from 'react-native-webrtc'
import CallIconButton from './components/CallIconButton'
import CallLoadingView from './components/CallLoadingView'
import { formatCallTime } from './utils/formatCallTime'

type LiveCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.LiveCall>
}

const LiveCallScreen = ({ navigation }: LiveCallScreenProps) => {
  const { width } = useWindowDimensions()
  const [store, dispatch] = useStore<BCState>()
  const { ColorPalette, Spacing, NavigationTheme } = useTheme()
  const { t } = useTranslation()
  const iconSize = useMemo(() => width / 6, [width])
  const [videoHidden, setVideoHidden] = useState(false)
  const [onMute, setOnMute] = useState(false)
  const [callStartTime, setCallStartTime] = useState<number | null>(null)
  const [callTimer, setCallTimer] = useState<string>('')
  const [systemVolume, setSystemVolume] = useState<number>(1)
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

  const {
    flowState,
    videoCallError,
    localStream,
    remoteStream,
    isInBackground,
    startVideoCall,
    cleanup,
    retryConnection,
    setCallEnded,
  } = useVideoCallFlow(leaveCall)

  const inCall = useMemo(() => flowState === VideoCallFlowState.IN_CALL, [flowState])

  useEffect(() => {
    if (flowState === VideoCallFlowState.IN_CALL && !callStartTime) {
      const startTime = Date.now()
      setCallStartTime(startTime)
    } else if (flowState !== VideoCallFlowState.IN_CALL && callStartTime) {
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

  // Monitor device volume changes
  useEffect(() => {
    const getInitialVolume = async () => {
      try {
        const volume = await VolumeManager.getVolume()
        setSystemVolume(volume.volume)
      } catch (error) {
        logger.warn('Failed to get initial volume', { error: error as Error })
      }
    }

    const volumeListener = VolumeManager.addVolumeListener((result) => {
      setSystemVolume(result.volume)
    })

    getInitialVolume()

    return () => {
      volumeListener?.remove()
    }
  }, [logger])

  const banner: { type: 'warning' | 'error'; title: string } | null = useMemo(() => {
    if (isInBackground) {
      return { type: 'warning', title: t('Unified.VideoCall.VideoWillResume') }
    }
    if (videoHidden) {
      return { type: 'error', title: t('Unified.VideoCall.AgentCantSeeYou') }
    }
    if (systemVolume === 0) {
      return { type: 'error', title: 'Please turn up the volume to hear the agent' }
    }
    if (onMute) {
      return { type: 'error', title: t('Unified.VideoCall.AgentCantHearYou') }
    }
    if (systemVolume < 0.2) {
      return { type: 'warning', title: 'Your volume is low, you may need to turn it up to hear the agent' }
    }

    return null
  }, [isInBackground, onMute, videoHidden, inCall, systemVolume, t])

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
    if (flowState === VideoCallFlowState.IDLE) {
      startVideoCall()
      InCallManager.start({ media: 'video', auto: true })
    }
  }, [flowState, startVideoCall])

  const stateMessage = useMemo(() => {
    switch (flowState) {
      case VideoCallFlowState.CREATING_SESSION:
        return t('Unified.VideoCall.CreatingSession')
      case VideoCallFlowState.CONNECTING_WEBRTC:
        return t('Unified.VideoCall.ConnectingWebRTC')
      case VideoCallFlowState.WAITING_FOR_AGENT:
        return t('Unified.VideoCall.WaitingForAgent')
      case VideoCallFlowState.IN_CALL:
        return null
      case VideoCallFlowState.ERROR:
        return videoCallError?.message || t('Unified.VideoCall.GenericError')
      default:
        return t('Unified.VideoCall.Initializing')
    }
  }, [flowState, videoCallError, t])

  const handleEndCall = useCallback(async () => {
    try {
      await cleanup()
      setCallEnded()
      await leaveCall()
    } catch (error) {
      logger.error('Error while leaving video call', error as Error)
    }
  }, [cleanup, leaveCall, logger])

  if (flowState === VideoCallFlowState.ERROR) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground, padding: Spacing.md }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Icon name="alert-circle" size={64} color={ColorPalette.semantic.error} />
          <ThemedText variant={'headingTwo'} style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
            {t('Unified.VideoCall.ConnectionError')}
          </ThemedText>
          <ThemedText style={{ marginTop: Spacing.md, textAlign: 'center' }}>{stateMessage}</ThemedText>
        </View>
        <View style={{ gap: Spacing.sm }}>
          {videoCallError?.retryable && (
            <Button
              buttonType={ButtonType.Primary}
              onPress={retryConnection}
              title={t('Unified.VideoCall.TryAgain')}
              accessibilityLabel={t('Unified.VideoCall.TryAgain')}
              testID={testIdWithKey('TryAgain')}
            />
          )}
          <Button
            buttonType={ButtonType.Secondary}
            onPress={() => navigation.goBack()}
            title={t('Unified.VideoCall.GoBack')}
            accessibilityLabel={t('Unified.VideoCall.GoBack')}
            testID={testIdWithKey('GoBack')}
          />
        </View>
      </SafeAreaView>
    )
  }

  if (flowState === VideoCallFlowState.CALL_ENDED) {
    return <CallLoadingView message={t('Unified.VideoCall.CallStates.CallEnded')} />
  }

  if (flowState !== VideoCallFlowState.IN_CALL) {
    return <CallLoadingView onCancel={handleEndCall} message={stateMessage || undefined} />
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
      bottom: '15%',
      flex: 1,
      transform: [{ scale: 1.5 }], // zoom
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
      padding: Spacing.md,
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

      <SafeAreaView edges={['top']} style={{ flex: 0, backgroundColor: NavigationTheme.colors.primary }} />
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
