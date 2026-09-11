import type { CoverageRow, CoverageSection, Proof } from './coverage-map.js'
import { sanitizeTitle } from './junit.js'
import type { CellStatus, CheckpointStatus, Platform, PlatformRun, RunResults, SuiteResult, TestResult } from './types.js'

/**
 * Coverage rows × platforms → cells. A row's automated status is the roll-up of its proving
 * checkpoints: any fail → fail, else any blocked → blocked, else any pass → pass, else any skipped →
 * skipped, else not run. Rows proved by hand (or not applicable) keep that verdict, but carry the
 * automated evidence alongside when there is some.
 *
 * mochaOpts.bail stops a file at its first failure and the reporter writes nothing for the checkpoints
 * behind it, so a suite that failed counts its unreported `it` titles (read from the spec when it is on
 * disk) as blocked instead of letting them read as "not run".
 */

/** The `it` titles of a spec (relative to e2e/) in file order, or undefined when the spec is not on disk. */
export type SpecTitleLookup = (file: string) => string[] | undefined

const noSpecTitles: SpecTitleLookup = () => undefined

export interface CellResult {
  status: CellStatus
  /** Checkpoints the row lists (a whole-suite proof with no result counts as one). */
  listed: number
  passed: number
  failed: number
  blocked: number
  skipped: number
  notRun: number
  /** The automated evidence behind a manual / n-a / skipped row, when it ran. */
  auto?: CellResult
}

export interface EvaluatedRow {
  row: CoverageRow
  cells: Record<Platform, CellResult>
}

export interface EvaluatedSection {
  section: CoverageSection
  rows: EvaluatedRow[]
}

export interface FailureDetail {
  platform: Platform
  file: string
  suite: string
  checkpoint: string
  message: string
  /** Checkpoints the failure blocked behind it in the same file. */
  blockedAfter: number
  kind: 'test' | 'hook'
}

export interface PlatformTotals {
  suites: number
  checkpoints: number
  passed: number
  failed: number
  blocked: number
  skipped: number
  timeSec: number
}

function emptyCell(status: CellStatus): CellResult {
  return { status, listed: 0, passed: 0, failed: 0, blocked: 0, skipped: 0, notRun: 0 }
}

function matchSuites(proof: Proof, run: PlatformRun | undefined): SuiteResult[] {
  const wanted = proof.suite ? sanitizeTitle(proof.suite) : undefined
  return (run?.suites ?? []).filter(
    (suite) => suite.file === proof.file && (!wanted || sanitizeTitle(suite.title) === wanted)
  )
}

function tally(cell: CellResult, status: CheckpointStatus): void {
  cell.listed++
  if (status === 'pass') cell.passed++
  else if (status === 'fail') cell.failed++
  else if (status === 'blocked') cell.blocked++
  else cell.skipped++
}

function rollUp(cell: CellResult, hookFailed: boolean): CellStatus {
  if (hookFailed || cell.failed) return 'fail'
  if (cell.blocked) return 'blocked'
  if (cell.passed) return 'pass'
  if (cell.skipped) return 'skipped'
  return 'not-run'
}

/** Titles in the spec with no result in the suite — what bail left unreported. */
function unreportedTitles(file: string, tests: TestResult[], titlesOf: SpecTitleLookup): string[] {
  const reported = new Set(tests.map((test) => sanitizeTitle(test.name)))
  return (titlesOf(file) ?? []).filter((title) => !reported.has(sanitizeTitle(title)))
}

/** Tally the listed titles by name; a title with no result is blocked when the file bailed, else not run. */
function tallyNamed(cell: CellResult, titles: string[], tests: TestResult[], bailed: boolean): void {
  for (const title of titles) {
    const wanted = sanitizeTitle(title)
    const test = tests.find((candidate) => sanitizeTitle(candidate.name) === wanted)
    if (test) tally(cell, test.status)
    else if (bailed) tally(cell, 'blocked')
    else {
      cell.listed++
      cell.notRun++
    }
  }
}

