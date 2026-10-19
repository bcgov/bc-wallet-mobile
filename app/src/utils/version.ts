import { getVersion } from 'react-native-device-info'

// Enumeration of app versions for comparison purposes.
export enum AppVersion {
  V4_0_x = '4.0.x', // BCSC React re-write
  V4_1_x = '4.1.x', // BCSC + BCWallet (wallet non-blocking) integration
  V4_2_x = '4.2.x', // BCSC + BCWallet (wallet blocking) integration
}

/**
 * Returns true if current app version is >= `minVersion`.
 * Supports wildcard segments in minVersion (ie: "4.1.x" ignores patch).
 *
 * @example
 * ```ts
 * isVersionAtLeast('4.1.x') // true if current version is 4.1.0 or higher
 * ```
 *
 * @param minVersion - The minimum version string to compare against (ie: "4.1.x").
 * @returns True if `version` is greater than or equal to `minVersion`, false otherwise.
 */
export const isVersionAtLeast = (minVersion: string): boolean => {
  const versionParts = getVersion().split('.').map(Number)
  const minParts = minVersion.split('.')

  for (let i = 0; i < minParts.length; i++) {
    if (minParts[i] === 'x' || minParts[i] === '*') {
      return true // wildcard reached, everything before it matched
    }

    const current = versionParts[i] ?? 0
    const min = Number(minParts[i])

    if (current > min) {
      return true
    }

    if (current < min) {
      return false
    }
    // equal → continue to next segment
  }

  return true // all segments equal
}

/**
 * True when `candidate` is strictly newer than `current`, comparing numeric segments (missing = 0).
 * False if either side has an empty or non-numeric segment (e.g. "", "4.x", "4.2.0-rc1").
 */
export const isNewerVersion = (candidate: string, current: string): boolean => {
  const candidateParts = candidate.split('.')
  const currentParts = current.split('.')

  if (![...candidateParts, ...currentParts].every((part) => /^\d+$/.test(part))) {
    return false
  }

  const length = Math.max(candidateParts.length, currentParts.length)

  for (let i = 0; i < length; i++) {
    const candidateSegment = Number(candidateParts[i] ?? 0)
    const currentSegment = Number(currentParts[i] ?? 0)

    if (candidateSegment !== currentSegment) {
      return candidateSegment > currentSegment
    }
  }

  return false
}
