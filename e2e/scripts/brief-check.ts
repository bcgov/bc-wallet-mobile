/**
 * Keep the coverage map honest, then prove the brief's rules on fixture reports.
 *
 * Map checks: unique row ids; every proof file (and source) exists; every `suite` is a describe in its
 * sources; every listed `it` title is in its file verbatim (a renamed checkpoint fails here instead of
 * quietly rendering as "not run"); no two titles in a file collide once the JUnit reporter sanitizes
 * them; every journey/spec under test/bcsc is mapped in OTHER_COVERAGE.
 *
 * Self-test: `scripts/fixtures/brief/` holds hand-written reports covering the bail cascade, runtime
 * skips, a retried suite, a failed before() hook, a worker with no session, the migration
 * orchestrator's shared file and the a11y baseline — each asserted below.
 *
 *   yarn brief:check        exit 1 on any problem, listed on stderr
 */
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBrief, resolveReportDirs } from '../src/brief/build.js'
import { OTHER_COVERAGE, UAT_CHECKLIST, type CoverageRow } from '../src/brief/coverage-map.js'
import type { CellResult } from '../src/brief/evaluate.js'
import { sanitizeTitle } from '../src/brief/junit.js'
import { renderMarkdown, type BriefModel } from '../src/brief/render.js'
import type { Platform } from '../src/brief/types.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const E2E_ROOT = resolve(SCRIPT_DIR, '..')
const FIXTURES = join(SCRIPT_DIR, 'fixtures', 'brief')

const errors: string[] = []
const fail = (message: string): void => {
  errors.push(message)
}

// --- the map ----------------------------------------------------------------------------------------

