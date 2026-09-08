import type { CoverageRow, CoverageSection, Proof } from './coverage-map.js'
import { sanitizeTitle } from './junit.js'
import type { CellStatus, CheckpointStatus, Platform, PlatformRun, RunResults, SuiteResult } from './types.js'

/**
 * Coverage rows × platforms → cells. A row's automated status is the roll-up of its proving
 * checkpoints: any fail → fail, else any blocked → blocked, else any pass → pass, else any skipped →
 * skipped, else not run. Rows proved by hand (or not applicable) keep that verdict, but carry the
 * automated evidence alongside when there is some.
 */

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

/** Tally the listed titles by name; a title with no result counts as not run. */
function tallyNamed(cell: CellResult, titles: string[], tests: SuiteResult['tests']): void {
  for (const title of titles) {
    const wanted = sanitizeTitle(title)
    const test = tests.find((candidate) => sanitizeTitle(candidate.name) === wanted)
    if (test) tally(cell, test.status)
    else {
      cell.listed++
      cell.notRun++
    }
  }
}

/** One proof's contribution to the cell; true when a hook failure taints the roll-up. */
function applyProof(cell: CellResult, proof: Proof, run: PlatformRun | undefined): boolean {
  const suites = matchSuites(proof, run)
  if (suites.length === 0) {
    const units = proof.tests?.length ?? 1
    cell.listed += units
    cell.notRun += units
    return false
  }
  const tests = suites.flatMap((suite) => suite.tests)
  const hookFailed = suites.some((suite) => suite.hookFailures.length)
  if (hookFailed && tests.length === 0) {
    // A hook that failed before any checkpoint ran is the failed unit.
    cell.listed++
    cell.failed++
  }
  if (proof.tests) tallyNamed(cell, proof.tests, tests)
  else for (const test of tests) tally(cell, test.status)
  return hookFailed
}

function evaluateAuto(row: CoverageRow, run: PlatformRun | undefined): CellResult {
  const cell = emptyCell('not-run')
  let hookFailed = false
  for (const proof of row.proof) hookFailed = applyProof(cell, proof, run) || hookFailed
  cell.status = rollUp(cell, hookFailed)
  return cell
}

export function evaluateRow(row: CoverageRow, platform: Platform, run: PlatformRun | undefined): CellResult {
  const mode = row.platforms[platform]
  if (mode === 'auto') return evaluateAuto(row, run)
  const cell = emptyCell(mode === 'na' ? 'na' : 'manual')
  if (row.proof.length) {
    const auto = evaluateAuto(row, run)
    if (auto.status !== 'not-run') cell.auto = auto
  }
  return cell
}

export function evaluateSections(sections: CoverageSection[], results: RunResults): EvaluatedSection[] {
  return sections.map((section) => ({
    section,
    rows: section.rows.map((row) => ({
      row,
      cells: {
        ios: evaluateRow(row, 'ios', results.ios),
        android: evaluateRow(row, 'android', results.android),
      },
    })),
  }))
}

/** Every failure in the run, mapped to a row or not — the brief lists them all. */
export function collectFailures(results: RunResults): FailureDetail[] {
  const failures: FailureDetail[] = []
  for (const run of Object.values(results)) {
    for (const suite of run.suites) {
      for (const hook of suite.hookFailures) {
        failures.push({ platform: suite.platform, file: suite.file, suite: suite.title, checkpoint: hook.title, message: hook.message, blockedAfter: 0, kind: 'hook' })
      }
      suite.tests.forEach((test, index) => {
        if (test.status !== 'fail') return
        const blockedAfter = suite.tests.slice(index + 1).filter((later) => later.status === 'blocked').length
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
