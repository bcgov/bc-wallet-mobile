/** A build of the app, identified by its version and build number. */
export interface AppBuild {
  version: string
  build: string
}

/** The most builds kept in the history; recording a build beyond this drops the oldest. */
export const MAX_APP_BUILD_HISTORY = 20

/** The outcome of {@link addNewBuildToHistory}. */
export interface AddBuildResult {
  /** The history after the build was considered, newest first and capped at {@link MAX_APP_BUILD_HISTORY}. */
  history: AppBuild[]
  /** True when the build was added to the front; false when it already matched the newest recorded build. */
  added: boolean
}

/**
 * Records a build in the history when it differs from the newest recorded build.
 * The history is ordered with the most recent build at the front, holds at most {@link MAX_APP_BUILD_HISTORY}
 * builds, and the array passed in is never mutated.
 *
 * @param newBuild - The build to record.
 * @param history - The recorded builds, or undefined when nothing has been recorded yet.
 * @returns The resulting history, and whether the build was added. The history is trimmed to the cap either way.
 */
export const addNewBuildToHistory = (newBuild: AppBuild, history: AppBuild[] | undefined): AddBuildResult => {
  const current = history ?? []

  if (isAppBuildEqual(current[0], newBuild)) {
    return { history: current.slice(0, MAX_APP_BUILD_HISTORY), added: false }
  }

  return { history: [newBuild, ...current].slice(0, MAX_APP_BUILD_HISTORY), added: true }
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
 * @example formatBuildHistory([{ version: '4.1.0', build: '2000' }, { version: '4.0.0', build: '1000' }]) // returns "4.1.0+2000 < 4.0.0+1000"
 * @param history - The build history to format.
 * @returns A string representation of the build history
 */
export const formatBuildHistory = (history: AppBuild[]): string => {
  return history.map((build) => `${build.version}+${build.build}`).join(' < ')
}
