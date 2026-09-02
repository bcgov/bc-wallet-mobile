/** Shared shapes for the e2e brief: parsed JUnit results and the statuses a coverage cell can show. */

export type Platform = 'ios' | 'android'
export const PLATFORMS: readonly Platform[] = ['ios', 'android']
export const PLATFORM_LABEL: Record<Platform, string> = { ios: 'iOS', android: 'Android' }

/** One checkpoint's outcome. `blocked` = skipped because an earlier checkpoint in the file failed (mochaOpts.bail). */
export type CheckpointStatus = 'pass' | 'fail' | 'blocked' | 'skipped'
/** What a coverage cell shows: a checkpoint roll-up, or a row that has no automated result to roll up. */
export type CellStatus = CheckpointStatus | 'not-run' | 'na' | 'manual'

export interface TestResult {
  /** The `it` title as the JUnit reporter wrote it (non-alphanumerics collapsed to spaces). */
  name: string
  status: CheckpointStatus
  /** First line of the failure message, when it failed. */
  message?: string
  timeSec: number
}

export interface HookFailure {
  title: string
  message: string
}

export interface SuiteResult {
  platform: Platform
  /** Spec path relative to e2e/, e.g. `test/bcsc/main/settings.journey.ts`. */
  file: string
  /** The exact describe title (the reporter keeps it in the `suiteName` property). */
  title: string
  timestamp: string
  timeSec: number
  tests: TestResult[]
  hookFailures: HookFailure[]
  /** The report dir the suite came from. */
  source: string
}

/** A worker that never got a session: the reporter emits one nameless failure and nothing else. */
export interface RunnerError {
  platform?: Platform
  message: string
  source: string
}

export interface PlatformRun {
  platform: Platform
  suites: SuiteResult[]
  /** Report dirs that contributed to this platform. */
  sources: string[]
}

export type RunResults = Partial<Record<Platform, PlatformRun>>

/** A directory holding `junit/` and/or `a11y/` — a local `e2e/reports` or a downloaded `e2e-reports-*` artifact. */
export interface ReportDir {
  path: string
  name: string
}
