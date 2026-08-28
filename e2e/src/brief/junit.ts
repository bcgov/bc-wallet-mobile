import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { load } from 'cheerio'
import type { CheckpointStatus, Platform, ReportDir, RunResults, RunnerError, SuiteResult, TestResult } from './types.js'

/**
 * JUnit XML (as `@wdio/junit-reporter` writes it) → suite results.
 *
 * The reporter keys nothing by file on the testcase, so a suite is identified by its `file` property
 * (`file://./test/…`) plus the exact describe title in `suiteName`; `name` attributes carry titles with
 * every non-alphanumeric run collapsed to a space, so titles are compared after {@link sanitizeTitle}
 * on both sides. A `<skipped/>` after a `<failure>` in the same file is the mochaOpts.bail cascade,
 * reported as `blocked` so it cannot pass for "nothing to run".
 */

/** The reporter's `_prepareName`: split on non-alphanumerics (keeping `@`), rejoin with single spaces. */
export function sanitizeTitle(title: string): string {
  return title
    .split(/[^a-zA-Z0-9@]+/)
    .filter(Boolean)
    .join(' ')
}

/** `file://./test/x.ts` | `./test/x.ts` → `test/x.ts`. */
export function normalizeSpecPath(fileProp: string): string {
  return fileProp.replace(/^file:\/\//, '').replace(/^\.\//, '')
}

/** The `capabilities` property starts with the platform name (`android.2b291fdh2008n8`). */
export function platformFromCapabilities(caps: string | undefined): Platform | undefined {
  const head = (caps ?? '').split('.')[0].toLowerCase()
  return head === 'ios' || head === 'android' ? head : undefined
}

/** Fallback for suites with no capabilities: the artifact name (`e2e-reports-regression-iOS-18`). */
export function platformFromDirName(name: string): Platform | undefined {
  if (/(^|[-_])ios([-_]|$)/i.test(name)) return 'ios'
  if (/(^|[-_])android([-_]|$)/i.test(name)) return 'android'
  return undefined
}

/** Mocha hook titles, raw (`"before all" hook for "…"`) or as the reporter sanitizes them. */
const HOOK_TITLE = /^"?(before|after)( all| each)?"? hook/
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g
const MESSAGE_MAX = 300

function firstLine(text: string | undefined): string | undefined {
  const line = (text ?? '')
    .replace(ANSI, '')
    .split('\n')
    .map((part) => part.trim())
    .find(Boolean)
  return line ? line.slice(0, MESSAGE_MAX) : undefined
}

/** The per-command WebDriver log makes a 20-test file 200 KB; nothing in it is read. */
function stripCommandLog(xml: string): string {
  return xml.replace(/<system-out>[\s\S]*?<\/system-out>/g, '')
}

export interface ParsedJunit {
  suites: SuiteResult[]
  runnerErrors: RunnerError[]
}

export function parseJunitXml(xml: string, source: string, hint?: Platform): ParsedJunit {
  const $ = load(stripCommandLog(xml), { xml: true })
  const suites: SuiteResult[] = []
  const runnerErrors: RunnerError[] = []

  $('testsuite').each((_, suiteEl) => {
    const $suite = $(suiteEl)
    const props = new Map<string, string>()
    $suite
      .children('properties')
      .children('property')
      .each((_, propEl) => {
        props.set($(propEl).attr('name') ?? '', $(propEl).attr('value') ?? '')
      })

    const file = props.get('file')
    if (!file) {
      // No properties = no session: the reporter writes one nameless failure with the runner error.
      $suite.children('testcase').each((_, tcEl) => {
        const failure = $(tcEl).children('failure')
        if (failure.length) {
          runnerErrors.push({ platform: hint, message: firstLine(failure.attr('message')) ?? 'unknown runner error', source })
        }
      })
      return
    }

    const platform = platformFromCapabilities(props.get('capabilities')) ?? hint
    if (!platform) {
      console.error(`[brief] ${source}: cannot tell the platform of ${file} — skipped`)
      return
    }

    const tests: TestResult[] = []
    const hookFailures: SuiteResult['hookFailures'] = []
    let failedBefore = false
    $suite.children('testcase').each((_, tcEl) => {
      const $tc = $(tcEl)
      const name = $tc.attr('name') ?? ''
      const failure = $tc.children('failure')
      const message = failure.length
        ? (firstLine(failure.attr('message')) ?? firstLine($tc.children('system-err').text()) ?? 'failed')
        : undefined
      if (HOOK_TITLE.test(name)) {
        if (message) hookFailures.push({ title: name, message })
        return
      }
      let status: CheckpointStatus
      if (message) {
        status = 'fail'
        failedBefore = true
      } else if ($tc.children('skipped').length) {
        status = failedBefore ? 'blocked' : 'skipped'
      } else {
        status = 'pass'
      }
      tests.push({ name, status, message, timeSec: Number($tc.attr('time')) || 0 })
    })

    suites.push({
      platform,
      file: normalizeSpecPath(file),
      title: props.get('suiteName') ?? $suite.attr('name') ?? '',
      timestamp: $suite.attr('timestamp') ?? '',
      timeSec: Number($suite.attr('time')) || 0,
      tests,
      hookFailures,
      source,
    })
  })

  return { suites, runnerErrors }
}

export interface LoadedJunit {
  results: RunResults
  runnerErrors: RunnerError[]
}

/**
 * Read every `junit/*.xml` under the report dirs. The same suite can appear twice (a retried spec, or
 * two artifacts of one platform): the latest `timestamp` wins.
 */
export function loadJunitReports(reportDirs: ReportDir[]): LoadedJunit {
  const latest = new Map<string, SuiteResult>()
  const runnerErrors: RunnerError[] = []
  const sources = new Map<Platform, Set<string>>()

  for (const dir of reportDirs) {
    const junitDir = join(dir.path, 'junit')
    if (!existsSync(junitDir)) continue
    const hint = platformFromDirName(dir.name)
    for (const entry of readdirSync(junitDir).filter((name) => name.endsWith('.xml')).sort()) {
      const parsed = parseJunitXml(readFileSync(join(junitDir, entry), 'utf8'), dir.name, hint)
      runnerErrors.push(...parsed.runnerErrors)
      for (const suite of parsed.suites) {
        const key = `${suite.platform}|${suite.file}|${sanitizeTitle(suite.title)}`
        const seen = latest.get(key)
        if (!seen || suite.timestamp >= seen.timestamp) latest.set(key, suite)
        if (!sources.has(suite.platform)) sources.set(suite.platform, new Set())
        sources.get(suite.platform)?.add(dir.name)
      }
    }
  }

  const results: RunResults = {}
  for (const suite of latest.values()) {
    const run = results[suite.platform] ?? { platform: suite.platform, suites: [], sources: [] }
    run.suites.push(suite)
    results[suite.platform] = run
  }
  for (const [platform, names] of sources) {
    const run = results[platform]
    if (run) run.sources = [...names].sort()
  }
  return { results, runnerErrors }
}
