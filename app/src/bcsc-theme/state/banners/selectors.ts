import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import { getOptionalUpdateAvailable } from './optional-update'

/**
 * Determines whether an optional update is available based on the server status and app version.
 *
 * @param serverStatus - The server status response data.
 * @returns - True if an optional update is available, false otherwise.
 */
export const selectOptionalUpdateAvailable = (serverStatus: ServerStatusResponseData | null): boolean => {
  if (!serverStatus) {
    return false
  }

  if (!Array.isArray(serverStatus.supportedVersions)) {
    return false
  }

  return getOptionalUpdateAvailable({
    appVersion: getVersion(),
    appBuild: Number(getBuildNumber()),
    minBuild: Number(serverStatus.minVersion),
    supportedVersions: serverStatus.supportedVersions,
  })
}
