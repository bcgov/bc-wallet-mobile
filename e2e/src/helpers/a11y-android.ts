import { type Cheerio, type CheerioAPI, load } from 'cheerio'
import sharp from 'sharp'
import type { A11yEngineResult, A11yIssue, A11ySeverity } from './a11y-audit.js'

/**
 * Android accessibility heuristics — the free stand-in for an audit engine Appium does not have.
 *
 * Everything here is derived from two things the driver already gives us: the UiAutomator2 page source
 * (the accessibility node tree — names, classes, bounds, clickability) and a screenshot. That reaches
 * the mechanical WCAG checks — a control TalkBack would announce as nothing, targets too small to hit,
 * text that does not clear the contrast ratio — and nothing semantic: roles, focus order, live-region
 * announcements and state are out of reach without an in-process engine (Google's ATF via Espresso, or a
 * paid Appium fork). Treat every finding as a lead for a human, not a verdict.
 */

export const ANDROID_CHECKS = ['unlabeled-control', 'unlabeled-text-field', 'touch-target', 'text-contrast'] as const

/** Material says 48dp, Apple 44pt — warn under the lower of the two, so a 47dp button is not noise. */
const TOUCH_TARGET_RECOMMENDED_DP = 48
const TOUCH_TARGET_WARN_BELOW_DP = 44
/** WCAG 2.5.8 (AA). */
const TOUCH_TARGET_MINIMUM_DP = 24
/** Anything thinner is a row clipped at a scroll edge, not a control. */
const CLIPPED_TARGET_DP = 4
/** WCAG 1.4.3 (AA): 4.5:1 for body text, 3:1 for large text (≥18pt, or ≥14pt bold). */
const CONTRAST_AA = 4.5
const CONTRAST_AA_LARGE_TEXT = 3
/** Text regions smaller than this are too few pixels to separate glyph from background. */
const MIN_TEXT_REGION_PX = 6
/**
 * Below this the region is effectively one colour: the node is covered by a screen pushed on top (Android
 * keeps the stack's lower screens in the tree, still "displayed"), or blank. Not a contrast finding.
 */
const MIN_MEASURABLE_CONTRAST = 1.5
/** A colour must cover at least this share of a text region to count as its foreground. */
const FOREGROUND_MIN_SHARE = 0.005
/** Used only when neither the session capabilities nor `mobile: deviceInfo` report a density. */
const FALLBACK_DENSITY_DPI = 420
/** Let a push/fade finish before sampling colours — a mid-transition frame reads as low contrast. */
const SETTLE_MS = 500

interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}

interface UiNode {
  cls: string
  id: string
  text: string
  desc: string
  hint: string
  clickable: boolean
  enabled: boolean
  displayed: boolean
  bounds?: Bounds
  children: UiNode[]
}

// cheerio does not re-export its node types; derive the element type from the API instead.
type ElementOf<C> = C extends Cheerio<infer N> ? N : never
type DomElement = ElementOf<ReturnType<ReturnType<CheerioAPI['root']>['children']>>

function parseBounds(value: string): Bounds | undefined {
  const match = /\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/.exec(value)
  if (!match) return undefined
  const [left, top, right, bottom] = match.slice(1).map(Number)
  return right > left && bottom > top ? { left, top, right, bottom } : undefined
}

function toNode($: CheerioAPI, el: DomElement): UiNode {
  const $el = $(el)
  const attr = (name: string): string => $el.attr(name) ?? ''
  return {
    cls: attr('class'),
    id: attr('resource-id'),
    text: attr('text'),
    desc: attr('content-desc'),
    hint: attr('hint'),
    clickable: attr('clickable') === 'true',
    enabled: attr('enabled') !== 'false',
    displayed: attr('displayed') !== 'false',
    bounds: parseBounds(attr('bounds')),
    children: $el
      .children()
      .toArray()
      .map((child) => toNode($, child)),
  }
}

