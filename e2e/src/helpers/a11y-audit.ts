import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { addAttachment } from '@wdio/allure-reporter'
import { ANDROID_CHECKS, auditAndroidScreen } from './a11y-android.js'

/**
 * Automated accessibility audits at journey checkpoints.
 *
 * iOS runs Apple's own audit engine (`mobile: performAccessibilityAudit` — XCTest, iOS 17+): contrast,
 * hit region, element description, traits, clipped text, dynamic type. Android has no Appium-native
 * equivalent (Google's ATF is in-process only, axe-android is archived), so it gets page-source +
 * screenshot heuristics (`a11y-android.ts`) — shallower, and the report says so.
 *
 * An audit NEVER fails the checkpoint that runs it: findings go to Allure and `reports/a11y/`, and the
 * journey's last checkpoint reports the roll-up (`reportA11ySummary`), which fails only when the engine
 * could not run at all or when A11Y_AUDIT_STRICT=1 and error-severity findings exist. Screen readers
 * (VoiceOver/TalkBack) cannot be asserted by automation — that pass stays manual
 * (`docs/accessibility-manual-pass.md`).
 */

export type A11yPlatform = 'ios' | 'android'
/** `error` = the engine calls it a defect; `warning` = a heuristic that needs a human look. */
export type A11ySeverity = 'error' | 'warning'

export interface A11yIssue {
  /** iOS: the XCUIAccessibilityAuditType (short form, e.g. `contrast`); Android: the heuristic id. */
  rule: string
  severity: A11ySeverity
  message: string
  detail: string
  /** Short element description (type + name/label/id) — never coordinates, which vary per device. */
  element: string
  /** Where it sat on THIS device (`x,y w×h`, points/pixels) — for finding it on the screenshot only. */
  location?: string
  /** Stable key for a future fail-on-new baseline: rule + element identity. */
  signature: string
  /** How many elements shared this signature on the screen (present when more than one). */
  occurrences?: number
}

export interface A11yAuditReport {
  screen: string
  platform: A11yPlatform
  engine: 'xcuitest-audit' | 'android-heuristics' | 'unavailable'
  /** Why the engine could not run (engine `unavailable`). */
  reason?: string
  /** iOS: audit types requested; Android: checks run. */
  checks: readonly string[]
  /** Caveats worth reading next to the issues (an assumed density, how many text nodes were measured). */
  notes?: string[]
  durationMs: number
  issues: A11yIssue[]
}

/** What each engine returns; `auditScreen` adds the bookkeeping fields. */
export type A11yEngineResult = Pick<A11yAuditReport, 'engine' | 'reason' | 'notes' | 'issues'>

/** Apple's audit types (https://developer.apple.com/documentation/xctest/xcuiaccessibilityaudittype). */
export const IOS_AUDIT_TYPES = {
  contrast: 'XCUIAccessibilityAuditTypeContrast',
  elementDetection: 'XCUIAccessibilityAuditTypeElementDetection',
  hitRegion: 'XCUIAccessibilityAuditTypeHitRegion',
  sufficientElementDescription: 'XCUIAccessibilityAuditTypeSufficientElementDescription',
  dynamicType: 'XCUIAccessibilityAuditTypeDynamicType',
  textClipped: 'XCUIAccessibilityAuditTypeTextClipped',
  trait: 'XCUIAccessibilityAuditTypeTrait',
  parentChild: 'XCUIAccessibilityAuditTypeParentChild',
  action: 'XCUIAccessibilityAuditTypeAction',
} as const

export type IosAuditType = keyof typeof IOS_AUDIT_TYPES

/** Every type; override per run with A11Y_AUDIT_TYPES=contrast,hitRegion,… */
const DEFAULT_IOS_AUDIT_TYPES = Object.keys(IOS_AUDIT_TYPES) as IosAuditType[]

const IOS_TYPE_PREFIX = 'XCUIAccessibilityAuditType'
const IOS_ELEMENT_PREFIX = 'XCUIElementType'

const REPORTS_DIR = resolve(process.cwd(), 'reports', 'a11y')

/** Every audit this worker ran, for the roll-up. One journey file = one worker, so this is per journey. */
const collected: A11yAuditReport[] = []

function isStrict(): boolean {
  const flag = process.env.A11Y_AUDIT_STRICT?.trim().toLowerCase()
  return flag === '1' || flag === 'true'
}

function requestedIosAuditTypes(override?: IosAuditType[]): IosAuditType[] {
  if (override?.length) return override
  const env = process.env.A11Y_AUDIT_TYPES?.trim()
  if (!env || env === 'all') return DEFAULT_IOS_AUDIT_TYPES
  const known = env
    .split(',')
    .map((type) => type.trim())
    .filter((type): type is IosAuditType => type in IOS_AUDIT_TYPES)
  return known.length ? known : DEFAULT_IOS_AUDIT_TYPES
}

