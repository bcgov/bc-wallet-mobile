import { RemoteLogger } from '@bifold/remote-logs'
import { decodePayload } from 'react-native-bcsc-core'
import { BcscJwtPayload } from '../api/hooks/useTokens'

export const getDeviceCountFromIdToken = async (idToken: string, logger: RemoteLogger): Promise<number | undefined> => {
  let deviceCount: number | undefined

  // Parse the ID token to extract device count information
  if (idToken) {
    try {
      // Use native decodePayload to decrypt JWE and parse JWT payload
      const payloadString = await decodePayload(idToken)
      const payload: BcscJwtPayload = JSON.parse(payloadString)
      if (payload.bcsc_devices_count !== undefined) {
        deviceCount = payload.bcsc_devices_count
      }
    } catch (error) {
      logger.warn(`Failed to parse ID token payload: ${error}`)
    }
  }

  return deviceCount
}
