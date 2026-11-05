import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The shipped builds the upgrade suites start from — `e2e/upgrade-sources.json`, the one list the
 * weekly upgrade run, the monthly Sauce refresh and the wdio upgrade configs all read. A build lives
 * under one name on its GitHub release and in Sauce storage, `BCSC-v<version>.apk` / `.ipa`; a run
 * picks it by version (`PREV_VERSION`), and the version decides which previous-build driver arranges
 * state on it:
 *
 * - `v3`      — 3.x: the native app, driven over the raw selectors in `v3TestIDs.ts`
 * - `v403`    — 4.0.x: the shipped 4.0.3, driven by the frozen pre-rework walks (`flows/*-v403.ts`)
 * - `current` — 4.1.0 and later: today's onboarding + verify DSL drives it as-is
 *
 * Pure (no driver globals), so the configs can read it while they build the suites.
 */

export type Lineage = 'v3' | 'v403' | 'current'
export type SourcePlatform = 'android' | 'ios'

export interface UpgradeSource {
  version: string
  /** The GitHub release carrying `BCSC-v<version>.*` (not always the version's own tag — see the manifest notes). */
  releaseTag: string
  platforms: SourcePlatform[]
  lineage: Lineage
  note?: string
}

export const PREV_VERSION_ENV = 'PREV_VERSION'
export const MANIFEST_FILE = 'e2e/upgrade-sources.json'
const MANIFEST_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../../upgrade-sources.json')
const VERSION = /^\d+\.\d+\.\d+$/
const PLATFORMS: readonly SourcePlatform[] = ['android', 'ios']

/** Which driver a version takes — by major/minor, so a version the manifest does not list still resolves. */
export function lineageOf(version: string): Lineage {
  if (!VERSION.test(version)) throw new Error(`"${version}" is not an app version (x.y.z)`)
  const [major, minor] = version.split('.').map(Number)
  if (major < 4) return 'v3'
  if (major === 4 && minor === 0) return 'v403'
  return 'current'
}

const isPlatform = (value: unknown): value is SourcePlatform => PLATFORMS.includes(value as SourcePlatform)

function parseSource(entry: unknown, index: number): UpgradeSource {
  const where = `${MANIFEST_FILE} sources[${index}]`
  const raw = (entry ?? {}) as Record<string, unknown>
  const { version, release_tag: releaseTag, platforms, note } = raw
  if (typeof version !== 'string' || !VERSION.test(version)) throw new Error(`${where}: "version" must be x.y.z`)
  if (typeof releaseTag !== 'string' || !releaseTag) throw new Error(`${where} (${version}): "release_tag" is required`)
  if (!Array.isArray(platforms) || !platforms.length || !platforms.every(isPlatform)) {
    throw new Error(`${where} (${version}): "platforms" must list android and/or ios`)
  }
  return {
    version,
    releaseTag,
    platforms: [...new Set(platforms)],
    lineage: lineageOf(version),
    ...(typeof note === 'string' && { note }),
  }
}

let cached: UpgradeSource[] | undefined

/** Every manifest entry, validated: a malformed entry is an error, never a silently dropped version. */
export function loadUpgradeSources(): UpgradeSource[] {
  if (cached) return cached
  const raw = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as { sources?: unknown }
  if (!Array.isArray(raw.sources)) throw new Error(`${MANIFEST_FILE}: expected a "sources" array`)
  const sources = raw.sources.map(parseSource)
  const versions = sources.map((source) => source.version)
  const duplicate = versions.find((version, index) => versions.indexOf(version) !== index)
  if (duplicate) throw new Error(`${MANIFEST_FILE}: ${duplicate} is listed twice`)
  cached = sources
  return sources
}

/** The Sauce storage (and release asset) name of a version's build on a platform. */
export function sauceAppName(version: string, platform: SourcePlatform): string {
  return `BCSC-v${version}.${platform === 'ios' ? 'ipa' : 'apk'}`
}

/** `PREV_VERSION`, or a named error — the upgrade suites never guess which build to boot. */
export function requirePrevVersion(): string {
  const version = process.env[PREV_VERSION_ENV]
  if (!version) {
    throw new Error(
      `${PREV_VERSION_ENV} is required by the upgrade suites: the shipped version to upgrade from ` +
        `(e.g. ${PREV_VERSION_ENV}=4.1.3), one listed in ${MANIFEST_FILE}`
    )
  }
  if (!VERSION.test(version)) throw new Error(`${PREV_VERSION_ENV}="${version}" is not an app version (x.y.z)`)
  return version
}

/** The manifest entry for `version`, or a named error. */
export function upgradeSource(version: string): UpgradeSource {
  const sources = loadUpgradeSources()
  const source = sources.find((entry) => entry.version === version)
  if (!source) {
    throw new Error(
      `${version} is not in ${MANIFEST_FILE} (${sources.map((entry) => entry.version).join(', ')}) — add it there; ` +
        `its release must carry BCSC-v${version}.apk / .ipa (e2e/apps/README.md, "Upgrade-source binaries")`
    )
  }
  return source
}

/**
 * The previous build a config boots on `platform`: `PREV_VERSION`'s build from the manifest, or the file
 * `PREV_ANDROID_APP` / `PREV_IOS_APP` names — an explicit override for any stored build, including a
 * version the manifest does not list; its lineage still comes from `PREV_VERSION`.
 */
export function resolvePrevApp(platform: SourcePlatform): { version: string; lineage: Lineage; app: string } {
  const version = requirePrevVersion()
  const override = process.env[platform === 'ios' ? 'PREV_IOS_APP' : 'PREV_ANDROID_APP']
  if (override) return { version, lineage: lineageOf(version), app: override }
  const source = upgradeSource(version)
  if (!source.platforms.includes(platform)) {
    throw new Error(
      `${version} shipped for ${source.platforms.join(' + ')} only — there is no ${sauceAppName(version, platform)} to boot on ${platform}`
    )
  }
  return { version, lineage: source.lineage, app: sauceAppName(version, platform) }
}
