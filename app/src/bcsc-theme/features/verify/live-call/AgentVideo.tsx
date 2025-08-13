import type { StyleProp, ViewStyle } from 'react-native'
import { MediaStream, RTCView } from 'react-native-webrtc'

interface AgentVideoProps {
  mediaStream: MediaStream | null
  objectFit?: 'contain' | 'cover'
  style?: StyleProp<ViewStyle>
}

export const AgentVideo = ({ mediaStream, objectFit, style }: AgentVideoProps): JSX.Element => {
  return <RTCView streamURL={mediaStream?.toURL()} objectFit={objectFit ?? 'cover'} style={style} />
}
export default AgentVideo
