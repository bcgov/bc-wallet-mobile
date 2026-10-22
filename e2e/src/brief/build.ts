import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { loadA11yReports, loadBaseline, summarizeA11y } from './a11y-summary.js'
import { OTHER_COVERAGE, UAT_CHECKLIST } from './coverage-map.js'
import { collectFailures, evaluateSections, platformTotals, type SpecTitleLookup } from './evaluate.js'
import { loadJunitReports } from './junit.js'
import type { BriefModel, LaneResult } from './render.js'
import { applySessions, groupAttempts, loadSessions, markTerminated, type SessionGroup } from './sessions.js'
import { specTitles } from './spec-titles.js'
import { PLATFORM_LABEL, PLATFORMS, type Platform, type ReportDir, type SuiteResult } from './types.js'

/** Report dirs in → a brief model out. Shared by the CLI and the fixture self-test. */

export interface BuildOptions {
  reportDirs: ReportDir[]
  /** `a11y-baseline.json`; missing = every finding renders as NEW. */
  baselinePath?: string
  title: string
  runUrl?: string
  lanes?: { name: string; result: string }[]
  now?: Date
}

const hasReports = (dir: string): boolean => existsSync(join(dir, 'junit')) || existsSync(join(dir, 'a11y'))

/** The titles a reported file can carry: its own `it`s plus, for an orchestrator, those of the sources it imports. */
function specTitleLookup(): SpecTitleLookup {
  const sourcesOf = new Map<string, Set<string>>()
  for (const section of [...UAT_CHECKLIST, ...OTHER_COVERAGE]) {
    for (const row of section.rows) {
      for (const proof of row.proof) {
        if (!proof.sources) continue
        const sources = sourcesOf.get(proof.file) ?? new Set<string>()
        for (const source of proof.sources) sources.add(source)
        sourcesOf.set(proof.file, sources)
      }
    }
  }
  return (file) => {
    const own = specTitles(file)?.its
    const imported = [...(sourcesOf.get(file) ?? [])].flatMap((source) => specTitles(source)?.its ?? [])
    return own === undefined && imported.length === 0 ? undefined : [...(own ?? []), ...imported]
  }
}

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

export function buildBrief(options: BuildOptions): BriefModel {
  const { reportDirs } = options
  const warnings: string[] = []
  if (!reportDirs.length) warnings.push('No report directories found — nothing to summarize.')

  const junit = loadJunitReports(reportDirs)
  const attempts = loadSessions(reportDirs)
  markTerminated(attempts, junit.emptyFiles)
  const sessions = groupAttempts(attempts)
  applySessions(junit.results, sessions)
  warnings.push(...sessionWarnings(sessions, junit.emptyFiles))
  const a11y = loadA11yReports(reportDirs)
  const baseline = options.baselinePath ? loadBaseline(options.baselinePath) : undefined

  const platforms: BriefModel['platforms'] = {}
  for (const platform of PLATFORMS) {
    const run = junit.results[platform]
    if (run) platforms[platform] = { ...platformTotals(run), label: platformLabel(platform, run.sources) }
    else if (reportDirs.length) warnings.push(`No ${PLATFORM_LABEL[platform]} results in these reports.`)
  }

  const suites = Object.values(junit.results).flatMap((run) => run.suites)
  const lanes: LaneResult[] = (options.lanes ?? []).map((lane) => {
    const sources = reportDirs.filter((dir) => dir.name.includes(`-${lane.name}-`)).map((dir) => dir.name)
    return { ...lane, hasReports: sources.length > 0, failedSuites: suites.filter((suite) => sources.includes(suite.source) && suiteFailed(suite)).length }
  })

  const titlesOf = specTitleLookup()
  const now = options.now ?? new Date()
  return {
    title: options.title,
    generatedAt: `${now.toISOString().replace('T', ' ').slice(0, 16)} UTC`,
    runUrl: options.runUrl,
    lanes,
    platforms,
    runnerErrors: junit.runnerErrors,
    uat: evaluateSections(UAT_CHECKLIST, junit.results, titlesOf),
    other: evaluateSections(OTHER_COVERAGE, junit.results, titlesOf),
    failures: collectFailures(junit.results, titlesOf),
    sessions,
    a11y: summarizeA11y(a11y, baseline),
    baselineGeneratedAt: baseline?.generatedAt,
    warnings,
    sources: reportDirs.map((dir) => dir.name),
  }
}
