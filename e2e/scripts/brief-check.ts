/**
 * Keep the coverage map and the upgrade matrix honest, then prove the brief's rules on fixture reports.
 *
 * Map checks: unique row ids; every proof file (and source) exists; every `suite` is a describe in its
 * sources; every listed `it` title is in its file verbatim (a renamed checkpoint fails here instead of
 * quietly rendering as "not run"); no two titles in a file collide once the JUnit reporter sanitizes
 * them; every journey/spec under test/bcsc is mapped in OTHER_COVERAGE or the upgrade matrix (bar the
 * PR-gate smoke spec). Matrix checks: every path has a spec or a reason per lineage, and every state
 * has a spec on every lineage (an empty suite would fail the weekly job); the manifest parses.
 *
 * Self-test: `scripts/fixtures/brief/` holds hand-written nightly reports covering the bail cascade
 * (reported and unreported), runtime skips (and the reporter's doubled skip), a retried suite, a failed
 * before() hook, a worker with no session, a session Sauce terminated (0-byte JUnit + session records,
 * one that died in a hook so its record never noticed) and the a11y baseline. `scripts/fixtures/
 * brief-upgrade/` holds weekly upgrade artifacts: one wrapper reporting under two versions on one
 * platform, a bail inside a scenario, the booted build read from the session record, and manifest
 * versions with no reports — each asserted below.
 *
 *   yarn brief:check        exit 1 on any problem, listed on stderr
 */
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { diffScreen, loadA11yReports } from '../src/brief/a11y-summary.js'
import { buildBrief, resolveReportDirs } from '../src/brief/build.js'
import { OTHER_COVERAGE, UAT_CHECKLIST, type CoverageRow } from '../src/brief/coverage-map.js'
import type { CellResult } from '../src/brief/evaluate.js'
import { parseJunitXml, sanitizeTitle } from '../src/brief/junit.js'
import { renderMarkdown, type BriefModel } from '../src/brief/render.js'
import { type SpecTitles, specTitles } from '../src/brief/spec-titles.js'
import type { Platform } from '../src/brief/types.js'
import { allUpgradeProofs, LINEAGES, upgradeSections } from '../src/brief/upgrade-map.js'
import { loadUpgradeSources, MANIFEST_FILE } from '../src/flows/prev-build/sources.js'
import { UPGRADE_PATHS, UPGRADE_STATES, upgradeSpecsFor, type UpgradePath } from '../src/upgrade-matrix.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const E2E_ROOT = resolve(SCRIPT_DIR, '..')
const FIXTURES = join(SCRIPT_DIR, 'fixtures', 'brief')
const UPGRADE_FIXTURES = join(SCRIPT_DIR, 'fixtures', 'brief-upgrade')

const errors: string[] = []
const fail = (message: string): void => {
  errors.push(message)
}

// --- the maps ---------------------------------------------------------------------------------------

/** Specs the PR gate runs and no scheduled run schedules — a row would only ever read "not run". */
const NOT_SCHEDULED = new Set(['test/bcsc/smoke.spec.ts'])

/** Every spec the maps name, for the collision check. */
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

/** One matrix path: a unique id, a known state, a spec or a reason (never both) per lineage, one wrapper per scenario. */
function checkUpgradePath(path: UpgradePath, ids: Set<string>): void {
  if (ids.has(path.id)) fail(`upgrade matrix: duplicate path id "${path.id}"`)
  ids.add(path.id)
  if (!UPGRADE_STATES.some((state) => state.id === path.state)) fail(`upgrade matrix: ${path.id} names an unknown state "${path.state}"`)
  for (const lineage of LINEAGES) {
    const spec = path.spec[lineage]
    const reason = path.unsupported?.[lineage]
    if (!spec && !reason) fail(`upgrade matrix: ${path.id} has neither a spec nor an "unsupported" reason for the ${lineage} lineage`)
    if (spec && reason) fail(`upgrade matrix: ${path.id} has both a spec and an "unsupported" reason for the ${lineage} lineage`)
  }
  if (path.scenario) {
    const wrappers = new Set(Object.values(path.spec))
    if (wrappers.size !== 1) fail(`upgrade matrix: ${path.id} shares scenario ${path.scenario} across ${[...wrappers].join(', ')} — one wrapper per scenario`)
  }
}

