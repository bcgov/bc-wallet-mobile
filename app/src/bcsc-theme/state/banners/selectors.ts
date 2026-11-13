import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import { AppUpdate, getAppUpdate } from './app-update'

/**
 * Selects the kind of app update that applies from the server status and the installed app version and build.
 * A missing server status gives `AppUpdate.Unknown`.
 *
 * @param serverStatus - The server status response data, or null when it has not loaded.
 * @returns - The kind of update that applies, see `getAppUpdate`.
 */
export const selectAppUpdate = (serverStatus: ServerStatusResponseData | null): AppUpdate => {
  return getAppUpdate({
    appVersion: getVersion(),
    appBuild: Number(getBuildNumber()),
    minBuild: serverStatus?.minVersion ? Number(serverStatus.minVersion) : undefined,
    supportedVersions: serverStatus?.supportedVersions,
  })
}
