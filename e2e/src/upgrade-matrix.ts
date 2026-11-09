import type { Lineage } from './flows/prev-build/sources.js'

/**
 * The upgrade matrix: every state an account can be in when the app updates, the wrapper spec that
 * proves the state survives, and which lineages can arrange it on the previous build. It has two
 * readers, so a path exists in one place or not at all: the upgrade suites in
 * configs/wdio.shared.conf.ts schedule the booted lineage's specs from it, and the weekly upgrade
 * brief (src/brief/upgrade-map.ts) renders one row per path and version from it — a lineage with no
 * spec for a path reads as n/a with the reason, never as "not run". `yarn brief:check` verifies every
 * spec and scenario named here exists and that every state has a spec on every lineage.
 *
 * Lineages (src/flows/prev-build/sources.ts): `v3` = 3.x (native selectors, in-person only),
 * `v403` = 4.0.x (the frozen pre-rework walks), `current` = 4.1.0 and later (today's DSL).
 */

export type UpgradeState = 'partial' | 'submitted' | 'approved' | 'verified'

export interface UpgradeStateInfo {
  id: UpgradeState
  /** The wdio suite (`--suite`) and the workflow job that run the state's specs. */
  suite: string
  /** The brief's section title. */
  title: string
  description: string
}

export const UPGRADE_STATES: readonly UpgradeStateInfo[] = [
  {
    id: 'partial',
    suite: 'upgradePartial',
    title: 'Partial',
    description: 'nothing submitted: an unverified account, a saved serial, a captured document, partial non-BCSC progress',
  },
  { id: 'submitted', suite: 'upgradeSubmitted', title: 'Submitted', description: 'a request the server holds but has not decided' },
  {
    id: 'approved',
    suite: 'upgradeApproved',
    title: 'Approved, not finished in-app',
    description: 'the decision landed while the app was closed, and the update came before the user reopened it',
  },
  { id: 'verified', suite: 'upgradeVerified', title: 'Completed', description: 'a verified account with its device credential' },
]

export interface UpgradePath {
  id: string
  state: UpgradeState
  label: string
  /** The wrapper spec under test/bcsc/upgrade/ (without `.spec.ts`), per lineage that can arrange the state. */
  spec: Partial<Record<Lineage, string>>
  /** The scenario module holding the wrapper's checkpoints (`scenarios/<name>.scenario.ts`); absent for a self-contained spec. */
  scenario?: string
  /** Why a lineage has no spec — rendered in that version's row. */
  unsupported?: Partial<Record<Lineage, string>>
  /** Rendered beside every version's row. */
  note?: string
}

const everyLineage = (spec: string): Record<Lineage, string> => ({ v3: spec, v403: spec, current: spec })

const V3_NO_RESUME = "not representable from v3: the current build never reads v3's typed-serial file, and a migrant's captured document is re-asked and cleaned up"
const V3_NO_SEND_VIDEO = 'v3 has no send-video selectors (in-person is its only path)'
const V3_NO_NON_BCSC = 'v3 has no non-BCSC selectors'
const V403_NO_SEND_VIDEO = 'no frozen 4.0.3 send-video walk'
const V403_NO_NON_BCSC = 'no frozen 4.0.3 non-BCSC walk'

export const UPGRADE_PATHS: readonly UpgradePath[] = [
  {
    id: 'unverified',
    state: 'partial',
    label: 'Unverified account: PIN and settings survive',
    spec: { current: 'upgrade-unverified', v403: 'upgrade-unverified-v403', v3: 'upgrade-unverified-v3' },
    note: 'one spec per lineage (the screens differ); from v3 the account survives and verification can start',
  },
  {
    id: 'resume-serial',
    state: 'partial',
    label: 'Saved card serial survives',
    spec: { current: 'upgrade-resume-serial', v403: 'upgrade-resume-serial' },
    scenario: 'resume-serial',
    unsupported: { v3: V3_NO_RESUME },
  },
  {
    id: 'resume-capture',
    state: 'partial',
    label: 'Captured document awaiting its number survives',
    spec: { current: 'upgrade-resume-capture', v403: 'upgrade-resume-capture' },
    scenario: 'resume-capture',
    unsupported: { v3: V3_NO_RESUME },
  },
  {
    id: 'non-bcsc-partial',
    state: 'partial',
    label: 'Partial non-BCSC progress survives',
    spec: { current: 'upgrade-non-bcsc-partial' },
    scenario: 'non-bcsc-partial',
    unsupported: { v403: V403_NO_NON_BCSC, v3: V3_NO_NON_BCSC },
    note: 'resume assert only until the non-BCSC counter approval works',
  },
  {
    id: 'in-person-pending',
    state: 'submitted',
    label: 'Unapproved in-person request survives',
    spec: everyLineage('upgrade-in-person-pending'),
    scenario: 'in-person-pending',
  },
  {
    id: 'send-video-pending',
    state: 'submitted',
    label: 'Pending send-video review survives',
    spec: { current: 'upgrade-send-video-pending' },
    scenario: 'send-video-pending',
    unsupported: { v403: V403_NO_SEND_VIDEO, v3: V3_NO_SEND_VIDEO },
    note: 'Android injection-off lane; the review queue is drained first',
  },
  {
    id: 'in-person-approved',
    state: 'approved',
    label: 'In-person request approved while the app was closed',
    spec: everyLineage('upgrade-in-person-approved'),
    scenario: 'in-person-approved',
  },
  {
    id: 'send-video-approved',
    state: 'approved',
    label: 'Send-video review approved while the app was closed',
    spec: { current: 'upgrade-send-video-approved' },
    scenario: 'send-video-approved',
    unsupported: { v403: V403_NO_SEND_VIDEO, v3: V3_NO_SEND_VIDEO },
    note: 'Android injection-off lane; the review queue is drained first',
  },
  {
    id: 'verified',
    state: 'verified',
    label: 'Verified account and device credential survive',
    spec: everyLineage('upgrade-verified'),
    scenario: 'verified',
    note: 'a pairing-code login proves the credential server-side',
  },
]

/** The wrapper specs of one state: the lineage's, or every lineage's when none is given — deduplicated, in matrix order. */
export function upgradeSpecsFor(state: UpgradeState, lineage?: Lineage): string[] {
  const names = UPGRADE_PATHS.filter((path) => path.state === state).flatMap((path) => {
    if (!lineage) return Object.values(path.spec)
    const spec = path.spec[lineage]
    return spec ? [spec] : []
  })
  return [...new Set(names)]
}
