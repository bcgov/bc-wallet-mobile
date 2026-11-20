/** A build of the app, identified by its version and build number. */
export interface AppBuild {
  version: string
  build: string
}

/**
 * Records a build in the history when it differs from the newest recorded build.
 * The history is ordered with the most recent build at the front, and the array passed in is never mutated.
 *
 * @param version - The version of the build to record.
 * @param build - The build number of the build to record.
 * @param history - The recorded builds, or undefined when nothing has been recorded yet.
 * @returns A copy of the history, with the build added at the front if it differs from the newest recorded build.
 */
export const addNewBuildToHistory = (version: string, build: string, history: AppBuild[] | undefined): AppBuild[] => {
  const newHistory = history ? [...history] : []
  const lastBuild = newHistory[0]

  if (isAppBuildEqual(lastBuild, { version, build })) {
    // no change
    return newHistory
  }

  // Add the new build to the front of the history array
  newHistory.unshift({ version, build })

  return newHistory
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
