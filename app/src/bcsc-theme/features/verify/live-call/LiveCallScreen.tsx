import { StyleSheet, TouchableOpacity, useWindowDimensions, View, ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AgentVideo from './AgentVideo'
import SelfieVideo from './SelfieVideo'
import { testIdWithKey, useTheme } from '@bifold/core'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useEffect, useMemo, useState } from 'react'
import { BannerSection } from '@bifold/core/src/components/views/Banner'
import { mediaDevices, MediaStream } from 'react-native-webrtc'

type IconButtonProps = {
  onPress: () => void
  style?: ViewStyle
  iconColor: string
  backgroundColor: string
  size: number
  name: string
  label: string
}

const IconButton = ({ onPress, style = {}, iconColor, backgroundColor, size, name, label }: IconButtonProps) => {
  const styles = StyleSheet.create({
    iconButton: {
      width: size,
      height: size,
      borderRadius: size / 2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor,
    },
  })

  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testIdWithKey(label)}
      accessibilityLabel={label}
      style={[styles.iconButton, style]}
    >
      <Icon name={name} size={size - 32} color={iconColor} />
    </TouchableOpacity>
  )
}

type LiveCallScreenProps = {
  navigation: any
}

const LiveCallScreen = ({ navigation }: LiveCallScreenProps) => {
  // const { agentMediaStream, selfieMediaStream } = useLiveCall()
  const [selfieMediaStream, setSelfieMediaStream] = useState<MediaStream | null>(null)
  const { width } = useWindowDimensions()
  const { ColorPalette, Spacing } = useTheme()
  const iconSize = useMemo(() => width / 6, [width])
  const [onSpeaker, setOnSpeaker] = useState(false)
  const [onMute, setOnMute] = useState(false)

  const styles = StyleSheet.create({
    agentVideo: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      flex: 1,
      backgroundColor: 'transparent',
    },
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    controlsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    selfieVideo: {
      position: 'absolute',
      bottom: Spacing.md,
      right: 0,
      width: width / 2,
      aspectRatio: 1,
    },
  })

  useEffect(() => {
    const asyncEffect = async () => {
      const stream = await mediaDevices.getUserMedia({
        video: {
          frameRate: 30,
          facingMode: 'user',
        },
      })
      setSelfieMediaStream(stream)
    }

    asyncEffect()
  }, [])

  const statusMessage = useMemo(() => {
    if (onMute) {
      return `Agent can't hear you when your microphone is off`
    }

    return null
  }, [onMute])

  return (
    <View style={{ flex: 1 }}>
      <AgentVideo style={styles.agentVideo} objectFit={'cover'} mediaStream={selfieMediaStream} />
      <SafeAreaView style={styles.container}>
        <View style={styles.controlsContainer}>
          <IconButton
            onPress={() => setOnSpeaker((prev) => !prev)}
            size={iconSize}
            name={'volume-high'}
            backgroundColor={onSpeaker ? ColorPalette.grayscale.white : ColorPalette.notification.popupOverlay}
            iconColor={onSpeaker ? ColorPalette.grayscale.black : ColorPalette.grayscale.white}
            label={'Toggle speaker'}
          />
          <IconButton
            onPress={() => setOnMute((prev) => !prev)}
            size={iconSize}
            name={onMute ? 'microphone-off' : 'microphone'}
            backgroundColor={onMute ? ColorPalette.notification.popupOverlay : ColorPalette.grayscale.white}
            iconColor={onMute ? ColorPalette.grayscale.white : ColorPalette.grayscale.black}
            label={'Toggle mute'}
          />
          <IconButton
            onPress={() => {}}
            size={iconSize}
            name={'information-variant'}
            backgroundColor={ColorPalette.notification.popupOverlay}
            iconColor={ColorPalette.grayscale.white}
            label={'Help'}
          />
          <IconButton
            onPress={() => {}}
            size={iconSize}
            name={'phone-cancel'}
            backgroundColor={ColorPalette.semantic.error}
            iconColor={ColorPalette.grayscale.white}
            label={'End call'}
          />
        </View>
        {statusMessage ? (
          <BannerSection
            id={'status-message'}
            variant={'detail'}
            type={'error'}
            dismissible={false}
            title={statusMessage}
            onToggle={undefined}
          />
        ) : null}
        <SelfieVideo style={styles.selfieVideo} objectFit={'contain'} mediaStream={selfieMediaStream} />
      </SafeAreaView>
    </View>
  )
}

export default LiveCallScreen
