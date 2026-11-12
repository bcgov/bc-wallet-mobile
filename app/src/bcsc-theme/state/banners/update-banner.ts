import { isNewerVersion } from '@/utils/version'

interface UpdateBannerFacts {
  appVersion: string // Current app version (semver)
  appBuild: number // Current app build number
  minBuild: number // Minimum build number supplied by the server (NaN when missing, which fails open)
  supportedVersions: string[] // List of semver strings supplied by the server
}

/**
 * Determines whether the update banner should be visible based on the current app version and the list of supported versions.
 *
 * @param facts - The facts needed to determine banner visibility.
 * @returns - True if an update is available
 */
export const getUpdateBannerVisible = (facts: UpdateBannerFacts): boolean => {
  if (facts.appBuild < facts.minBuild) {
    // A build below the minimum is a mandatory update, handled by the MandatoryUpdate modal
    return false
  }

  const updateAvailable = facts.supportedVersions.some(
    (version) => typeof version === 'string' && isNewerVersion(version, facts.appVersion)
  )
  return updateAvailable
}
