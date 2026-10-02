import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SessionRecord, SessionTestRecord } from '../helpers/session-record.js'
import { normalizeSpecPath, platformFromDirName } from './junit.js'
import { specTitles } from './spec-titles.js'
import type { Platform, ReportDir, RunResults, SuiteResult, TestResult } from './types.js'

/**
 * Session records (`sessions/*.json`, see helpers/session-record.ts) → attempts per journey. They carry
 * the Sauce job behind every journey, every retry the JUnit files overwrote, and — for a session Sauce
 * terminated, which leaves a 0-byte JUnit — enough to rebuild the journey's checkpoints.
 */

export type AttemptOutcome = 'pass' | 'fail' | 'lost'

export interface SessionAttempt {
  platform: Platform
  /** Spec path relative to e2e/. */
  file: string
  cid: string
  /** The report dir the record came from. */
  source: string
  startedAt: string
  endedAt?: string
  outcome: AttemptOutcome
  jobUrl?: string
  device?: string
  /** The error that reported the session gone, for a lost attempt. */
  lost?: string
  tests: SessionTestRecord[]
}

/** Every attempt of one journey in one report dir, oldest first. */
export interface SessionGroup {
  platform: Platform
  file: string
  source: string
  attempts: SessionAttempt[]
}

const platformOf = (name: string | undefined): Platform | undefined => {
  const head = (name ?? '').toLowerCase()
  return head === 'ios' || head === 'android' ? head : undefined
}

// On Sauce real devices `deviceName` comes back as the hardware serial; the readable name is Sauce's.
const deviceOf = (caps: Record<string, string>): string | undefined => {
  const name = caps.testobject_device_name ?? caps['appium:deviceName'] ?? caps.deviceName
  const version = caps['appium:platformVersion'] ?? caps.platformVersion
  return name ? [name, version].filter(Boolean).join(' ') : undefined
}

const failedTest = (test: SessionTestRecord): boolean => test.status === 'fail'

function outcomeOf(record: SessionRecord): AttemptOutcome {
  if (record.lost || !record.endedAt) return 'lost'
  return (record.failures ?? 0) > 0 || record.tests.some(failedTest) ? 'fail' : 'pass'
}

export function loadSessions(reportDirs: ReportDir[]): SessionAttempt[] {
  const attempts: SessionAttempt[] = []
  for (const dir of reportDirs) {
    const sessionsDir = join(dir.path, 'sessions')
    if (!existsSync(sessionsDir)) continue
    for (const entry of readdirSync(sessionsDir).filter((name) => name.endsWith('.json')).sort((a, b) => a.localeCompare(b))) {
      let record: SessionRecord
      try {
        record = JSON.parse(readFileSync(join(sessionsDir, entry), 'utf8')) as SessionRecord
      } catch {
        console.error(`[brief] ${dir.name}/sessions/${entry}: not a session record — skipped`)
        continue
      }
      const caps = record.capabilities ?? {}
      const platform = platformOf(caps.platformName) ?? platformFromDirName(dir.name)
      if (!platform || !record.specs?.length) continue
      for (const spec of record.specs) {
        attempts.push({
          platform,
          file: normalizeSpecPath(spec),
          cid: record.cid,
          source: dir.name,
          startedAt: record.startedAt,
          endedAt: record.endedAt,
          outcome: outcomeOf(record),
          jobUrl: caps.testobject_test_report_url,
          device: deviceOf(caps),
          lost: record.lost,
          tests: record.tests ?? [],
        })
      }
    }
  }
  return attempts
}

export function groupAttempts(attempts: SessionAttempt[]): SessionGroup[] {
  const groups = new Map<string, SessionGroup>()
  for (const attempt of attempts) {
    const key = `${attempt.platform}|${attempt.file}|${attempt.source}`
    const group = groups.get(key) ?? { platform: attempt.platform, file: attempt.file, source: attempt.source, attempts: [] }
    group.attempts.push(attempt)
    groups.set(key, group)
  }
  const byStart = (a: SessionAttempt, b: SessionAttempt) => a.startedAt.localeCompare(b.startedAt)
  return [...groups.values()]
    .map((group) => ({ ...group, attempts: [...group.attempts].sort(byStart) }))
    .sort((a, b) => a.source.localeCompare(b.source) || a.file.localeCompare(b.file))
}

/**
 * The suites an attempt's record describes, for a journey whose JUnit never arrived. Checkpoints are
 * the recorded ones (bail stopped the rest, which the evaluator counts as blocked from the spec); a
 * lost session with no failing checkpoint — it died between two, or in a hook — is a hook failure so
 * the row still fails.
 */
export function suitesFromAttempt(attempt: SessionAttempt): SuiteResult[] {
  const bySuite = new Map<string, TestResult[]>()
  for (const test of attempt.tests) {
    const tests = bySuite.get(test.suite) ?? []
    tests.push({ name: test.title, status: test.status === 'skipped' ? 'skipped' : test.status, message: test.message, timeSec: 0 })
    bySuite.set(test.suite, tests)
  }
  if (!bySuite.size) bySuite.set(specTitles(attempt.file)?.describes[0] ?? '', [])
  const terminated = attempt.outcome === 'lost'
  const suites = [...bySuite].map(
    ([title, tests]): SuiteResult => ({
      platform: attempt.platform,
      file: attempt.file,
      title,
      timestamp: attempt.startedAt.slice(0, 19),
      timeSec: 0,
      tests,
      hookFailures: [],
      source: attempt.source,
      jobUrl: attempt.jobUrl,
      device: attempt.device,
      terminated,
    })
  )
  if (terminated && !attempt.tests.some(failedTest)) {
    suites.at(-1)?.hookFailures.push({
      title: '"session" hook',
      message: `Session terminated mid-journey: ${attempt.lost ?? 'no checkpoint result reached the reporter'}`,
    })
  }
  return suites
}

/**
 * Fold the session records into the JUnit results: a journey whose JUnit is missing (the worker's
 * session was terminated, so the reporter wrote nothing) is rebuilt from its last attempt, and every
 * suite learns the Sauce job and device of the attempt that produced it.
 */
export function applySessions(results: RunResults, groups: SessionGroup[]): void {
  for (const group of groups) {
    const last = group.attempts.at(-1)
    if (!last) continue // never empty (see groupAttempts); narrows .at()'s type
    const run = results[group.platform] ?? { platform: group.platform, suites: [], sources: [] }
    const own = run.suites.filter((suite) => suite.file === group.file && suite.source === group.source)
    if (!own.length) {
      const rebuilt = suitesFromAttempt(last)
      run.suites.push(...rebuilt)
      own.push(...rebuilt)
      if (!run.sources.includes(group.source)) run.sources = [...run.sources, group.source].sort((a, b) => a.localeCompare(b))
      results[group.platform] = run
    }
    for (const suite of own) {
      suite.jobUrl ??= last.jobUrl
      suite.device ??= last.device
    }
  }
}

/** `e2e-reports-regression-iOS-18` → `regression`; anything else as is. */
export function laneOf(source: string): string {
  return /^e2e-reports-(.+)-(ios|android)-/i.exec(source)?.[1] ?? source
}
