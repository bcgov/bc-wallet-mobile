import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { lineageOf, loadUpgradeSources, MANIFEST_FILE, type UpgradeSource } from '../flows/prev-build/sources.js'
import { loadA11yReports, loadBaseline, summarizeA11y } from './a11y-summary.js'
import { OTHER_COVERAGE, UAT_CHECKLIST, type Proof } from './coverage-map.js'
import {
  collectFailures,
  evaluateSections,
  platformTotals,
  type EvaluatedSection,
  type FailureDetail,
  type PlatformTotals,
  type SpecTitleLookup,
} from './evaluate.js'
import { loadJunitReports, type LoadedJunit } from './junit.js'
import type { BriefModel, LaneResult, UpgradeVersionBrief } from './render.js'
import { applySessions, groupAttempts, loadSessions, markTerminated, versionOf, type SessionGroup } from './sessions.js'
import { specTitles } from './spec-titles.js'
import { PLATFORM_LABEL, PLATFORMS, type Platform, type ReportDir, type RunnerError, type SuiteResult } from './types.js'
import { allUpgradeProofs, upgradeSections } from './upgrade-map.js'

/** Report dirs in → a brief model out. Shared by the CLI and the fixture self-test. */

export interface BuildOptions {
  reportDirs: ReportDir[]
  /** `a11y-baseline.json`; missing = every finding renders as NEW. */
  baselinePath?: string
  title: string
  runUrl?: string
  lanes?: { name: string; result: string }[]
  /**
   * The weekly upgrade brief. The dirs are per-version artifacts (`e2e-reports-<suite>-<version>-<platform>-<os>`),
   * read one version at a time — the same wrapper spec reports under every version, and one shared load would keep
   * only the latest — and rendered as the version × state matrix instead of the UAT checklist.
   */
  upgrades?: boolean
  now?: Date
}

const hasReports = (dir: string): boolean => existsSync(join(dir, 'junit')) || existsSync(join(dir, 'a11y'))

/** The titles a reported file can carry: its own `it`s plus, for a wrapper or orchestrator, those of the sources it imports. */
function specTitleLookup(proofs: Proof[]): SpecTitleLookup {
  const sourcesOf = new Map<string, Set<string>>()
  for (const proof of proofs) {
    if (!proof.sources) continue
    const sources = sourcesOf.get(proof.file) ?? new Set<string>()
    for (const source of proof.sources) sources.add(source)
    sourcesOf.set(proof.file, sources)
  }
  return (file) => {
    const own = specTitles(file)?.its
    const imported = [...(sourcesOf.get(file) ?? [])].flatMap((source) => specTitles(source)?.its ?? [])
    return own === undefined && imported.length === 0 ? undefined : [...(own ?? []), ...imported]
  }
}

/** Every proof the maps name — the nightly's rows and the upgrade matrix on every lineage. */
const mappedProofs = (): Proof[] => [
  ...[...UAT_CHECKLIST, ...OTHER_COVERAGE].flatMap((section) => section.rows.flatMap((row) => row.proof)),
  ...allUpgradeProofs(),
]

/** A path holding `junit/` or `a11y/` is one report dir; otherwise each child dir that does is one. */
export function resolveReportDirs(paths: string[]): ReportDir[] {
  const dirs: ReportDir[] = []
  for (const raw of paths) {
    const path = resolve(raw)
    if (!existsSync(path) || !statSync(path).isDirectory()) continue
    if (hasReports(path)) {
      dirs.push({ path, name: basename(path) })
      continue
    }
    for (const child of readdirSync(path).sort()) {
      const childPath = join(path, child)
      if (statSync(childPath).isDirectory() && hasReports(childPath)) dirs.push({ path: childPath, name: child })
    }
  }
  return dirs
}

const suiteFailed = (suite: SuiteResult): boolean =>
  Boolean(suite.terminated) || suite.hookFailures.length > 0 || suite.tests.some((test) => test.status === 'fail')

