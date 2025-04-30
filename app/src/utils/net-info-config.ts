import { NetInfoConfiguration } from '@react-native-community/netinfo'
import Config from 'react-native-config'

// We don't want to actually request an invitation from the mediator
// (which follows the '?') so we just use the base URL
const fullMedUrl = Config.MEDIATOR_URL || ''
let endIndex = fullMedUrl.indexOf('?')
if (endIndex === -1) {
  endIndex = fullMedUrl.length
}
const reachabilityUrl = fullMedUrl.substring(0, endIndex)

// Links to docs: https://github.com/react-native-netinfo/react-native-netinfo/tree/master?tab=readme-ov-file#netinfoconfiguration
export const netInfoConfig: Partial<NetInfoConfiguration> = {
  useNativeReachability: false,
  reachabilityUrl,
  reachabilityTest: async (response: Response) => {
    return response.status >= 200 && response.status <= 299
  },
  reachabilityRequestTimeout: 3000,
}