/** `XCUIAccessibilityAuditTypeHitRegion` → `hitRegion`; values without the prefix pass through. */
function shortIosName(value: unknown, prefix: string): string {
  const name = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  if (!name.startsWith(prefix)) return name
  const rest = name.slice(prefix.length)
  return rest.charAt(0).toLowerCase() + rest.slice(1)
}

/** One issue as WebDriverAgent returns it (`/wda/performAccessibilityAudit`). */
interface RawIosIssue {
  auditType?: string | number
  compactDescription?: string
  detailedDescription?: string
  element?: string
  elementDescription?: string
  elementAttributes?: Record<string, unknown>
}

/** `rect` as WDA reports it (`{x, y, width, height}`) → `x,y w×h`; undefined when absent. */
function formatRect(rect: unknown): string | undefined {
  if (!rect || typeof rect !== 'object') return undefined
  const { x, y, width, height } = rect as Record<string, unknown>
  if ([x, y, width, height].some((v) => typeof v !== 'number')) return undefined
  return `${x},${y} ${width}×${height}`
}

/**
 * One line naming the element. The snapshot attributes (type, identifier, label, value) come first;
 * an element with none of those falls back to XCTest's own description, then to the debug dump's
 * first line — some `elementDetection` issues carry nothing else.
 */
function normalizeIosIssue(raw: RawIosIssue): A11yIssue {
  const attrs = raw.elementAttributes ?? {}
  const str = (key: string): string => (typeof attrs[key] === 'string' ? (attrs[key] as string).trim() : '')
  const type = shortIosName(str('type'), IOS_ELEMENT_PREFIX)
  const identifier = str('rawIdentifier') || str('name')
  const label = str('label')
  const value = str('value')
  const rule = shortIosName(raw.auditType, IOS_TYPE_PREFIX) || 'unknown'
  const message = raw.compactDescription?.trim() ?? ''

  const parts = [type || 'element']
  if (identifier) parts.push(`id="${identifier}"`)
  if (label && label !== identifier) parts.push(`label="${label}"`)
  if (value && value !== label) parts.push(`value="${value}"`)
  const fallback = raw.element?.trim() || raw.elementDescription?.trim().split('\n')[0].slice(0, 120) || ''
  const element = parts.length > 1 ? parts.join(' ') : fallback || parts[0]

  return {
    rule,
    severity: 'error',
    message,
    detail: raw.detailedDescription?.trim() ?? '',
    element,
    location: formatRect(attrs.rect),
    signature: `${rule}|${type}|${identifier || label || value || message}`,
  }
}

async function auditIos(types: IosAuditType[]): Promise<A11yEngineResult> {
  let raw: RawIosIssue[]
  try {
    raw = (await driver.execute('mobile: performAccessibilityAudit', {
      auditTypes: types.map((type) => IOS_AUDIT_TYPES[type]),
    })) as RawIosIssue[]
  } catch (err) {
    // iOS < 17, a WebDriverAgent without the route, or a grid that blocks it — reported, never thrown.
    return { engine: 'unavailable', reason: (err as Error).message ?? String(err), issues: [] }
  }
  return { engine: 'xcuitest-audit', issues: (Array.isArray(raw) ? raw : []).map(normalizeIosIssue) }
}

/**
 * One issue per signature, counting the repeats. A list renders the same unlabeled row N times, and on
 * Android the screens underneath a pushed one are still in the tree — the finding is the same either way.
 */
function collapseDuplicates(issues: readonly A11yIssue[]): A11yIssue[] {
  const bySignature = new Map<string, A11yIssue>()
  for (const issue of issues) {
    const seen = bySignature.get(issue.signature)
    if (seen) {
      seen.occurrences = (seen.occurrences ?? 1) + 1
    } else {
      bySignature.set(issue.signature, { ...issue })
    }
  }
  return [...bySignature.values()]
}

function count(issues: readonly A11yIssue[], severity: A11ySeverity): number {
  return issues.filter((issue) => issue.severity === severity).length
}

function reportHeadline(report: A11yAuditReport): string {
  const scope = `${report.screen} (${report.platform}/${report.engine}, ${report.durationMs}ms)`
  if (report.engine === 'unavailable') return `${scope}: NOT AUDITED — ${report.reason}`
  return `${scope}: ${count(report.issues, 'error')} errors, ${count(report.issues, 'warning')} warnings`
}

function formatIssue(issue: A11yIssue): string {
  const times = issue.occurrences && issue.occurrences > 1 ? ` (×${issue.occurrences})` : ''
  return `${issue.severity === 'error' ? 'E' : 'W'} ${issue.rule}: ${issue.message} — ${issue.element}${times}`
}

function fileStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function fileSlug(name: string): string {
  return name.replace(/[^\w-]+/g, '_').slice(0, 60)
}

/** Best-effort persistence: a report that cannot be written must not fail the checkpoint. */
function writeReportFile(platform: A11yPlatform, basename: string, content: string): void {
  try {
    const dir = join(REPORTS_DIR, platform)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, basename), content)
  } catch (err) {
    console.warn(`[a11y] could not write ${basename}: ${(err as Error).message ?? err}`)
  }
}

async function attach(name: string, content: string, type: string): Promise<void> {
  try {
    await addAttachment(name, content, type)
  } catch {
    // No Allure context (e.g. called outside a test) — the file on disk still has it.
  }
}

async function record(report: A11yAuditReport): Promise<void> {
  collected.push(report)
  const json = JSON.stringify(report, null, 2)
  writeReportFile(report.platform, `${fileStamp()}-${fileSlug(report.screen)}.json`, json)
  await attach(`a11y audit: ${report.screen}`, json, 'application/json')
  console.log(`[a11y] ${reportHeadline(report)}`)
  for (const issue of report.issues) console.log(`[a11y]   ${formatIssue(issue)}`)
}

/**
 * Audit the screen currently on display and record the findings under `screen` (a stable, human name —
 * it keys the report file and the future baseline). Call it right after the screen's `expectVisible()`,
 * with no transition or keyboard in flight. Never throws on findings.
 *
 * `types` narrows the iOS audit for one call (e.g. skip `dynamicType` on a screen it is known to
 * misjudge); Android always runs every heuristic.
 */
export async function auditScreen(screen: string, options: { types?: IosAuditType[] } = {}): Promise<A11yAuditReport> {
  const started = Date.now()
  let result: A11yEngineResult
  let checks: readonly string[]
  if (driver.isIOS) {
    const types = requestedIosAuditTypes(options.types)
    checks = types
    result = await auditIos(types)
  } else {
    checks = ANDROID_CHECKS
    result = await auditAndroidScreen()
  }
  const report: A11yAuditReport = {
    screen,
    platform: driver.isIOS ? 'ios' : 'android',
    checks,
    durationMs: Date.now() - started,
    ...result,
    issues: collapseDuplicates(result.issues),
  }
  await record(report)
  return report
}

/** The audits this journey has recorded so far. */
export function collectedA11yAudits(): readonly A11yAuditReport[] {
  return collected
}

/** Human-readable roll-up of the recorded audits. */
export function formatA11ySummary(reports: readonly A11yAuditReport[] = collected): string {
  const lines = reports.map((report) => `- ${reportHeadline(report)}`)
  const issues = reports.flatMap((report) => report.issues)
  const byRule = new Map<string, number>()
  for (const issue of issues) byRule.set(issue.rule, (byRule.get(issue.rule) ?? 0) + 1)
  const rules = [...byRule.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([rule, n]) => `${rule}: ${n}`)
    .join(', ')
  return [
    `Accessibility audit — ${reports.length} screens, ${count(issues, 'error')} errors, ${count(issues, 'warning')} warnings`,
    rules ? `By rule: ${rules}` : '',
    ...lines,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * The journey's terminal checkpoint: attach + persist the roll-up, then fail only for the two things
 * that ARE defects of this lane — no audit could run (a broken engine/grid, which would otherwise
 * silently produce no signal), or error-severity findings under A11Y_AUDIT_STRICT=1.
 */
export async function reportA11ySummary(): Promise<void> {
  if (collected.length === 0) {
    throw new Error('No accessibility audits were recorded — call auditScreen() at the journey checkpoints')
  }
  const summary = formatA11ySummary()
  const platform = collected[0].platform
  writeReportFile(platform, `${fileStamp()}-summary.json`, JSON.stringify(collected, null, 2))
  await attach('a11y audit summary', summary, 'text/plain')
  console.log(`[a11y]\n${summary}`)

  const unavailable = collected.filter((report) => report.engine === 'unavailable')
  if (unavailable.length === collected.length) {
    const reasons = [...new Set(unavailable.map((report) => report.reason ?? 'unknown'))].join(' | ')
    throw new Error(`Accessibility audits could not run on ${platform} (${unavailable.length} screens): ${reasons}`)
  }
  const errors = collected.flatMap((report) => report.issues).filter((issue) => issue.severity === 'error')
  if (isStrict() && errors.length > 0) {
    throw new Error(`A11Y_AUDIT_STRICT: ${errors.length} accessibility errors\n${errors.map(formatIssue).join('\n')}`)
  }
}