/** `it('…')` / `describe("…")` titles in a spec, with the quote escapes undone. */
function titlesIn(source: string): { its: Set<string>; describes: Set<string> } {
  const its = new Set<string>()
  const describes = new Set<string>()
  const pattern = /\b(it|describe)(?:\.(?:skip|only))?\(\s*(['"`])((?:\\[\s\S]|(?!\2)[^\\])*)\2/g
  for (const match of source.matchAll(pattern)) {
    const title = match[3].replace(/\\(['"`\\])/g, '$1')
    ;(match[1] === 'it' ? its : describes).add(title)
  }
  return { its, describes }
}

const specCache = new Map<string, ReturnType<typeof titlesIn>>()
function spec(file: string): ReturnType<typeof titlesIn> | undefined {
  const path = join(E2E_ROOT, file)
  if (!existsSync(path)) return undefined
  if (!specCache.has(file)) specCache.set(file, titlesIn(readFileSync(path, 'utf8')))
  return specCache.get(file)
}

function checkRow(row: CoverageRow, seenIds: Set<string>): void {
  if (seenIds.has(row.id)) fail(`duplicate row id "${row.id}"`)
  seenIds.add(row.id)
  for (const proof of row.proof) {
    const files = proof.sources ?? [proof.file]
    for (const file of [proof.file, ...(proof.sources ?? [])]) {
      if (!existsSync(join(E2E_ROOT, file))) fail(`${row.id}: ${file} does not exist`)
    }
    const parsed = files.map(spec).filter((entry): entry is ReturnType<typeof titlesIn> => entry !== undefined)
    if (proof.suite && !parsed.some((entry) => entry.describes.has(proof.suite as string))) {
      fail(`${row.id}: no describe('${proof.suite}') in ${files.join(', ')}`)
    }
    for (const title of proof.tests ?? []) {
      if (!parsed.some((entry) => entry.its.has(title))) fail(`${row.id}: no it('${title}') in ${files.join(', ')}`)
    }
  }
}

function checkCollisions(): void {
  for (const [file, parsed] of specCache) {
    const seen = new Map<string, string>()
    for (const title of parsed.its) {
      const key = sanitizeTitle(title)
      const other = seen.get(key)
      if (other && other !== title) fail(`${file}: "${title}" and "${other}" are the same title once sanitized`)
      seen.set(key, title)
    }
  }
}

function checkUnmapped(): void {
  const mapped = new Set<string>()
  for (const section of OTHER_COVERAGE) {
    for (const row of section.rows) {
      for (const proof of row.proof) {
        mapped.add(proof.file)
        for (const source of proof.sources ?? []) mapped.add(source)
      }
    }
  }
  const root = join(E2E_ROOT, 'test', 'bcsc')
  const specs = readdirSync(root, { recursive: true })
    .map(String)
    .filter((entry) => /\.(journey|spec)\.ts$/.test(entry))
    .map((entry) => `test/bcsc/${entry}`)
    .sort()
  for (const file of specs) {
    if (!mapped.has(file)) fail(`${file} is not in OTHER_COVERAGE — add a row so the brief shows it`)
  }
}

const seenIds = new Set<string>()
for (const section of [...UAT_CHECKLIST, ...OTHER_COVERAGE]) {
  for (const row of section.rows) checkRow(row, seenIds)
}
checkCollisions()
checkUnmapped()

// --- the rules, on fixtures ---------------------------------------------------------------------------

function cellOf(model: BriefModel, id: string, platform: Platform): CellResult {
  for (const section of [...model.uat, ...model.other]) {
    const found = section.rows.find((entry) => entry.row.id === id)
    if (found) return found.cells[platform]
  }
  throw new Error(`no row ${id}`)
}

function selfTest(): void {
  const reportDirs = resolveReportDirs([FIXTURES])
  assert.equal(reportDirs.length, 3, 'three fixture report dirs')
  const model = buildBrief({
    reportDirs,
    baselinePath: join(FIXTURES, 'a11y-baseline.json'),
    title: 'fixture',
    lanes: [{ name: 'regression', result: 'success' }, { name: 'upgrade', result: 'success' }],
    now: new Date('2026-08-28T07:00:00Z'),
  })

  // bail cascade: the failing checkpoint fails its row, the checkpoints behind it are blocked
  assert.equal(cellOf(model, 'feat-change-pin', 'ios').status, 'fail')
  assert.equal(cellOf(model, 'feat-remove-account', 'ios').status, 'blocked')
  assert.equal(cellOf(model, 'feat-info-links', 'ios').status, 'pass')
  assert.equal(cellOf(model, 'nav-main', 'ios').status, 'fail')
  // runtime skips stay skips; a listed checkpoint whose suite is absent is not-run
  const scanQr = cellOf(model, 'feat-scan-qr', 'ios')
  assert.deepEqual([scanQr.status, scanQr.passed, scanQr.skipped, scanQr.notRun], ['pass', 1, 3, 1])
  // whole-suite proofs: one suite present, two absent
  const verify = cellOf(model, 'nav-verify', 'ios')
  assert.deepEqual([verify.status, verify.passed, verify.listed, verify.notRun], ['pass', 5, 7, 2])
  // retry dedupe: the later run of the same suite wins
  const auth = cellOf(model, 'nav-auth', 'ios')
  assert.deepEqual([auth.status, auth.passed, auth.failed], ['pass', 8, 0])
  // platform modes
  const rerouteIos = cellOf(model, 'non-bcsc-reroute-first-id', 'ios')
  assert.deepEqual([rerouteIos.status, rerouteIos.auto], ['na', undefined])
  const rerouteAndroid = cellOf(model, 'non-bcsc-reroute-first-id', 'android')
  assert.deepEqual([rerouteAndroid.status, rerouteAndroid.passed, rerouteAndroid.listed], ['pass', 2, 4])
  const videoCall = cellOf(model, 'photo-video-call', 'ios')
  assert.deepEqual([videoCall.status, videoCall.auto], ['manual', undefined])
  // a failed before() hook fails the row
  const wallet = cellOf(model, 'nav-wallet', 'android')
  assert.deepEqual([wallet.status, wallet.failed, wallet.listed], ['fail', 1, 1])
  // the migration orchestrator reports three suites under one file
  const migration = cellOf(model, 'ext-migration-v3', 'android')
  assert.deepEqual([migration.status, migration.passed, migration.listed], ['pass', 6, 6])
  assert.equal(cellOf(model, 'j-migration-upgrade', 'android').status, 'pass')
  // a worker that never got a session
  assert.equal(model.runnerErrors.length, 1)
  assert.equal(model.runnerErrors[0].platform, 'android')
  // failures carry the blocked count and hook failures are named as such
  const settingsFailure = model.failures.find((entry) => entry.file.endsWith('settings.journey.ts'))
  assert.equal(settingsFailure?.blockedAfter, 6)
  assert.equal(model.failures.find((entry) => entry.kind === 'hook')?.suite, 'Wallet journey: DIDComm credential lifecycle')
  // lanes: upgrade produced no reports
  assert.deepEqual(model.lanes.map((lane) => lane.hasReports), [true, false])
  // a11y: known vs NEW against the baseline
  const ios = model.a11y.find((summary) => summary.platform === 'ios')
  assert.equal(ios?.errorScreens.length, 2)
  const changePin = ios?.errorScreens.find((screen) => screen.screen === 'ChangePIN')
  assert.deepEqual([changePin?.newErrors, changePin?.inBaseline], [0, true])
  const birthdate = ios?.errorScreens.find((screen) => screen.screen === 'EnterBirthdate')
  assert.deepEqual([birthdate?.newErrors, birthdate?.inBaseline, birthdate?.warnings], [1, false, 1])

  const markdown = renderMarkdown(model)
  for (const heading of ['### UAT checklist', '### Failures (2)', '### Accessibility', '### Legend']) {
    assert.ok(markdown.includes(heading), `markdown has ${heading}`)
  }
}

try {
  selfTest()
} catch (err) {
  fail(`fixture self-test: ${(err as Error).message}`)
}

if (errors.length) {
  for (const message of errors) console.error(`[brief:check] ${message}`)
  console.error(`[brief:check] ${errors.length} problem(s)`)
  process.exit(1)
}
console.error('[brief:check] coverage map and fixture self-test OK')
