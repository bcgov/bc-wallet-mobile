import { isNewerVersion } from '@/utils/version'

interface UpdateBannerFacts {
  appVersion: string // Current app version (semver)
  supportedVersions: string[] // List of semver strings supplied by the server
}

/**
 * Determines whether the update banner should be visible based on the current app version and the list of supported versions.
 *
 * @param facts - The facts needed to determine banner visibility.
 * @returns - True if an update is available
 */
export const getUpdateBannerVisible = (facts: UpdateBannerFacts): boolean => {
  const updateAvailable = facts.supportedVersions.some(
    (version) => typeof version === 'string' && isNewerVersion(version, facts.appVersion)
  )
  return updateAvailable
}
