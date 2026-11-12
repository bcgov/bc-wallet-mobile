import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { getVersion } from 'react-native-device-info'
import { getUpdateBannerVisible } from './update-banner'

/**
 * Determines whether the update banner should be visible based on the server status and app version.
 *
 * @param serverStatus - The server status response data.
 * @returns - True if an update is available, false otherwise.
 */
export const selectUpdateBannerVisible = (serverStatus: ServerStatusResponseData | null): boolean => {
  if (!serverStatus) {
    return false
  }

  if (!Array.isArray(serverStatus.supportedVersions)) {
    return false
  }

  return getUpdateBannerVisible({
    appVersion: getVersion(),
    supportedVersions: serverStatus.supportedVersions,
  })
}
