import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import { AppUpdate, getOptionalUpdateAvailable } from './optional-update'

/**
 * Determines whether an optional update is available based on the server status and app version.
 *
 * @param serverStatus - The server status response data.
 * @returns - True if an optional update is available, false otherwise.
 */
export const selectOptionalUpdateAvailable = (serverStatus: ServerStatusResponseData | null): AppUpdate => {
  return getOptionalUpdateAvailable({
    appVersion: getVersion(),
    appBuild: Number(getBuildNumber()),
    minBuild: serverStatus?.minVersion ? Number(serverStatus.minVersion) : undefined,
    supportedVersions: serverStatus?.supportedVersions,
  })
}