/** The page source as a tree plus the display size the bounds are expressed in. */
function parseHierarchy(xml: string): { roots: UiNode[]; width: number; height: number } {
  const $ = load(xml, { xml: true })
  const hierarchy = $('hierarchy')
  return {
    roots: hierarchy
      .children()
      .toArray()
      .map((child) => toNode($, child)),
    width: Number(hierarchy.attr('width')) || 0,
    height: Number(hierarchy.attr('height')) || 0,
  }
}

function flatten(nodes: UiNode[], out: UiNode[] = []): UiNode[] {
  for (const node of nodes) {
    out.push(node)
    flatten(node.children, out)
  }
  return out
}

const isTextView = (node: UiNode): boolean => node.cls.endsWith('TextView')
/** Letters or digits — icon-font glyphs (private-use code points) are graphics, not text (WCAG 1.4.11). */
const hasReadableText = (text: string): boolean => /[\p{L}\p{N}]/u.test(text)
const isEditText = (node: UiNode): boolean => node.cls.endsWith('EditText')
const containsEditText = (node: UiNode): boolean => node.children.some((c) => isEditText(c) || containsEditText(c))

function shortClass(cls: string): string {
  return cls.slice(cls.lastIndexOf('.') + 1) || 'View'
}

function truncate(value: string, max = 40): string {
  const flat = value.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

function describe(node: UiNode): string {
  const parts = [shortClass(node.cls)]
  if (node.id) parts.push(`id="${node.id}"`)
  if (node.text.trim()) parts.push(`text="${truncate(node.text)}"`)
  if (node.desc.trim()) parts.push(`desc="${truncate(node.desc)}"`)
  return parts.join(' ')
}

function issue(rule: string, severity: A11ySeverity, node: UiNode, message: string, detail: string): A11yIssue {
  const identity = node.id || node.desc.trim() || node.text.trim() || node.hint.trim()
  return {
    rule,
    severity,
    message,
    detail,
    element: describe(node),
    signature: `${rule}|${shortClass(node.cls)}|${identity}`,
  }
}

/**
 * What TalkBack would speak for a node: its own description, else its text, else the text of the
 * descendants it merges — every non-clickable one (a clickable child is focused on its own).
 */
function mergedChildText(node: UiNode): string {
  const parts: string[] = []
  for (const child of node.children) {
    if (child.clickable) continue
    const own = child.desc.trim() || child.text.trim() || (isEditText(child) ? child.hint.trim() : '')
    parts.push(own || mergedChildText(child))
  }
  return parts.filter(Boolean).join(' ')
}

function accessibleName(node: UiNode): string {
  return node.desc.trim() || node.text.trim() || mergedChildText(node)
}

function checkLabels(nodes: UiNode[]): A11yIssue[] {
  const issues: A11yIssue[] = []
  for (const node of nodes) {
    if (!node.displayed || !node.bounds) continue
    if (isEditText(node)) {
      if (!node.desc.trim() && !node.hint.trim() && !node.text.trim()) {
        issues.push(
          issue(
            'unlabeled-text-field',
            'warning',
            node,
            'Text field has no accessibility label or placeholder',
            'TalkBack announces it as an unnamed edit box. Give the TextInput an accessibilityLabel (or a placeholder) that names what to enter.'
          )
        )
      }
      continue
    }
    // A pressable wrapper around a field is a focus proxy; the field is the control.
    if (node.clickable && !containsEditText(node) && accessibleName(node) === '') {
      issues.push(
        issue(
          'unlabeled-control',
          'error',
          node,
          'Tappable element has no accessible name',
          'Nothing for TalkBack to announce: no content description, no text, and no non-clickable descendant text. Add an accessibilityLabel (icon-only buttons are the usual case).'
        )
      )
    }
  }
  return issues
}

function checkTouchTargets(nodes: UiNode[], density: number): A11yIssue[] {
  const toDp = (px: number): number => (px * 160) / density
  const issues: A11yIssue[] = []
  for (const node of nodes) {
    // Inline text links are exempt (WCAG 2.5.8 — targets within a sentence).
    if (!node.clickable || !node.displayed || !node.bounds || isTextView(node)) continue
    const width = Math.round(toDp(node.bounds.right - node.bounds.left))
    const height = Math.round(toDp(node.bounds.bottom - node.bounds.top))
    const smallest = Math.min(width, height)
    if (smallest < CLIPPED_TARGET_DP || smallest >= TOUCH_TARGET_WARN_BELOW_DP) continue
    const severity: A11ySeverity = smallest < TOUCH_TARGET_MINIMUM_DP ? 'error' : 'warning'
    issues.push(
      issue(
        'touch-target',
        severity,
        node,
        `Touch target is ${width}×${height}dp (recommended ≥ ${TOUCH_TARGET_RECOMMENDED_DP}dp, WCAG minimum ${TOUCH_TARGET_MINIMUM_DP}dp)`,
        'Layout bounds from the accessibility tree; a hitSlop that extends the touch area invisibly does not show here, so confirm on the screen before fixing.'
      )
    )
  }
  return issues
}

// --- text contrast, sampled from the screenshot -------------------------------------------------

function channelLuminance(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

function contrastRatio(l1: number, l2: number): number {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/** 5 bits per channel: coarse enough to pool anti-aliasing, fine enough to keep fg and bg apart. */
const bucketOf = (r: number, g: number, b: number): number => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
const bucketColor = (key: number): [number, number, number] => [
  (((key >> 10) & 31) << 3) | 4,
  (((key >> 5) & 31) << 3) | 4,
  ((key & 31) << 3) | 4,
]
const hex = ([r, g, b]: [number, number, number]): string =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`

interface RawImage {
  data: Buffer
  width: number
  height: number
}

/**
 * Estimate a text region's contrast the way ATF's TextContrastCheck does: the most common colour is the
 * background, the most contrasting colour with a non-trivial share is the text. Anti-aliased edge pixels
 * have LESS contrast than the glyph core, so the maximum finds the real text colour. Undefined when the
 * region has no second colour worth the name.
 */
function measureContrast(image: RawImage, region: Bounds): { ratio: number; fg: string; bg: string } | undefined {
  const counts = new Map<number, number>()
  let total = 0
  for (let y = region.top; y < region.bottom; y++) {
    let offset = (y * image.width + region.left) * 3
    for (let x = region.left; x < region.right; x++, offset += 3) {
      const key = bucketOf(image.data[offset], image.data[offset + 1], image.data[offset + 2])
      counts.set(key, (counts.get(key) ?? 0) + 1)
      total++
    }
  }
  if (total === 0) return undefined

  let bgKey = -1
  let bgCount = -1
  for (const [key, n] of counts) {
    if (n > bgCount) {
      bgKey = key
      bgCount = n
    }
  }
  const bg = bucketColor(bgKey)
  const bgLuminance = relativeLuminance(...bg)
  const floor = Math.max(8, Math.ceil(total * FOREGROUND_MIN_SHARE))

  let best: { key: number; ratio: number } | undefined
  for (const [key, n] of counts) {
    if (key === bgKey || n < floor) continue
    const ratio = contrastRatio(relativeLuminance(...bucketColor(key)), bgLuminance)
    if (!best || ratio > best.ratio) best = { key, ratio }
  }
  return best ? { ratio: best.ratio, fg: hex(bucketColor(best.key)), bg: hex(bg) } : undefined
}

async function checkTextContrast(
  nodes: UiNode[],
  screenshotBase64: string,
  display: { width: number; height: number }
): Promise<{ issues: A11yIssue[]; measured: number; covered: number }> {
  const { data, info } = await sharp(Buffer.from(screenshotBase64, 'base64'))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const image: RawImage = { data, width: info.width, height: info.height }
  // Bounds are in display pixels; a screenshot at another resolution needs scaling to match.
  const scale = display.width > 0 ? info.width / display.width : 1

  const issues: A11yIssue[] = []
  let measured = 0
  let covered = 0
  for (const node of nodes) {
    // Disabled text is exempt (WCAG 1.4.3); blank text and icon glyphs have nothing to measure.
    if (!isTextView(node) || !node.displayed || !node.enabled || !hasReadableText(node.text) || !node.bounds) continue
    const region: Bounds = {
      left: Math.max(0, Math.round(node.bounds.left * scale)),
      top: Math.max(0, Math.round(node.bounds.top * scale)),
      right: Math.min(image.width, Math.round(node.bounds.right * scale)),
      bottom: Math.min(image.height, Math.round(node.bounds.bottom * scale)),
    }
    if (region.right - region.left < MIN_TEXT_REGION_PX || region.bottom - region.top < MIN_TEXT_REGION_PX) continue
    const result = measureContrast(image, region)
    if (!result || result.ratio < MIN_MEASURABLE_CONTRAST) {
      covered++
      continue
    }
    measured++
    if (result.ratio >= CONTRAST_AA) continue
    const severity: A11ySeverity = result.ratio < CONTRAST_AA_LARGE_TEXT ? 'error' : 'warning'
    issues.push(
      issue(
        'text-contrast',
        severity,
        node,
        `Text contrast ${result.ratio.toFixed(2)}:1 (${result.fg} on ${result.bg}) is below ${CONTRAST_AA}:1`,
        severity === 'warning'
          ? `Passes only if this is large text (≥18pt, or ≥14pt bold), where ${CONTRAST_AA_LARGE_TEXT}:1 applies — the tree does not carry font size, so check it.`
          : 'Sampled from the screenshot: dominant colour = background, most contrasting colour = text. Text over images or gradients can mislead it — confirm on the screen.'
      )
    )
  }
  return { issues, measured, covered }
}

/** The display density the bounds are expressed against, and whether it had to be assumed. */
async function resolveDensity(): Promise<{ dpi: number; assumed: boolean }> {
  const caps = driver.capabilities as Record<string, unknown>
  const fromCaps = Number(caps.deviceScreenDensity)
  if (Number.isFinite(fromCaps) && fromCaps > 0) return { dpi: fromCaps, assumed: false }
  try {
    const info = (await driver.execute('mobile: deviceInfo')) as { displayDensity?: number }
    if (info?.displayDensity && info.displayDensity > 0) return { dpi: info.displayDensity, assumed: false }
  } catch {
    // fall through to the assumption
  }
  return { dpi: FALLBACK_DENSITY_DPI, assumed: true }
}

/** Run every heuristic against the current screen. Never throws — an engine failure is reported as such. */
export async function auditAndroidScreen(): Promise<A11yEngineResult> {
  try {
    await driver.pause(SETTLE_MS)
    const source = await driver.getPageSource()
    const density = await resolveDensity()
    const screenshot = await driver.takeScreenshot()

    const { roots, width, height } = parseHierarchy(source)
    const nodes = flatten(roots)
    const contrast = await checkTextContrast(nodes, screenshot, { width, height })
    const notes = [
      `text-contrast measured ${contrast.measured} text nodes; skipped ${contrast.covered} that are not visibly rendered (covered by a screen above, or blank)`,
    ]
    if (density.assumed) notes.push(`touch-target assumed ${density.dpi}dpi — no density reported by the session`)

    return {
      engine: 'android-heuristics',
      notes,
      issues: [...checkLabels(nodes), ...checkTouchTargets(nodes, density.dpi), ...contrast.issues],
    }
  } catch (err) {
    return { engine: 'unavailable', reason: (err as Error).message ?? String(err), issues: [] }
  }
}
