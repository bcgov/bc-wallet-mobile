import type { A11yPlatformSummary } from './a11y-summary.js'
import type { CellResult, EvaluatedSection, FailureDetail, PlatformTotals } from './evaluate.js'
import { PLATFORM_LABEL, PLATFORMS, type Platform, type RunnerError } from './types.js'

/** Pure: a brief model → the markdown GitHub renders as the run summary (and the artifact page). */

export interface LaneResult {
  name: string
  /** GitHub job result: success | failure | cancelled | skipped. */
  result: string
  hasReports: boolean
}

export interface BriefModel {
  title: string
  generatedAt: string
  runUrl?: string
  lanes: LaneResult[]
  platforms: Partial<Record<Platform, PlatformTotals & { label: string }>>
  runnerErrors: RunnerError[]
  uat: EvaluatedSection[]
  other: EvaluatedSection[]
  failures: FailureDetail[]
  a11y: A11yPlatformSummary[]
  baselineGeneratedAt?: string
  warnings: string[]
  /** Report dirs the brief was built from (artifact names locally too). */
  sources: string[]
}

const SYMBOL: Record<CellResult['status'], string> = {
  pass: '✅',
  fail: '❌',
  blocked: '⛔',
  skipped: '⏭️',
  'not-run': '⬜',
  na: '➖',
  manual: '📝',
}

const LANE_SYMBOL: Record<string, string> = { success: '✅', failure: '❌', cancelled: '⛔', skipped: '⏭️' }
const FAILURES_SHOWN = 30

/** Markdown table cells cannot hold `|` or newlines. */
function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ')
}

