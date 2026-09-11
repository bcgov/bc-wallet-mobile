/**
 * Keep the coverage map honest, then prove the brief's rules on fixture reports.
 *
 * Map checks: unique row ids; every proof file (and source) exists; every `suite` is a describe in its
 * sources; every listed `it` title is in its file verbatim (a renamed checkpoint fails here instead of
 * quietly rendering as "not run"); no two titles in a file collide once the JUnit reporter sanitizes
 * them; every journey/spec under test/bcsc is mapped in OTHER_COVERAGE (bar the PR-gate smoke spec).
 *
 * Self-test: `scripts/fixtures/brief/` holds hand-written reports covering the bail cascade (reported
 * and unreported), runtime skips (and the reporter's doubled skip), a retried suite, a failed before()
 * hook, a worker with no session, the migration orchestrator's shared file and the a11y baseline — each
 * asserted below.
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
import { parseJunitXml, sanitizeTitle } from '../src/brief/junit.js'
import { renderMarkdown, type BriefModel } from '../src/brief/render.js'
import { type SpecTitles, specTitles } from '../src/brief/spec-titles.js'
import type { Platform } from '../src/brief/types.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const E2E_ROOT = resolve(SCRIPT_DIR, '..')
const FIXTURES = join(SCRIPT_DIR, 'fixtures', 'brief')

const errors: string[] = []
const fail = (message: string): void => {
  errors.push(message)
}

// --- the map ----------------------------------------------------------------------------------------

/** Specs the PR gate runs and the nightly never schedules — a row would only ever read "not run". */
const NOT_IN_NIGHTLY = new Set(['test/bcsc/smoke.spec.ts'])

/** Every spec the map names, for the collision check. */
const mappedFiles = new Set<string>()

function checkRow(row: CoverageRow, seenIds: Set<string>): void {
  if (seenIds.has(row.id)) fail(`duplicate row id "${row.id}"`)
  seenIds.add(row.id)
  for (const proof of row.proof) {
    const files = proof.sources ?? [proof.file]
    for (const file of [proof.file, ...(proof.sources ?? [])]) {
      if (!existsSync(join(E2E_ROOT, file))) fail(`${row.id}: ${file} does not exist`)
      mappedFiles.add(file)
    }
    const parsed = files.map(specTitles).filter((entry): entry is SpecTitles => entry !== undefined)
    if (proof.suite && !parsed.some((entry) => entry.describes.includes(proof.suite as string))) {
      fail(`${row.id}: no describe('${proof.suite}') in ${files.join(', ')}`)
    }
    for (const title of proof.tests ?? []) {
      if (!parsed.some((entry) => entry.its.includes(title))) fail(`${row.id}: no it('${title}') in ${files.join(', ')}`)
    }
  }
}

function checkCollisions(): void {
  for (const file of mappedFiles) {
    const seen = new Map<string, string>()
    for (const title of specTitles(file)?.its ?? []) {
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
    if (!mapped.has(file) && !NOT_IN_NIGHTLY.has(file)) fail(`${file} is not in OTHER_COVERAGE — add a row so the brief shows it`)
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
  // a failed before() hook fails the row; nothing ran, so every checkpoint in the file is blocked
  const walletTitles = specTitles('test/bcsc/main/wallet.journey.ts')?.its ?? []
  const wallet = cellOf(model, 'nav-wallet', 'android')
  assert.deepEqual([wallet.status, wallet.failed, wallet.blocked, wallet.listed], ['fail', 1, walletTitles.length, walletTitles.length + 1])
  // a file that bailed: the reporter wrote nothing for the checkpoints behind the failure — blocked, not "not run"
  const photoTitles = specTitles('test/bcsc/verify/verified-photo.journey.ts')?.its ?? []
  const verifiedPhoto = cellOf(model, 'j-verified-photo', 'android')
  assert.deepEqual(
    [verifiedPhoto.status, verifiedPhoto.passed, verifiedPhoto.failed, verifiedPhoto.blocked, verifiedPhoto.listed],
    ['fail', 2, 1, photoTitles.length - 3, photoTitles.length]
  )
  const photoInPerson = cellOf(model, 'photo-in-person', 'android')
  assert.deepEqual([photoInPerson.status, photoInPerson.blocked, photoInPerson.notRun], ['blocked', 1, 0])
  assert.equal(model.failures.find((entry) => entry.file.endsWith('verified-photo.journey.ts'))?.blockedAfter, photoTitles.length - 3)
  // the reporter writes a runtime skip twice; the brief counts it once
  const unverified = cellOf(model, 'j-unverified-main', 'ios')
  assert.deepEqual([unverified.listed, unverified.skipped], [7, 3])
  // the migration orchestrator reports three suites under one file
  const migration = cellOf(model, 'ext-migration-v3', 'android')
  assert.deepEqual([migration.status, migration.passed, migration.listed], ['pass', 6, 6])
  assert.equal(cellOf(model, 'j-migration-upgrade', 'android').status, 'pass')
  // a worker that never got a session
  assert.equal(model.runnerErrors.length, 1)
  assert.equal(model.runnerErrors[0].platform, 'android')
  // failures carry the blocked count (reported skips + the unreported remainder) and hook failures are named as such
  const settingsReport = parseJunitXml(readFileSync(join(FIXTURES, 'e2e-reports-regression-iOS-18', 'junit', 'wdio-3-0.xml'), 'utf8'), 'fixture')
  const settingsReported = new Set(settingsReport.suites.flatMap((suite) => suite.tests.map((test) => sanitizeTitle(test.name))))
  const settingsUnreported = (specTitles('test/bcsc/main/settings.journey.ts')?.its ?? []).filter((title) => !settingsReported.has(sanitizeTitle(title)))
  const settingsFailure = model.failures.find((entry) => entry.file.endsWith('settings.journey.ts'))
  assert.equal(settingsFailure?.blockedAfter, 6 + settingsUnreported.length)
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
  for (const heading of ['### UAT checklist', '### Failures (3)', '### Accessibility', '### Legend']) {
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
