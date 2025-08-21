import useVideoCallFlow from '@/bcsc-theme/api/hooks/useVideoCallFlow'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import ProgressBar from '@/components/ProgressBar'
import Mountains from '@assets/img/mountains-circle.svg'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useMemo, useState } from 'react'
import { ColorValue, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { RTCView, MediaStreamTrack } from 'react-native-webrtc'

type IconButtonProps = {
  onPress: () => void
  primaryColor: ColorValue
  secondaryColor: ColorValue
  size: number
  iconName: string
  label: string
  testIDKey: string
}

const IconButton = ({ onPress, primaryColor, secondaryColor, size, iconName, label, testIDKey }: IconButtonProps) => {
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

const LoadingView = ({ onCancel, message }: { onCancel: () => void; message?: string }) => {
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
  const { ColorPalette, Spacing } = useTheme()
  const iconSize = useMemo(() => width / 6, [width])
  const [videoHidden, setVideoHidden] = useState(false)
  const [onMute, setOnMute] = useState(false)

  const {
    flowState,
    session,
    call,
    error,
    localStream,
    remoteStream,
    startVideoCall,
    endCall: endVideoCall,
    retryConnection,
    isConnecting,
    isCreatingSession,
  } = useVideoCallFlow()

  // Handle actual muting of audio tracks
  useEffect(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks()
      audioTracks.forEach((track: MediaStreamTrack) => {
        track.enabled = !onMute
      })
    }
  }, [onMute, localStream])

  // Handle actual hiding of video tracks
  useEffect(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks()
      videoTracks.forEach((track: MediaStreamTrack) => {
        track.enabled = !videoHidden
      })
    }
  }, [videoHidden, localStream])

  // Toggle mute functionality
  const toggleMute = () => {
    setOnMute(prev => !prev)
  }

  // Toggle video functionality  
  const toggleVideo = () => {
    setVideoHidden(prev => !prev)
  }

  useEffect(() => {
    startVideoCall()
  }, [startVideoCall])

  // Show different states based on flow
  const getStateMessage = () => {
    switch (flowState) {
      case 'checking_availability':
        return 'Checking service availability...'
      case 'creating_session':
        return 'Creating video session...'
      case 'connecting_webrtc':
        return 'Connecting to video service...'
      case 'waiting_for_agent':
        return 'Waiting for an agent to join...'
      case 'in_call':
        return null // Show video interface
      case 'error':
        return error?.message || 'An error occurred'
      default:
        return 'Initializing...'
    }
  }

  const handleEndCall = () => {
    endVideoCall()
  }

  // Show loading/error states
  if (flowState !== 'in_call') {
    const stateMessage = getStateMessage()

    if (flowState === 'error' && error) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground, padding: Spacing.md }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Icon name="alert-circle" size={64} color={ColorPalette.semantic.error} />
            <ThemedText variant={'headingTwo'} style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
              Connection Error
            </ThemedText>
            <ThemedText style={{ marginTop: Spacing.md, textAlign: 'center' }}>{error.message}</ThemedText>
          </View>
          <View style={{ gap: Spacing.sm }}>
            {error.retryable && (
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

    // Show loading state with progress
    return <LoadingView onCancel={handleEndCall} message={stateMessage || undefined} />
  }

  // In-call video interface
  const styles = StyleSheet.create({
    agentVideo: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      flex: 1,
      backgroundColor: 'black',
    },
    container: {
      flex: 1,
      backgroundColor: 'black',
    },
    controlsAndSelfieContainer: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: 0,
      flex: 1,
    },
    controlsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: Spacing.lg,
      backgroundColor: ColorPalette.notification.popupOverlay,
    },
    selfieVideoContainer: {
      margin: Spacing.md,
      width: width / 4,
      height: (width / 4) * 1.5,
      borderRadius: Spacing.sm,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: ColorPalette.grayscale.white,
    },
    selfieVideo: {
      flex: 1,
    },
  })

  return (
    <View style={styles.container}>
      {remoteStream && <RTCView style={styles.agentVideo} objectFit={'contain'} streamURL={remoteStream.toURL()} />}

      <View style={styles.controlsAndSelfieContainer}>
        {localStream && (
          <View style={styles.selfieVideoContainer}>
            <RTCView mirror style={styles.selfieVideo} objectFit={'cover'} streamURL={localStream.toURL()} />
          </View>
        )}

        <View style={styles.controlsContainer}>
          <IconButton
            onPress={toggleMute}
            primaryColor={ColorPalette.grayscale.white}
            secondaryColor={'transparent'}
            size={iconSize}
            iconName={onMute ? 'microphone-off' : 'microphone'}
            label={onMute ? 'Unmute' : 'Mute'}
            testIDKey={'Mute'}
          />
          <IconButton
            onPress={toggleVideo}
            primaryColor={ColorPalette.grayscale.white}
            secondaryColor={'transparent'}
            size={iconSize}
            iconName={videoHidden ? 'video-off' : 'video'}
            label={videoHidden ? 'Show Video' : 'Hide Video'}
            testIDKey={'Video'}
          />
          <IconButton
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
    </View>
  )
}

export default LiveCallScreen