/** One proof's contribution to the cell; true when a hook failure taints the roll-up. */
function applyProof(cell: CellResult, proof: Proof, run: PlatformRun | undefined, titlesOf: SpecTitleLookup): boolean {
  const suites = matchSuites(proof, run)
  if (suites.length === 0) {
    const units = proof.tests?.length ?? 1
    cell.listed += units
    cell.notRun += units
    return false
  }
  const tests = suites.flatMap((suite) => suite.tests)
  const hookFailed = suites.some((suite) => suite.hookFailures.length)
  const bailed = hookFailed || tests.some((test) => test.status === 'fail')
  if (hookFailed && tests.length === 0) {
    // A hook that failed before any checkpoint ran is the failed unit.
    cell.listed++
    cell.failed++
  }
  if (proof.tests) tallyNamed(cell, proof.tests, tests, bailed)
  else {
    for (const test of tests) tally(cell, test.status)
    // Whole-file suites only: an orchestrator's describes share a file, so their remainder is unknowable.
    if (bailed && !proof.suite) {
      const blocked = unreportedTitles(proof.file, tests, titlesOf).length
      cell.listed += blocked
      cell.blocked += blocked
    }
  }
  return hookFailed
}

function evaluateAuto(row: CoverageRow, run: PlatformRun | undefined, titlesOf: SpecTitleLookup): CellResult {
  const cell = emptyCell('not-run')
  let hookFailed = false
  for (const proof of row.proof) hookFailed = applyProof(cell, proof, run, titlesOf) || hookFailed
  cell.status = rollUp(cell, hookFailed)
  return cell
}

export function evaluateRow(
  row: CoverageRow,
  platform: Platform,
  run: PlatformRun | undefined,
  titlesOf: SpecTitleLookup = noSpecTitles
): CellResult {
  const mode = row.platforms[platform]
  if (mode === 'auto') return evaluateAuto(row, run, titlesOf)
  const cell = emptyCell(mode === 'na' ? 'na' : 'manual')
  if (row.proof.length) {
    const auto = evaluateAuto(row, run, titlesOf)
    if (auto.status !== 'not-run') cell.auto = auto
  }
  return cell
}

export function evaluateSections(
  sections: CoverageSection[],
  results: RunResults,
  titlesOf: SpecTitleLookup = noSpecTitles
): EvaluatedSection[] {
  return sections.map((section) => ({
    section,
    rows: section.rows.map((row) => ({
      row,
      cells: {
        ios: evaluateRow(row, 'ios', results.ios, titlesOf),
        android: evaluateRow(row, 'android', results.android, titlesOf),
      },
    })),
  }))
}

/** Every failure in the run, mapped to a row or not — the brief lists them all. */
export function collectFailures(results: RunResults, titlesOf: SpecTitleLookup = noSpecTitles): FailureDetail[] {
  const failures: FailureDetail[] = []
  for (const run of Object.values(results)) {
    for (const suite of run.suites) {
      // Bail's unreported remainder lands on the failing checkpoint, or on the hook when nothing ran.
      const unreported = unreportedTitles(suite.file, suite.tests, titlesOf).length
      const failedTest = suite.tests.some((test) => test.status === 'fail')
      for (const hook of suite.hookFailures) {
        failures.push({ platform: suite.platform, file: suite.file, suite: suite.title, checkpoint: hook.title, message: hook.message, blockedAfter: failedTest ? 0 : unreported, kind: 'hook' })
      }
      suite.tests.forEach((test, index) => {
        if (test.status !== 'fail') return
        const blockedAfter = suite.tests.slice(index + 1).filter((later) => later.status === 'blocked').length + unreported
        failures.push({ platform: suite.platform, file: suite.file, suite: suite.title, checkpoint: test.name, message: test.message ?? 'failed', blockedAfter, kind: 'test' })
      })
    }
  }
  return failures
}

export function platformTotals(run: PlatformRun): PlatformTotals {
  const totals: PlatformTotals = { suites: run.suites.length, checkpoints: 0, passed: 0, failed: 0, blocked: 0, skipped: 0, timeSec: 0 }
  for (const suite of run.suites) {
    totals.timeSec += suite.timeSec
    totals.failed += suite.hookFailures.length
    for (const test of suite.tests) {
      totals.checkpoints++
      if (test.status === 'pass') totals.passed++
      else if (test.status === 'fail') totals.failed++
      else if (test.status === 'blocked') totals.blocked++
      else totals.skipped++
    }
  }
  return totals
}