/** Terminated sessions per platform, and 0-byte worker reports no session record can stand in for. */
function sessionWarnings(sessions: SessionGroup[], emptyFiles: { source: string; cid: string }[]): string[] {
  const warnings: string[] = []
  for (const platform of PLATFORMS) {
    const lost = sessions.filter((group) => group.platform === platform && group.attempts.at(-1)?.outcome === 'lost').length
    if (lost) warnings.push(`${lost} ${PLATFORM_LABEL[platform]} journey(s) lost their session mid-run (the app stopped answering the driver) — rebuilt from the session records and marked 🔌 below.`)
  }
  const recorded = new Set(sessions.flatMap((group) => group.attempts.map((attempt) => `${attempt.source}|${attempt.cid}`)))
  const orphans = new Map<string, number>()
  for (const file of emptyFiles) {
    if (!recorded.has(`${file.source}|${file.cid}`)) orphans.set(file.source, (orphans.get(file.source) ?? 0) + 1)
  }
  for (const [source, count] of orphans) {
    warnings.push(`${count} worker report(s) in ${source} are empty (the session was terminated before the reporter wrote) and no session record exists — those journeys show ⬜.`)
  }
  return warnings
}

/** `e2e-reports-regression-iOS-18` → `iOS 18`; otherwise the bare platform name. */
function platformLabel(platform: Platform, sources: string[]): string {
  for (const source of sources) {
    const [, os, version = ''] = /-(ios|android)-([^/]*)$/i.exec(source) ?? []
    if (os?.toLowerCase() === platform) return `${PLATFORM_LABEL[platform]} ${version}`.trim()
  }
  return PLATFORM_LABEL[platform]
}

/** One set of report dirs, loaded and reconciled: the JUnit results with the session records folded in. */
interface LoadedRun {
  junit: LoadedJunit
  sessions: SessionGroup[]
  warnings: string[]
}

function loadRun(reportDirs: ReportDir[]): LoadedRun {
  const junit = loadJunitReports(reportDirs)
  const attempts = loadSessions(reportDirs)
  markTerminated(attempts, junit.emptyFiles)
  const sessions = groupAttempts(attempts)
  applySessions(junit.results, sessions)
  return { junit, sessions, warnings: sessionWarnings(sessions, junit.emptyFiles) }
}

/** What every loaded run contributes to the one brief. */
interface Collected {
  totals: Map<Platform, PlatformTotals>
  sources: Map<Platform, string[]>
  suites: SuiteResult[]
  runnerErrors: RunnerError[]
  failures: FailureDetail[]
  sessions: SessionGroup[]
  warnings: string[]
}

function addTotals(sum: PlatformTotals | undefined, totals: PlatformTotals): PlatformTotals {
  if (!sum) return { ...totals }
  return {
    suites: sum.suites + totals.suites,
    checkpoints: sum.checkpoints + totals.checkpoints,
    passed: sum.passed + totals.passed,
    failed: sum.failed + totals.failed,
    blocked: sum.blocked + totals.blocked,
    skipped: sum.skipped + totals.skipped,
    timeSec: sum.timeSec + totals.timeSec,
  }
}

function collect(into: Collected, run: LoadedRun, titlesOf: SpecTitleLookup, prefix?: string): void {
  for (const platform of PLATFORMS) {
    const platformRun = run.junit.results[platform]
    if (!platformRun) continue
    into.totals.set(platform, addTotals(into.totals.get(platform), platformTotals(platformRun)))
    into.sources.set(platform, [...(into.sources.get(platform) ?? []), ...platformRun.sources])
    into.suites.push(...platformRun.suites)
  }
  into.runnerErrors.push(...run.junit.runnerErrors)
  into.failures.push(...collectFailures(run.junit.results, titlesOf))
  into.sessions.push(...run.sessions)
  into.warnings.push(...run.warnings.map((warning) => (prefix ? `${prefix}: ${warning}` : warning)))
}

const compareVersions = (a: string, b: string): number => {
  const [aMajor, aMinor, aPatch] = a.split('.').map(Number)
  const [bMajor, bMinor, bPatch] = b.split('.').map(Number)
  return aMajor - bMajor || aMinor - bMinor || aPatch - bPatch
}

