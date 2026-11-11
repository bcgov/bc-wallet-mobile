import type { Lineage, UpgradeSource } from '../flows/prev-build/sources.js'
import { UPGRADE_PATHS, UPGRADE_STATES, type UpgradePath } from '../upgrade-matrix.js'
import type { CoverageRow, CoverageSection, PlatformMode, Proof } from './coverage-map.js'
import type { Platform } from './types.js'

/**
 * The upgrade matrix (src/upgrade-matrix.ts) → coverage sections per version, for the weekly upgrade
 * brief. One section per state, one row per path; a cell is n/a when the version never shipped on the
 * platform or its lineage cannot arrange the path (the matrix says why), so "not run" is reserved for
 * a run that produced no result.
 */

export const LINEAGES: readonly Lineage[] = ['v3', 'v403', 'current']

export const LINEAGE_LABEL: Record<Lineage, string> = {
  v3: 'v3 lineage (native selectors)',
  v403: '4.0.x lineage (frozen walks)',
  current: '4.1.x lineage (current DSL)',
}

/** What the sections need to know about a version: the manifest entry, or the lineage alone for a check. */
export type UpgradeVersion = Pick<UpgradeSource, 'version' | 'lineage' | 'platforms'>

const upgradeFile = (name: string): string => `test/bcsc/upgrade/${name}`

/** The proof of a path on a lineage: the wrapper spec, its titles read from the scenario module when it has one. */
export function upgradeProof(path: UpgradePath, lineage: Lineage): Proof | undefined {
  const wrapper = path.spec[lineage]
  if (!wrapper) return undefined
  const file = upgradeFile(`${wrapper}.spec.ts`)
  return path.scenario ? { file, sources: [upgradeFile(`scenarios/${path.scenario}.scenario.ts`)] } : { file }
}

/** Every proof the matrix names, across lineages — what the title lookup and the map checks index. */
export function allUpgradeProofs(): Proof[] {
  return UPGRADE_PATHS.flatMap((path) => LINEAGES.map((lineage) => upgradeProof(path, lineage))).filter(
    (proof): proof is Proof => proof !== undefined
  )
}

function upgradeRow(source: UpgradeVersion, path: UpgradePath): CoverageRow {
  const proof = upgradeProof(path, source.lineage)
  const mode = (platform: Platform): PlatformMode => (proof && source.platforms.includes(platform) ? 'auto' : 'na')
  const reason = proof ? undefined : (path.unsupported?.[source.lineage] ?? `no ${source.lineage} spec`)
  const note = [path.note, reason].filter(Boolean).join(' · ')
  return {
    id: `upgrade-${source.version}-${path.id}`,
    label: path.label,
    proof: proof ? [proof] : [],
    platforms: { ios: mode('ios'), android: mode('android') },
    ...(note && { note }),
  }
}

/** One section per state for a version, every path a row; ids are `upgrade-<version>-<path>`. */
export function upgradeSections(source: UpgradeVersion): CoverageSection[] {
  return UPGRADE_STATES.map((state) => ({
    id: `upgrade-${source.version}-${state.id}`,
    title: state.title,
    rows: UPGRADE_PATHS.filter((path) => path.state === state.id).map((path) => upgradeRow(source, path)),
  }))
}
