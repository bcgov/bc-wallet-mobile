import useApi from '@/bcsc-theme/api/hooks/useApi'
import { AppBannerSection as BannerSection, BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import useVideoCallFlow from '@/bcsc-theme/features/verify/live-call/hooks/useVideoCallFlow'
import { VideoCallFlowState } from '@/bcsc-theme/features/verify/live-call/types/live-call'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import InCallManager from 'react-native-incall-manager'
import { SafeAreaView } from 'react-native-safe-area-context'
import { VolumeManager } from 'react-native-volume-manager'
import { MediaStreamTrack, RTCView } from 'react-native-webrtc'
import CallErrorView from './components/CallErrorView'
import CallIconButton from './components/CallIconButton'
import CallLoadingView from './components/CallLoadingView'
import CallProcessingView from './components/CallProcessingView'

import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { CROP_DELAY_MS } from '@/constants'
import { clearIntervalIfExists, clearTimeoutIfExists } from './utils/clearTimeoutIfExists'
import { formatCallTime } from './utils/formatCallTime'

type LiveCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.LiveCall>
}

const LiveCallScreen = ({ navigation }: LiveCallScreenProps) => {
  const { width } = useWindowDimensions()
  const [store] = useStore<BCState>()
  const { ColorPalette, Spacing, NavigationTheme } = useTheme()
  const { t } = useTranslation()
  const iconSize = useMemo(() => width / 6, [width])
  const [videoHidden, setVideoHidden] = useState(false)
  const [onMute, setOnMute] = useState(false)
  const [callStartTime, setCallStartTime] = useState<number | null>(null)
  const [callTimer, setCallTimer] = useState<string>('')
  const [systemVolume, setSystemVolume] = useState<number>(1)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const cropDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { token } = useApi()
  const { updateTokens } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  // check if verified, save token if so, and then navigate accordingly
  const leaveCall = useCallback(async () => {
    try {
      if (!store.bcscSecure.deviceCode || !store.bcscSecure.userCode) {
        throw new Error(t('BCSC.VideoCall.DeviceCodeError'))
      }

      const { refresh_token } = await token.checkDeviceCodeStatus(
        store.bcscSecure.deviceCode,
        store.bcscSecure.userCode
      )

      if (refresh_token) {
        await updateTokens({ refreshToken: refresh_token })
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.VerificationSuccess }],
        })
      )
    } catch {
      // TODO (bm): as of Sept 10th 2025, the API throws if the user is not
      // verified even though it isn't truly an error. We should check for
      // this case specifically and only throw if it's some other error
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
  }, [store.bcscSecure.deviceCode, store.bcscSecure.userCode, token, updateTokens, navigation, logger, t])

  // we pass the leaveCall function to the hook so it can use it when the other side disconnects as well
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

  // start crop delay timeout when call starts. the crop delay is to match the
  // current BCSC where the timer doesn't start until after 11 seconds. In
  // future we can use this 11 seconds to crop the bottom part of the remote video that
  // shows the users video for the first ten seconds (we don't want that extra
  // feed of the users video since we are already showing it ourselves)
  useEffect(() => {
    if (flowState === VideoCallFlowState.IN_CALL && !callStartTime) {
      cropDelayTimeoutRef.current = setTimeout(() => {
        const startTime = Date.now()
        setCallStartTime(startTime)
      }, CROP_DELAY_MS)
    } else if (flowState !== VideoCallFlowState.IN_CALL && callStartTime) {
      setCallStartTime(null)
      setCallTimer('')
    }

    return () => {
      clearTimeoutIfExists(cropDelayTimeoutRef)
    }
  }, [flowState, callStartTime])

  // when call start time is first set, begin updating the user-facing
  // display of the call length
  useEffect(() => {
    if (callStartTime) {
      const updateTimer = () => {
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - callStartTime) / 1000)
        setCallTimer(formatCallTime(elapsedSeconds))
      }

      updateTimer()

      timerIntervalRef.current = setInterval(updateTimer, 1000)
    }
  }, [callStartTime])

  useEffect(() => {
    return () => {
      clearIntervalIfExists(timerIntervalRef)
    }
  }, [])

  // setup volume detection
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

  // Determine which banner notice to show in an order of priority
  const banner: { type: 'warning' | 'error'; title: string } | null = useMemo(() => {
    if (isInBackground) {
      return { type: 'warning', title: t('BCSC.VideoCall.Banners.VideoWillResume') }
    }
    if (videoHidden) {
      return { type: 'error', title: t('BCSC.VideoCall.Banners.AgentCantSeeYou') }
    }
    if (onMute) {
      return { type: 'error', title: t('BCSC.VideoCall.Banners.AgentCantHearYou') }
    }
    if (systemVolume < 0.2) {
      return { type: 'warning', title: t('BCSC.VideoCall.Banners.VolumeLow') }
    }

    return null
  }, [isInBackground, onMute, videoHidden, systemVolume, t])

  // whenever mute choice changes, update the audio tracks accordingly
  useEffect(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks()
      audioTracks.forEach((track: MediaStreamTrack) => {
        track.enabled = !onMute
      })
    }
  }, [onMute, localStream])

  // whenever hide video choice changes, update the video tracks accordingly
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

  // kick off the process only once (flow state doesn't go back to idle)
  useEffect(() => {
    if (flowState === VideoCallFlowState.IDLE) {
      startVideoCall()
      InCallManager.start({ media: 'video', auto: true })
    }
  }, [flowState, startVideoCall])

  // loading / error user-facing state message
  const stateMessage = useMemo(() => {
    switch (flowState) {
      case VideoCallFlowState.CREATING_SESSION:
        return t('BCSC.VideoCall.CallStates.CreatingSession')
      case VideoCallFlowState.CONNECTING_WEBRTC:
        return t('BCSC.VideoCall.CallStates.ConnectingWebRTC')
      case VideoCallFlowState.WAITING_FOR_AGENT:
        return t('BCSC.VideoCall.CallStates.WaitingForAgent')
      case VideoCallFlowState.IN_CALL:
        return null
      case VideoCallFlowState.ERROR:
        return videoCallError?.message || t('BCSC.VideoCall.Errors.GenericError')
      default:
        return t('BCSC.VideoCall.CallStates.Initializing')
    }
  }, [flowState, videoCallError, t])

  // when the user presses the end call button
  const handleEndCall = useCallback(async () => {
    try {
      logger.info('User initiated call end')
      setCallEnded()
      await cleanup()
      await leaveCall()
    } catch (error) {
      logger.error('Error while leaving video call', error as Error)
    }
  }, [setCallEnded, cleanup, leaveCall, logger])

  if (flowState === VideoCallFlowState.ERROR) {
    return (
      <CallErrorView
        message={stateMessage || t('BCSC.VideoCall.Errors.GenericError')}
        onGoBack={() => navigation.goBack()}
        onRetry={videoCallError?.retryable ? retryConnection : undefined}
      />
    )
  }

  if (flowState === VideoCallFlowState.CALL_ENDED) {
    return <CallProcessingView message={t('BCSC.VideoCall.CallStates.CallEnded')} />
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
            <ThemedText>{t('BCSC.VideoCall.ServiceBC')}</ThemedText>
            {callTimer ? <ThemedText>{callTimer}</ThemedText> : null}
          </View>
          {banner ? (
            <BannerSection
              id={BCSCBanner.LIVE_CALL_STATUS}
              type={banner.type}
              title={banner.title}
              dismissible={false}
            />
          ) : null}
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
