/** A build of the app, identified by its version and build number. */
export interface AppBuild {
  version: string
  build: string
}

/** The most builds kept in the history; recording a build beyond this drops the oldest. */
export const MAX_APP_BUILD_HISTORY = 20

/**
 * Records a build in the history when it differs from the newest recorded build.
 * The history is ordered with the most recent build at the front, holds at most {@link MAX_APP_BUILD_HISTORY}
 * builds, and the array passed in is never mutated.
 *
 * @param version - The version of the build to record.
 * @param build - The build number of the build to record.
 * @param history - The recorded builds, or undefined when nothing has been recorded yet.
 * @returns A copy of the history, with the build added at the front if it differs from the newest recorded build,
 *   and the oldest builds dropped beyond the cap.
 */
export const addNewBuildToHistory = (version: string, build: string, history: AppBuild[] | undefined): AppBuild[] => {
  const newHistory = history ? [...history] : []
  const lastBuild = newHistory[0]

  if (isAppBuildEqual(lastBuild, { version, build })) {
    // no change
    return newHistory
  }

  // Add the new build to the front of the history array, dropping the oldest beyond the cap
  newHistory.unshift({ version, build })

  return newHistory.slice(0, MAX_APP_BUILD_HISTORY)
}

/**
 * Builds an {@link AppBuild} from a version and build number that may be missing.
 *
 * @param version - The version of the build, if known.
 * @param build - The build number of the build, if known.
 * @returns The build, or null when the version or build number is missing or empty.
 */
export const toAppBuild = (version?: string, build?: string): AppBuild | null => {
  return version && build ? { version, build } : null
}

/**
 * Compares two builds by version and build number.
 *
 * @param a - The first build, or undefined when there is none.
 * @param b - The build to compare it with.
 * @returns True when both builds have the same version and build number, false otherwise (including when `a` is undefined).
 */
export const isAppBuildEqual = (a: AppBuild | undefined, b: AppBuild): boolean => {
  return Boolean(a && a.version === b.version && a.build === b.build)
}

/**
 * Formats a build history into a string for display.
 *
 * @example formatBuildHistory([{ version: '4.0.0', build: '100' }, { version: '4.1.0', build: '200' }]) // returns "4.0.0+100 < 4.1.0+200"
 * @param history - The build history to format.
 * @returns A string representation of the build history
 */
export const formatBuildHistory = (history: AppBuild[]): string => {
  return history.map((build) => `${build.version}+${build.build}`).join(' < ')
}
