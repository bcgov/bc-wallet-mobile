import { isNewerVersion } from '@/utils/version'

export type AppUpdate = 'mandatory' | 'optional' | 'none' | 'unknown'

interface OptionalUpdateFacts {
  appVersion: string // Current app version (semver)
  appBuild: number // Current app build number
  minBuild: number | undefined // Optional minimum build number supplied by the server (NaN when missing, which fails open)
  supportedVersions: string[] | undefined // Optional list of semver strings supplied by the server
}

/**
 * Determines whether an optional update is available: a supported version is newer than the app and the app build is
 * not below the server's minimum build (that case is a mandatory update, handled by the MandatoryUpdate modal).
 *
 * @param facts - The facts needed to determine whether an optional update is available.
 * @returns - True if an optional update is available
 */
export const getOptionalUpdateAvailable = (facts: OptionalUpdateFacts): AppUpdate => {
  if (facts.minBuild === undefined || isNaN(facts.minBuild)) {
    return 'unknown'
  }

  if (!Array.isArray(facts.supportedVersions)) {
    return 'unknown'
  }

  if (facts.appBuild < facts.minBuild) {
    return 'mandatory'
  }

  const optionalUpdateAvailable = facts.supportedVersions.some(
    (version) => typeof version === 'string' && isNewerVersion(version, facts.appVersion)
  )

  if (optionalUpdateAvailable) {
    return 'optional'
  }

  return 'none'
}