/** The matrix is consistent with itself and the manifest parses — before any brief reads either. */
function checkUpgradeMatrix(): void {
  const ids = new Set<string>()
  for (const path of UPGRADE_PATHS) checkUpgradePath(path, ids)
  for (const state of UPGRADE_STATES) {
    for (const lineage of LINEAGES) {
      if (!upgradeSpecsFor(state.id, lineage).length) fail(`upgrade matrix: the ${state.suite} suite has no spec for the ${lineage} lineage — the weekly job would run an empty suite`)
    }
  }
  try {
    const sources = loadUpgradeSources()
    if (!sources.length) fail(`${MANIFEST_FILE}: no sources`)
  } catch (err) {
    fail((err as Error).message)
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
  const proofs = [...OTHER_COVERAGE.flatMap((section) => section.rows.flatMap((row) => row.proof)), ...allUpgradeProofs()]
  for (const proof of proofs) {
    mapped.add(proof.file)
    for (const source of proof.sources ?? []) mapped.add(source)
  }
  const root = join(E2E_ROOT, 'test', 'bcsc')
  const specs = readdirSync(root, { recursive: true })
    .map(String)
    .filter((entry) => /\.(journey|spec)\.ts$/.test(entry))
    .map((entry) => `test/bcsc/${entry}`)
    .sort()
  for (const file of specs) {
    if (!mapped.has(file) && !NOT_SCHEDULED.has(file)) fail(`${file} is in neither OTHER_COVERAGE nor the upgrade matrix — add a row so the brief shows it`)
  }
}

const seenIds = new Set<string>()
for (const section of [...UAT_CHECKLIST, ...OTHER_COVERAGE]) {
  for (const row of section.rows) checkRow(row, seenIds)
}
// The upgrade rows as the weekly brief builds them, once per lineage (the version only prefixes the id).
for (const lineage of LINEAGES) {
  for (const section of upgradeSections({ version: lineage, lineage, platforms: ['android', 'ios'] })) {
    for (const row of section.rows) checkRow(row, seenIds)
  }
}
checkUpgradeMatrix()
checkCollisions()
checkUnmapped()

// --- the rules, on fixtures ---------------------------------------------------------------------------

function rowOf(model: BriefModel, id: string): { row: CoverageRow; cells: Record<Platform, CellResult> } {
  const sections = [...model.uat, ...model.other, ...(model.upgrades ?? []).flatMap((entry) => entry.sections)]
  for (const section of sections) {
    const found = section.rows.find((entry) => entry.row.id === id)
    if (found) return found
  }
  throw new Error(`no row ${id}`)
}

const cellOf = (model: BriefModel, id: string, platform: Platform): CellResult => rowOf(model, id).cells[platform]

function selfTest(): void {
  const reportDirs = resolveReportDirs([FIXTURES])
  assert.equal(reportDirs.length, 3, 'three fixture report dirs')
  const model = buildBrief({
    reportDirs,
    baselinePath: join(FIXTURES, 'a11y-baseline.json'),
    title: 'fixture',
    lanes: [{ name: 'regression', result: 'success' }, { name: 'upgrade', result: 'success' }, { name: 'send-video', result: 'success' }],
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
  // a session Sauce terminated leaves a 0-byte JUnit: the journey is rebuilt from its session record —
  // the checkpoint it died on fails, the rest of the file is blocked, and the failure links the Sauce job
  const approvedTitles = specTitles('test/bcsc/verify/send-video-approved.journey.ts')?.its ?? []
  const approved = cellOf(model, 'j-send-video-approved', 'ios')
  assert.deepEqual([approved.status, approved.passed, approved.failed, approved.blocked, approved.listed], ['fail', 2, 1, approvedTitles.length - 3, approvedTitles.length])
  const lostFailure = model.failures.find((entry) => entry.file.endsWith('send-video-approved.journey.ts'))
  assert.deepEqual([lostFailure?.terminated, lostFailure?.jobUrl], [true, 'https://app.saucelabs.com/tests/aaaa0002aaaa0002aaaa0002aaaa0002'])
  // every attempt is listed with its job: both died there, while the non-photo journey passed on its retry
  const outcomesOf = (file: string) => model.sessions.find((group) => group.platform === 'ios' && group.file.endsWith(file))?.attempts.map((attempt) => attempt.outcome)
  assert.deepEqual(outcomesOf('send-video-approved.journey.ts'), ['lost', 'lost'])
  assert.deepEqual(outcomesOf('send-video-non-photo.journey.ts'), ['fail', 'pass'])
  const nonPhoto = cellOf(model, 'j-send-video-non-photo', 'ios')
  assert.deepEqual([nonPhoto.status, nonPhoto.passed], ['pass', 8])
  // a 0-byte JUnit alone marks the worker's last attempt terminated: this one died in a hook, so its record
  // closed normally with no failed checkpoint and no `lost` — still 🔌, with the rest of the file blocked
  const cancelledTitles = specTitles('test/bcsc/verify/send-video-cancelled.journey.ts')?.its ?? []
  const cancelled = cellOf(model, 'j-send-video-cancelled', 'ios')
  assert.deepEqual([cancelled.status, cancelled.passed, cancelled.failed, cancelled.blocked, cancelled.listed], ['fail', 2, 0, cancelledTitles.length - 2, cancelledTitles.length])
  assert.deepEqual(outcomesOf('send-video-cancelled.journey.ts'), ['lost'])
  const hookLost = model.failures.find((entry) => entry.file.endsWith('send-video-cancelled.journey.ts'))
  assert.deepEqual([hookLost?.kind, hookLost?.terminated, hookLost?.blockedAfter, hookLost?.jobUrl], ['hook', true, cancelledTitles.length - 2, 'https://app.saucelabs.com/tests/aaaa0005aaaa0005aaaa0005aaaa0005'])
  assert.ok(model.warnings.some((warning) => warning.startsWith('2 iOS journey(s) lost their session')), 'the lost-session warning counts the hook death')
  // a suite with no session record (the older fixtures) carries no job link
  assert.equal(model.failures.find((entry) => entry.file.endsWith('settings.journey.ts'))?.jobUrl, undefined)
  // lanes: upgrade produced no reports; send-video's job passed but its reports hold a lost session
  assert.deepEqual(model.lanes.map((lane) => lane.hasReports), [true, false, true])
  assert.deepEqual(model.lanes.map((lane) => lane.failedSuites > 0), [true, false, true])
  // a11y: known vs NEW against the baseline
  const ios = model.a11y.find((summary) => summary.platform === 'ios')
  assert.equal(ios?.errorScreens.length, 2)
  const changePin = ios?.errorScreens.find((screen) => screen.screen === 'ChangePIN')
  assert.deepEqual([changePin?.newErrors, changePin?.inBaseline], [0, true])
  const birthdate = ios?.errorScreens.find((screen) => screen.screen === 'EnterBirthdate')
  assert.deepEqual([birthdate?.newErrors, birthdate?.inBaseline, birthdate?.warnings], [1, false, 1])
  // the roll-up gates on the same diff: a known screen's NEW findings fail it, an unseen screen's are only reported
  const fixtureBaseline = { ios: { ChangePIN: ['hitRegion|Button|PIN requirements'] } }
  const iosReports = loadA11yReports(reportDirs).ios?.reports ?? []
  const diffs = iosReports.map((report) => diffScreen(report, fixtureBaseline.ios))
  assert.deepEqual(
    diffs.map((diff) => [diff.screen, diff.inBaseline, diff.newIssues.length]),
    [
      ['UnverifiedHome', false, 0],
      ['ChangePIN', true, 0],
      ['EnterBirthdate', false, 2],
    ]
  )

  const markdown = renderMarkdown(model)
  for (const heading of ['### UAT checklist', '### Failures (5)', '<summary>Sessions (3 journeys · 5 attempts)</summary>', '🔌 session terminated', 'send-video ❌ (job ✅)', '### Accessibility', '### Legend']) {
    assert.ok(markdown.includes(heading), `markdown has ${heading}`)
  }
  assert.ok(!markdown.includes('### Upgrades'), 'the nightly brief has no upgrade block')
}

function upgradeSelfTest(): void {
  const reportDirs = resolveReportDirs([UPGRADE_FIXTURES])
  assert.equal(reportDirs.length, 4, 'four upgrade fixture report dirs')
  const model = buildBrief({
    reportDirs,
    title: 'upgrade fixture',
    upgrades: true,
    lanes: [{ name: 'upgradeVerified', result: 'success' }, { name: 'upgradeSubmitted', result: 'success' }, { name: 'upgradePartial', result: 'skipped' }],
    now: new Date('2026-10-31T16:00:00Z'),
  })
  // every manifest version has a block, oldest first, whether or not it has reports
  const manifest = loadUpgradeSources().map((source) => source.version)
  assert.deepEqual(model.upgrades?.map((entry) => entry.version), manifest)
  assert.ok(manifest.includes('3.15.0') && manifest.includes('3.15.1') && manifest.includes('4.0.3') && manifest.includes('4.1.3'), 'the fixtures assume these manifest versions')
  const entry = (version: string) => model.upgrades?.find((candidate) => candidate.version === version)
  // one wrapper reporting under two versions on one platform keeps a result per version
  const verifiedTitles = specTitles('test/bcsc/upgrade/scenarios/verified.scenario.ts')?.its ?? []
  const v3Ios = cellOf(model, 'upgrade-3.15.0-verified', 'ios')
  assert.deepEqual([v3Ios.status, v3Ios.passed, v3Ios.failed, v3Ios.blocked, v3Ios.listed], ['fail', 2, 1, verifiedTitles.length - 3, verifiedTitles.length])
  const v413Ios = cellOf(model, 'upgrade-4.1.3-verified', 'ios')
  assert.deepEqual([v413Ios.status, v413Ios.passed, v413Ios.listed], ['pass', verifiedTitles.length, verifiedTitles.length])
  assert.equal(cellOf(model, 'upgrade-3.15.0-verified', 'android').status, 'pass')
  assert.equal(cellOf(model, 'upgrade-4.1.3-verified', 'android').status, 'not-run')
  // a lineage that cannot arrange a path is n/a with the matrix's reason; an iOS-only version is n/a on Android
  const v3Serial = rowOf(model, 'upgrade-3.15.0-resume-serial')
  assert.deepEqual([v3Serial.cells.ios.status, v3Serial.cells.android.status], ['na', 'na'])
  assert.ok(v3Serial.row.note?.includes('not representable from v3'), 'the n/a row carries the reason')
  assert.deepEqual([cellOf(model, 'upgrade-3.15.1-verified', 'android').status, cellOf(model, 'upgrade-3.15.1-verified', 'ios').status], ['na', 'not-run'])
  assert.deepEqual(entry('3.15.1')?.platforms, ['ios'])
  // a submitted-state wrapper that bailed inside its scenario: fail + the scenario's remainder blocked; its sibling never ran
  const pendingTitles = specTitles('test/bcsc/upgrade/scenarios/in-person-pending.scenario.ts')?.its ?? []
  const pending = cellOf(model, 'upgrade-4.1.3-in-person-pending', 'ios')
  assert.deepEqual([pending.status, pending.passed, pending.failed, pending.blocked, pending.listed], ['fail', 4, 1, pendingTitles.length - 5, pendingTitles.length])
  assert.equal(cellOf(model, 'upgrade-4.1.3-send-video-pending', 'ios').status, 'not-run')
  assert.equal(model.failures.find((failure) => failure.file.endsWith('upgrade-in-person-pending.spec.ts'))?.blockedAfter, pendingTitles.length - 5)
  // the booted build comes from the session records; a version with no reports says so
  assert.deepEqual(entry('3.15.0')?.booted, ['BCSC-v3.15.0.apk'])
  assert.deepEqual(entry('4.1.3')?.booted, ['BCSC-v4.1.3.ipa'])
  assert.deepEqual([entry('4.0.3')?.hasReports, entry('4.0.3')?.booted], [false, []])
  assert.ok(model.warnings.includes('No reports for the upgrade from 4.0.3.'))
  // failures name their artifact (so the version); lanes match the versioned artifact names
  const verifiedFailure = model.failures.find((failure) => failure.file.endsWith('upgrade-verified.spec.ts'))
  assert.equal(verifiedFailure?.source, 'e2e-reports-upgradeVerified-3.15.0-iOS-18')
  assert.deepEqual(model.lanes.map((lane) => [lane.hasReports, lane.failedSuites > 0]), [[true, true], [true, true], [false, false]])
  // totals sum over the versions
  assert.equal(model.platforms.ios?.suites, 3)
  assert.equal(model.platforms.android?.suites, 1)

  const markdown = renderMarkdown(model)
  for (const text of [
    '### Upgrades to the build under test',
    '#### From 3.15.0',
    '#### From 4.0.3',
    'iOS only',
    'booted `BCSC-v4.1.3.ipa`',
    '| State | Path | iOS | Android | Note |',
    '| Partial | Unverified account: PIN and settings survive |',
    '**iOS · 3.15.0 · Upgrade with a verified account**',
    '<summary>Sessions (2 journeys · 2 attempts)</summary>',
    'upgradePartial ⏭️ (no reports)',
  ]) {
    assert.ok(markdown.includes(text), `upgrade markdown has ${text}`)
  }
  for (const text of ['### UAT checklist', '### Accessibility']) assert.ok(!markdown.includes(text), `upgrade markdown has no ${text}`)
}

try {
  selfTest()
} catch (err) {
  fail(`fixture self-test: ${(err as Error).message}`)
}
try {
  upgradeSelfTest()
} catch (err) {
  fail(`upgrade fixture self-test: ${(err as Error).message}`)
}

if (errors.length) {
  for (const message of errors) console.error(`[brief:check] ${message}`)
  console.error(`[brief:check] ${errors.length} problem(s)`)
  process.exit(1)
}
console.error('[brief:check] coverage map, upgrade matrix and fixture self-tests OK')