function formatDuration(sec: number): string {
  const total = Math.round(sec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

/** `✅ 4/5 ⏭1` — the fraction and tallies only when not every listed checkpoint passed. */
function formatAuto(result: CellResult): string {
  let text = SYMBOL[result.status]
  if (result.status === 'not-run') return text
  if (result.passed !== result.listed) {
    text += ` ${result.passed}/${result.listed}`
    if (result.blocked) text += ` ⛔${result.blocked}`
    if (result.skipped) text += ` ⏭${result.skipped}`
    if (result.notRun) text += ` ⬜${result.notRun}`
  }
  return text
}

function formatCell(result: CellResult, mode: 'auto' | 'manual' | 'na' | 'skipped'): string {
  if (result.status === 'na') return `➖ n/a${result.auto ? ` (auto ${formatAuto(result.auto)})` : ''}`
  if (result.status === 'manual') {
    const label = mode === 'skipped' ? '📝 manual (skipped for e2e)' : '📝 manual'
    return `${label}${result.auto ? ` (auto ${formatAuto(result.auto)})` : ''}`
  }
  return formatAuto(result)
}

function renderSectionTable(sections: EvaluatedSection[], firstColumn: string): string[] {
  const lines = [`| ${firstColumn} | Row | iOS | Android | Note |`, '| --- | --- | --- | --- | --- |']
  for (const { section, rows } of sections) {
    for (const { row, cells } of rows) {
      const note = [row.note, row.link ? `[${row.link.split('/').pop()}](${row.link})` : undefined].filter(Boolean).join(' · ')
      lines.push(
        `| ${cell(section.title)} | ${cell(row.label)} | ${formatCell(cells.ios, row.platforms.ios)} | ${formatCell(cells.android, row.platforms.android)} | ${cell(note)} |`
      )
    }
  }
  return lines
}

function renderA11yPlatform(summary: A11yPlatformSummary): string[] {
  const lines: string[] = []
  const engine = summary.engines.join(' + ') || 'no engine'
  const errorLine = summary.errorsTotal
    ? `${summary.errorsTotal} errors on ${summary.errorScreens.length} screens (${summary.newErrorsTotal} NEW)`
    : 'no errors'
  const warningLine = `warning-only screens: ${summary.warningOnlyScreens} (${summary.warningsTotal} warnings, ${summary.newWarningsTotal} new)`
  lines.push(`**${PLATFORM_LABEL[summary.platform]}** — ${engine}, ${summary.screens} screens · ${errorLine} · ${warningLine}`)
  if (summary.unavailable.length) {
    const reasons = [...new Set(summary.unavailable.map((entry) => entry.reason))].join(' | ')
    lines.push(`⚠️ engine unavailable on ${summary.unavailable.length} screens: ${cell(reasons)}`)
  }
  if (summary.errorScreens.length) {
    lines.push('', '| Screen | Errors | New | Warnings | Rules |', '| --- | --- | --- | --- | --- |')
    for (const screen of summary.errorScreens) {
      const isNew = screen.newErrors ? `${screen.newErrors}${screen.inBaseline ? '' : ' (screen not in baseline)'}` : '0'
      const rules = screen.rules.map(({ rule, n }) => (n > 1 ? `${rule} ×${n}` : rule)).join(', ')
      lines.push(`| ${cell(screen.screen)} | ${screen.errors} | ${isNew} | ${screen.warnings} | ${cell(rules)} |`)
    }
  }
  return lines
}

export function renderMarkdown(model: BriefModel): string {
  const out: string[] = []
  const runLink = model.runUrl ? ` · [run](${model.runUrl})` : ''
  out.push(`## ${model.title} · ${model.generatedAt}${runLink}`, '')

  if (model.lanes.length) {
    const lanes = model.lanes.map((lane) => `${lane.name} ${LANE_SYMBOL[lane.result] ?? lane.result}${lane.hasReports ? '' : ' (no reports)'}`)
    out.push(`Lanes: ${lanes.join(' · ')}`, '')
  }

  const platforms = PLATFORMS.filter((platform) => model.platforms[platform])
  if (platforms.length) {
    out.push('| Platform | Suites | Checkpoints | ✅ | ❌ | ⛔ | ⏭️ | Time |', '| --- | --- | --- | --- | --- | --- | --- | --- |')
    for (const platform of platforms) {
      const totals = model.platforms[platform]
      if (!totals) continue
      out.push(
        `| ${totals.label} | ${totals.suites} | ${totals.checkpoints} | ${totals.passed} | ${totals.failed} | ${totals.blocked} | ${totals.skipped} | ${formatDuration(totals.timeSec)} |`
      )
    }
    out.push('')
  }
  for (const error of model.runnerErrors) {
    const where = error.platform ? PLATFORM_LABEL[error.platform] : error.source
    out.push(`⚠️ A worker never got a session on ${where}: ${cell(error.message)} (the specs it would have run show ⬜)`)
  }
  for (const warning of model.warnings) out.push(`⚠️ ${warning}`)
  if (model.runnerErrors.length || model.warnings.length) out.push('')

  out.push('### UAT checklist', '', ...renderSectionTable(model.uat, 'Area'), '')

  const journeyCount = model.other.reduce((n, section) => n + section.rows.length, 0)
  out.push('<details>', `<summary>Other coverage (${journeyCount} journeys)</summary>`, '', ...renderSectionTable(model.other, 'Group'), '', '</details>', '')

  out.push(`### Failures (${model.failures.length})`, '')
  if (!model.failures.length) out.push('None.', '')
  for (const failure of model.failures.slice(0, FAILURES_SHOWN)) {
    const blocked = failure.blockedAfter ? ` (${failure.blockedAfter} later checkpoints blocked)` : ''
    const checkpoint = failure.kind === 'hook' ? failure.checkpoint : `\`${failure.checkpoint}\``
    out.push(`- **${PLATFORM_LABEL[failure.platform]} · ${failure.suite}** → ${checkpoint} — ${failure.message}${blocked}`)
  }
  if (model.failures.length > FAILURES_SHOWN) out.push(`- …and ${model.failures.length - FAILURES_SHOWN} more in brief.json`)
  if (model.failures.length) out.push('')

  out.push('### Accessibility', '')
  if (!model.a11y.length) out.push('No audit output in these reports.', '')
  for (const summary of model.a11y) out.push(...renderA11yPlatform(summary), '')
  if (model.a11y.length) {
    const baseline = model.baselineGeneratedAt ? `generated ${model.baselineGeneratedAt}` : 'not found — every finding reads as NEW'
    out.push(`_Baseline: e2e/a11y-baseline.json (${baseline}). Regenerate with \`yarn a11y:baseline --reports <dir>\` once the findings are triaged._`, '')
  }

  out.push(
    '### Legend',
    '',
    '✅ pass · ❌ fail · ⛔ blocked (an earlier checkpoint in the file failed — mochaOpts.bail) · ⏭️ skipped at runtime (env/data gate) · ⬜ not run (no result in these reports) · ➖ n/a on this platform · 📝 manual (UAT-owned)',
    '',
    'Cells show `passed/listed` and tallies when not everything listed passed. The map behind the rows is `e2e/src/brief/coverage-map.ts`.',
    '',
    `Sources: ${model.sources.length ? model.sources.map((source) => `\`${source}\``).join(', ') : 'none'}. Repro: \`gh run download <run-id> -p 'e2e-reports-*' -D e2e/artifacts && cd e2e && yarn brief --reports artifacts\``,
    ''
  )
  return out.join('\n')
}
