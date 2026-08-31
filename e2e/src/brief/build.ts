import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { loadA11yReports, loadBaseline, summarizeA11y } from './a11y-summary.js'
import { OTHER_COVERAGE, UAT_CHECKLIST } from './coverage-map.js'
import { collectFailures, evaluateSections, platformTotals } from './evaluate.js'
import { loadJunitReports } from './junit.js'
import type { BriefModel, LaneResult } from './render.js'
import { PLATFORM_LABEL, PLATFORMS, type Platform, type ReportDir } from './types.js'

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
  const a11y = loadA11yReports(reportDirs)
  const baseline = options.baselinePath ? loadBaseline(options.baselinePath) : undefined

  const platforms: BriefModel['platforms'] = {}
  for (const platform of PLATFORMS) {
    const run = junit.results[platform]
    if (run) platforms[platform] = { ...platformTotals(run), label: platformLabel(platform, run.sources) }
    else if (reportDirs.length) warnings.push(`No ${PLATFORM_LABEL[platform]} results in these reports.`)
  }

  const lanes: LaneResult[] = (options.lanes ?? []).map((lane) => ({
    ...lane,
    hasReports: reportDirs.some((dir) => dir.name.includes(`-${lane.name}-`)),
  }))

  const now = options.now ?? new Date()
  return {
    title: options.title,
    generatedAt: `${now.toISOString().replace('T', ' ').slice(0, 16)} UTC`,
    runUrl: options.runUrl,
    lanes,
    platforms,
    runnerErrors: junit.runnerErrors,
    uat: evaluateSections(UAT_CHECKLIST, junit.results),
    other: evaluateSections(OTHER_COVERAGE, junit.results),
    failures: collectFailures(junit.results),
    a11y: summarizeA11y(a11y, baseline),
    baselineGeneratedAt: baseline?.generatedAt,
    warnings,
    sources: reportDirs.map((dir) => dir.name),
  }
}
