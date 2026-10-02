import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Frameworks } from '@wdio/types'

/**
 * One JSON record per WebDriver session under `reports/sessions/`, written by the config hooks as the
 * journey runs: the spec, the device, the Sauce job and every checkpoint's outcome. The JUnit reporter
 * writes only when the worker ends, so a session Sauce terminates mid-journey (a hung app) leaves a
 * 0-byte XML and vanishes from the brief; this record is what the brief rebuilds that journey from,
 * and what links every journey to its Sauce job. Each retry is a new session, so a record is one attempt.
 */
export interface SessionTestRecord {
  suite: string
  title: string
  status: 'pass' | 'fail' | 'skipped'
  message?: string
}

export interface SessionRecord {
  /** The wdio worker id (`0-12`); a retry reuses it. */
  cid: string
  /** Spec paths relative to e2e/. */
  specs: string[]
  sessionId?: string
  /** The capabilities that identify the device and the Sauce job (`testobject_test_report_url`). */
  capabilities: Record<string, string>
  startedAt: string
  endedAt?: string
  failures?: number
  /** The error that reported the session gone — Sauce terminated it mid-journey. */
  lost?: string
  tests: SessionTestRecord[]
}

const E2E_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SESSIONS_DIR = join(E2E_ROOT, 'reports', 'sessions')
const RECORDED_CAPABILITIES = [
  'platformName',
  'platformVersion',
  'appium:platformVersion',
  'deviceName',
  'appium:deviceName',
  'testobject_device_name',
  'testobject_test_report_url',
  'testobject_device_session_id',
]
const LOST_SESSION = /session is either terminated or not started|invalid session id|did not receive any response/i
const MESSAGE_MAX = 300

let current: { path: string; record: SessionRecord } | undefined

const specPath = (spec: string): string => relative(E2E_ROOT, spec.startsWith('file://') ? fileURLToPath(spec) : spec)

function save(): void {
  if (!current) return
  try {
    writeFileSync(current.path, JSON.stringify(current.record, null, 2))
  } catch (err) {
    console.warn('[session-record] write failed (continuing):', err)
  }
}

/** Call once the session is up (the `before` hook): the file exists from here on, whatever happens next. */
export function recordSessionStart(capabilities: Record<string, unknown>, specs: string[], sessionId?: string): void {
  const cid = process.env.WDIO_WORKER_ID ?? 'local'
  const startedAt = new Date().toISOString()
  const picked: Record<string, string> = {}
  for (const key of RECORDED_CAPABILITIES) {
    const value = capabilities[key]
    if (typeof value === 'string' || typeof value === 'number') picked[key] = String(value)
  }
  try {
    mkdirSync(SESSIONS_DIR, { recursive: true })
  } catch (err) {
    console.warn('[session-record] cannot create the sessions dir (continuing):', err)
  }
  current = {
    path: join(SESSIONS_DIR, `${cid}-${startedAt.replace(/[:.]/g, '-')}.json`),
    record: { cid, specs: specs.map(specPath), sessionId, capabilities: picked, startedAt, tests: [] },
  }
  save()
}

type HookTestResult = Frameworks.TestResult & { skipped?: boolean }

const statusOf = (result: HookTestResult): SessionTestRecord['status'] => {
  if (result.skipped) return 'skipped'
  return result.passed ? 'pass' : 'fail'
}

/** The `afterTest` hook: one line per checkpoint, and the first error that says the session is gone. */
export function recordTestResult(test: { parent?: string; title: string }, result: HookTestResult): void {
  if (!current) return
  const error = result.error?.message ?? (result.error ? String(result.error) : undefined)
  const status = statusOf(result)
  const message = status === 'fail' ? (error ?? 'failed').split('\n')[0].trim().slice(0, MESSAGE_MAX) : undefined
  current.record.tests.push({ suite: test.parent ?? '', title: test.title, status, ...(message && { message }) })
  if (status === 'fail' && error && LOST_SESSION.test(error) && !current.record.lost) current.record.lost = message
  save()
}

/** The `after` hook: runs before the runner deletes the session, so it lands even for a terminated one. */
export function recordSessionEnd(failures: number): void {
  if (!current) return
  current.record.endedAt = new Date().toISOString()
  current.record.failures = failures
  save()
}
