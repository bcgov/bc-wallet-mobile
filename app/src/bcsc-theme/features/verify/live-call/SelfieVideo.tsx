import type { StyleProp, ViewStyle } from 'react-native'
import { MediaStream, RTCView } from 'react-native-webrtc'

interface SelfieVideoProps {
  mediaStream: MediaStream | null
  objectFit?: 'contain' | 'cover'
  style?: StyleProp<ViewStyle>
}

const SelfieView = ({ mediaStream, objectFit, style }: SelfieVideoProps): JSX.Element => {
  return <RTCView mirror={true} streamURL={mediaStream?.toURL()} objectFit={objectFit ?? 'cover'} style={style} />
}

export default SelfieView