/** The manifest versions, plus any version the artifacts name that the manifest no longer lists — oldest first. */
function upgradeVersions(reportDirs: ReportDir[], warnings: string[]): UpgradeSource[] {
  const sources = [...loadUpgradeSources()]
  for (const dir of reportDirs) {
    const version = versionOf(dir.name)
    if (!version) {
      warnings.push(`${dir.name} names no previous version (expected e2e-reports-<suite>-<version>-<platform>-<os>) — ignored.`)
      continue
    }
    if (sources.some((source) => source.version === version)) continue
    warnings.push(`${version} is not in ${MANIFEST_FILE} — its reports are shown under the lineage the version implies.`)
    sources.push({ version, releaseTag: '', platforms: ['android', 'ios'], lineage: lineageOf(version) })
  }
  return sources.sort((a, b) => compareVersions(a.version, b.version))
}

/** `storage:filename=BCSC-v4.1.3.ipa` or a local path → `BCSC-v4.1.3.ipa`. */
const bootedName = (app: string): string => basename(app.replace(/^storage:filename=/, ''))

export function buildBrief(options: BuildOptions): BriefModel {
  const { reportDirs } = options
  const warnings: string[] = []
  if (!reportDirs.length) warnings.push('No report directories found — nothing to summarize.')
  const titlesOf = specTitleLookup(mappedProofs())
  const collected: Collected = {
    totals: new Map(),
    sources: new Map(),
    suites: [],
    runnerErrors: [],
    failures: [],
    sessions: [],
    warnings,
  }

  let uat: EvaluatedSection[] = []
  let other: EvaluatedSection[] = []
  let upgrades: UpgradeVersionBrief[] | undefined
  if (options.upgrades) {
    upgrades = []
    for (const source of upgradeVersions(reportDirs, warnings)) {
      const dirs = reportDirs.filter((dir) => versionOf(dir.name) === source.version)
      const run = loadRun(dirs)
      collect(collected, run, titlesOf, `from ${source.version}`)
      if (!dirs.length) warnings.push(`No reports for the upgrade from ${source.version}.`)
      const apps = run.sessions.flatMap((group) => group.attempts.map((attempt) => attempt.app)).filter((app): app is string => Boolean(app))
      upgrades.push({
        version: source.version,
        lineage: source.lineage,
        platforms: source.platforms,
        note: source.note,
        booted: [...new Set(apps.map(bootedName))].sort((a, b) => a.localeCompare(b)),
        hasReports: dirs.length > 0,
        sections: evaluateSections(upgradeSections(source), run.junit.results, titlesOf),
      })
    }
  } else {
    const run = loadRun(reportDirs)
    collect(collected, run, titlesOf)
    uat = evaluateSections(UAT_CHECKLIST, run.junit.results, titlesOf)
    other = evaluateSections(OTHER_COVERAGE, run.junit.results, titlesOf)
  }

  const a11y = options.upgrades ? {} : loadA11yReports(reportDirs)
  const baseline = options.baselinePath && !options.upgrades ? loadBaseline(options.baselinePath) : undefined

  const platforms: BriefModel['platforms'] = {}
  for (const platform of PLATFORMS) {
    const totals = collected.totals.get(platform)
    if (totals) platforms[platform] = { ...totals, label: platformLabel(platform, collected.sources.get(platform) ?? []) }
    else if (reportDirs.length) warnings.push(`No ${PLATFORM_LABEL[platform]} results in these reports.`)
  }

  const lanes: LaneResult[] = (options.lanes ?? []).map((lane) => {
    const sources = reportDirs.filter((dir) => dir.name.includes(`-${lane.name}-`)).map((dir) => dir.name)
    return { ...lane, hasReports: sources.length > 0, failedSuites: collected.suites.filter((suite) => sources.includes(suite.source) && suiteFailed(suite)).length }
  })

  const now = options.now ?? new Date()
  return {
    title: options.title,
    generatedAt: `${now.toISOString().replace('T', ' ').slice(0, 16)} UTC`,
    runUrl: options.runUrl,
    lanes,
    platforms,
    runnerErrors: collected.runnerErrors,
    uat,
    other,
    upgrades,
    failures: collected.failures,
    sessions: collected.sessions,
    a11y: summarizeA11y(a11y, baseline),
    baselineGeneratedAt: baseline?.generatedAt,
    warnings,
    sources: reportDirs.map((dir) => dir.name),
  }
}
