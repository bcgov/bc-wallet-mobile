import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { A11yAuditReport, A11yIssue } from '../helpers/a11y-audit.js'
import { PLATFORMS, type Platform, type ReportDir } from './types.js'

/**
 * The accessibility roll-up: the latest audit output per platform, compared against the committed
 * baseline so a finding reads as known or NEW. Only screens with errors get a row; warnings are counted.
 */

/** `a11y-baseline.json`: platform → screen → the signatures already known there. */
export interface A11yBaseline {
  $comment?: string
  generatedAt?: string
  ios?: Record<string, string[]>
  android?: Record<string, string[]>
}

export interface A11yScreenSummary {
  screen: string
  errors: number
  newErrors: number
  warnings: number
  newWarnings: number
  /** False when the baseline has never seen this screen — every finding on it is NEW by construction. */
  inBaseline: boolean
  rules: { rule: string; n: number }[]
}

export interface A11yPlatformSummary {
  platform: Platform
  source: string
  stamp: string
  engines: string[]
  screens: number
  checks: readonly string[]
  unavailable: { screen: string; reason: string }[]
  errorScreens: A11yScreenSummary[]
  warningOnlyScreens: number
  warningsTotal: number
  newWarningsTotal: number
  errorsTotal: number
  newErrorsTotal: number
  byRule: { rule: string; n: number }[]
}

export interface LoadedA11y {
  reports: A11yAuditReport[]
  source: string
  stamp: string
}

const SUMMARY_SUFFIX = '-summary.json'
/** Report files are `<stamp>-<Screen>.json`, the stamp an ISO time with `:`/`.` swapped for `-`. */
const STAMP_LENGTH = '2026-08-28T21-20-18-607Z'.length

const stampOf = (name: string): string => name.slice(0, STAMP_LENGTH)
const screenFileOf = (name: string): string => name.slice(STAMP_LENGTH + 1)

/** The roll-up file if the journey reached it, else the latest per-screen file of each screen. */
function loadPlatformDir(dir: string, source: string): LoadedA11y | undefined {
  const names = readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))
  const summaries = names.filter((name) => name.endsWith(SUMMARY_SUFFIX))
  if (summaries.length) {
    const name = summaries[summaries.length - 1]
    const parsed = JSON.parse(readFileSync(join(dir, name), 'utf8')) as A11yAuditReport[]
    return { reports: Array.isArray(parsed) ? parsed : [], source, stamp: stampOf(name) }
  }
  const latestPerScreen = new Map<string, string>()
  for (const name of names) latestPerScreen.set(screenFileOf(name), name)
  if (!latestPerScreen.size) return undefined
  const reports = [...latestPerScreen.values()].map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as A11yAuditReport)
  return { reports, source, stamp: stampOf([...latestPerScreen.values()].sort((a, b) => a.localeCompare(b)).pop() ?? '') }
}

/** The latest audit output per platform across the report dirs. */
export function loadA11yReports(reportDirs: ReportDir[]): Partial<Record<Platform, LoadedA11y>> {
  const latest: Partial<Record<Platform, LoadedA11y>> = {}
  for (const dir of reportDirs) {
    for (const platform of PLATFORMS) {
      const platformDir = join(dir.path, 'a11y', platform)
      if (!existsSync(platformDir)) continue
      const loaded = loadPlatformDir(platformDir, dir.name)
      if (!loaded) continue
      const seen = latest[platform]
      if (!seen || loaded.stamp >= seen.stamp) latest[platform] = loaded
    }
  }
  return latest
}

export function loadBaseline(path: string): A11yBaseline | undefined {
  if (!existsSync(path)) return undefined
  return JSON.parse(readFileSync(path, 'utf8')) as A11yBaseline
}

/** Every signature seen, per platform and screen, sorted so the committed file diffs cleanly. */
export function buildBaseline(loaded: Partial<Record<Platform, LoadedA11y>>): A11yBaseline {
  const baseline: A11yBaseline = {
    $comment:
      'Known accessibility findings (platform → screen → issue signatures). Regenerate from a report dir: cd e2e && yarn a11y:baseline --reports <dir>. Report-only: the brief tags findings missing here as NEW.',
    generatedAt: new Date().toISOString(),
  }
  for (const platform of PLATFORMS) {
    const reports = loaded[platform]?.reports
    if (!reports) continue
    const screens: Record<string, string[]> = {}
    for (const report of [...reports].sort((a, b) => a.screen.localeCompare(b.screen))) {
      screens[report.screen] = [...new Set(report.issues.map((issue) => issue.signature))].sort((a, b) => a.localeCompare(b))
    }
    baseline[platform] = screens
  }
  return baseline
}

function countRules(issues: A11yIssue[]): { rule: string; n: number }[] {
  const counts = new Map<string, number>()
  for (const issue of issues) counts.set(issue.rule, (counts.get(issue.rule) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([rule, n]) => ({ rule, n }))
}

export function summarizeA11y(
  loaded: Partial<Record<Platform, LoadedA11y>>,
  baseline: A11yBaseline | undefined
): A11yPlatformSummary[] {
  const summaries: A11yPlatformSummary[] = []
  for (const platform of PLATFORMS) {
    const entry = loaded[platform]
    if (!entry) continue
    const known = baseline?.[platform] ?? {}
    const summary: A11yPlatformSummary = {
      platform,
      source: entry.source,
      stamp: entry.stamp,
      engines: [...new Set(entry.reports.map((report) => report.engine))],
      screens: entry.reports.length,
      checks: entry.reports[0]?.checks ?? [],
      unavailable: entry.reports
        .filter((report) => report.engine === 'unavailable')
        .map((report) => ({ screen: report.screen, reason: report.reason ?? 'unknown' })),
      errorScreens: [],
      warningOnlyScreens: 0,
      warningsTotal: 0,
      newWarningsTotal: 0,
      errorsTotal: 0,
      newErrorsTotal: 0,
      byRule: countRules(entry.reports.flatMap((report) => report.issues.filter((issue) => issue.severity === 'error'))),
    }
    for (const report of entry.reports) {
      const knownHere = known[report.screen]
      const isNew = (issue: A11yIssue): boolean => !knownHere?.includes(issue.signature)
      const errors = report.issues.filter((issue) => issue.severity === 'error')
      const warnings = report.issues.filter((issue) => issue.severity === 'warning')
      const newErrors = errors.filter(isNew).length
      const newWarnings = warnings.filter(isNew).length
      summary.errorsTotal += errors.length
      summary.newErrorsTotal += newErrors
      summary.warningsTotal += warnings.length
      summary.newWarningsTotal += newWarnings
      if (errors.length) {
        summary.errorScreens.push({
          screen: report.screen,
          errors: errors.length,
          newErrors,
          warnings: warnings.length,
          newWarnings,
          inBaseline: knownHere !== undefined,
          rules: countRules(errors),
        })
      } else if (warnings.length) {
        summary.warningOnlyScreens++
      }
    }
    summary.errorScreens.sort((a, b) => b.newErrors - a.newErrors || b.errors - a.errors || a.screen.localeCompare(b.screen))
    summaries.push(summary)
  }
  return summaries
}
