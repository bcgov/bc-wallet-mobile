import { isNewerVersion } from '@/utils/version'

/** The kind of app update the server is asking for. */
export enum AppUpdate {
  Mandatory = 'mandatory', // The app build is below the server's minimum build
  Optional = 'optional', // A supported version is newer than the app version
  None = 'none', // The app is current
  Unknown = 'unknown', // The server did not supply the facts needed to decide
}

interface AppUpdateFacts {
  appVersion: string // Current app version (semver)
  appBuild: number // Current app build number
  minBuild: number | undefined // Minimum build number supplied by the server (undefined or NaN when missing)
  supportedVersions: string[] | undefined // List of semver strings supplied by the server (undefined when missing)
}

/**
 * Determines which kind of app update applies, in order:
 *   1. `Unknown` when the minimum build or the supported versions are missing (fails closed, nothing is shown).
 *   2. `Mandatory` when the app build is below the minimum build (handled by the MandatoryUpdate modal).
 *   3. `Optional` when a supported version is newer than the app version.
 *   4. `None` otherwise.
 *
 * @param facts - The app version and build, and the minimum build and supported versions from the server.
 * @returns - The kind of update that applies.
 */
export const getAppUpdate = (facts: AppUpdateFacts): AppUpdate => {
  if (facts.minBuild === undefined || isNaN(facts.minBuild)) {
    return AppUpdate.Unknown
  }

  if (facts.supportedVersions === undefined) {
    return AppUpdate.Unknown
  }

  if (facts.appBuild < facts.minBuild) {
    return AppUpdate.Mandatory
  }

  if (facts.supportedVersions.length === 0) {
    return AppUpdate.None
  }

  const optionalUpdateAvailable = facts.supportedVersions.some(
    (version) => typeof version === 'string' && isNewerVersion(version, facts.appVersion)
  )

  if (optionalUpdateAvailable) {
    return AppUpdate.Optional
  }

  return AppUpdate.None
}
