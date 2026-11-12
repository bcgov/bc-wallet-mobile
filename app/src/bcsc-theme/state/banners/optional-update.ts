import { isNewerVersion } from '@/utils/version'

interface OptionalUpdateFacts {
  appVersion: string // Current app version (semver)
  appBuild: number // Current app build number
  minBuild: number // Minimum build number supplied by the server (NaN when missing, which fails open)
  supportedVersions: string[] // List of semver strings supplied by the server
}

/**
 * Determines whether an optional update is available: a supported version is newer than the app and the app build is
 * not below the server's minimum build (that case is a mandatory update, handled by the MandatoryUpdate modal).
 *
 * @param facts - The facts needed to determine whether an optional update is available.
 * @returns - True if an optional update is available
 */
export const getOptionalUpdateAvailable = (facts: OptionalUpdateFacts): boolean => {
  if (facts.appBuild < facts.minBuild) {
    // A build below the minimum is a mandatory update, handled by the MandatoryUpdate modal
    return false
  }

  const updateAvailable = facts.supportedVersions.some(
    (version) => typeof version === 'string' && isNewerVersion(version, facts.appVersion)
  )
  return updateAvailable
}
