import type { Platform } from './types.js'

/**
 * What proves what: the UAT checklist (and every other journey) mapped to the spec files and `it`
 * titles that stand for each row, per platform. The brief reads results through this map, and
 * `yarn brief:check` keeps it honest — a renamed checkpoint or an unmapped journey fails the check
 * instead of silently rendering as "not run".
 *
 * `tests` omitted = the whole suite proves the row. `suite` + `sources` are for the migration
 * orchestrator, whose three describes all report the orchestrator's file.
 */

/** How a row is proved on a platform: by automation, by hand, not applicable, or formally skipped for e2e. */
export type PlatformMode = 'auto' | 'manual' | 'na' | 'skipped'

export interface Proof {
  /** Spec path relative to e2e/. */
  file: string
  /** Exact describe title, when one file reports several suites. */
  suite?: string
  /** Exact `it` titles; omitted = every checkpoint in the suite. */
  tests?: string[]
  /** Where the titles live when `file` is an orchestrator that imports them. */
  sources?: string[]
}

export interface CoverageRow {
  id: string
  label: string
  proof: Proof[]
  platforms: Record<Platform, PlatformMode>
  note?: string
  /** Relative to e2e/ — the manual script or doc that carries the non-automated part. */
  link?: string
}

export interface CoverageSection {
  id: string
  title: string
  rows: CoverageRow[]
}

const spec = (path: string): string => `test/bcsc/${path}`
const both: Record<Platform, PlatformMode> = { ios: 'auto', android: 'auto' }
const manual: Record<Platform, PlatformMode> = { ios: 'manual', android: 'manual' }
const androidOnly: Record<Platform, PlatformMode> = { ios: 'na', android: 'auto' }

const IN_PERSON_COMPLETE = 'completes verification in person and lands on verified Home'
const SEND_VIDEO_APPROVED = 'is approved by the agent (scripted against the SIT review portal)'

/** The UAT checklist, row for row. */
export const UAT_CHECKLIST: CoverageSection[] = [
  {
    id: 'nav',
    title: 'Navigation stacks',
    rows: [
      {
        id: 'nav-onboarding',
        label: 'Onboarding',
        platforms: both,
        proof: [
          { file: spec('onboarding/onboarding.journey.ts') },
          { file: spec('onboarding/onboarding-detours.journey.ts') },
          { file: spec('onboarding/onboarding-permissions.journey.ts') },
        ],
      },
      {
        id: 'nav-verify',
        label: 'Verify',
        platforms: both,
        proof: [
          { file: spec('verify/verify-entry.journey.ts') },
          { file: spec('verify/verify-entry-detours.journey.ts') },
          { file: spec('verify/verify-resume.journey.ts') },
        ],
      },
      {
        id: 'nav-auth',
        label: 'Auth',
        platforms: both,
        proof: [{ file: spec('auth/auth-unlock.journey.ts') }, { file: spec('auth/auth-intro.journey.ts') }],
      },
      {
        id: 'nav-main',
        label: 'Main',
        platforms: both,
        proof: [{ file: spec('main/unverified-main.journey.ts') }, { file: spec('main/settings.journey.ts') }],
        note: '3 QR-rejection checkpoints are Sauce-only (skip locally)',
      },
      {
        id: 'nav-wallet',
        label: 'Wallet',
        platforms: both,
        proof: [{ file: spec('main/wallet.journey.ts') }],
        note: 'needs the Traction issuer; its before() fails without it',
      },
    ],
  },
  {
    id: 'photo',
    title: 'Photo card',
    rows: [
      {
        id: 'photo-in-person',
        label: 'In person',
        platforms: both,
        proof: [{ file: spec('verify/verified-photo.journey.ts'), tests: [IN_PERSON_COMPLETE] }],
      },
      {
        id: 'photo-send-video',
        label: 'Send video (approved + rejected)',
        platforms: both,
        proof: [
          {
            file: spec('verify/send-video-approved.journey.ts'),
            tests: ['records and uploads a send-video request', SEND_VIDEO_APPROVED],
          },
          {
            file: spec('verify/send-video-cancelled.journey.ts'),
            tests: ['is rejected by the agent, with a reason (scripted against the SIT review portal)'],
          },
        ],
      },
      {
        id: 'photo-video-call',
        label: 'Video call',
        platforms: manual,
        proof: [
          {
            file: spec('verify/verified-photo.journey.ts'),
            tests: ['browses the live-call detour (busy/closed or open) and backs out — passes day or night'],
          },
        ],
        note: 'approval act owned by UAT; automation browses the detour only',
      },
    ],
  },
  {
    id: 'non-photo',
    title: 'Non-photo card',
    rows: [
      {
        id: 'non-photo-in-person',
        label: 'In person',
        platforms: both,
        proof: [{ file: spec('verify/verified-non-photo.journey.ts'), tests: [IN_PERSON_COMPLETE] }],
      },
      {
        id: 'non-photo-send-video',
        label: 'Send video',
        platforms: both,
        proof: [{ file: spec('verify/send-video-non-photo.journey.ts') }],
      },
      { id: 'non-photo-video-call', label: 'Video call', platforms: manual, proof: [], note: 'approval act owned by UAT' },
    ],
  },
  {
    id: 'under-12',
    title: 'Under 12',
    rows: [
      {
        id: 'under-12-in-person',
        label: 'In person',
        platforms: both,
        proof: [
          {
            file: spec('verify/under-12.journey.ts'),
            tests: [
              'offers in-person only — the server withholds both video methods for a minor',
              IN_PERSON_COMPLETE,
              'blocks add-device behind the age restriction instead of the transfer QR',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'non-bcsc',
    title: 'Non-BCSC',
    rows: [
      {
        id: 'non-bcsc-in-person',
        label: 'In person',
        platforms: both,
        proof: [{ file: spec('verify/verified-non-bcsc.journey.ts'), tests: [IN_PERSON_COMPLETE] }],
      },
      { id: 'non-bcsc-in-person-video-call', label: 'In person via video call', platforms: manual, proof: [] },
      {
        id: 'non-bcsc-send-video',
        label: 'Send video',
        platforms: both,
        proof: [{ file: spec('verify/send-video-non-bcsc.journey.ts') }],
      },
      {
        id: 'non-bcsc-match-existing',
        label: 'Match to existing identity',
        platforms: both,
        proof: [
          {
            file: spec('verify/send-video-non-bcsc.journey.ts'),
            tests: ['is matched to an existing identity and approved (scripted against the SIT review portal)'],
          },
        ],
      },
      {
        id: 'non-bcsc-reroute-first-id',
        label: 'Re-route to BCSC on 1st ID',
        platforms: androidOnly,
        proof: [
          { file: spec('scan/reroute-photo-card.journey.ts') },
          { file: spec('scan/reroute-non-photo-card.journey.ts') },
          { file: spec('scan/reroute-combined-card.journey.ts') },
        ],
        note: 'Android + Sauce only: card barcodes need MLKit frame injection; iOS configs exclude scan/',
      },
      {
        id: 'non-bcsc-reroute-second-id',
        label: 'Re-route to BCSC on 2nd ID',
        platforms: androidOnly,
        proof: [{ file: spec('scan/reroute-second-id.journey.ts') }],
      },
      {
        id: 'non-bcsc-reroute-general-queue',
        label: 'Re-route to general queue',
        platforms: manual,
        proof: [],
        note: 'no journey asserts a general-queue landing — portal behaviour undiscovered',
      },
    ],
  },
  {
    id: 'features',
    title: 'Features',
    rows: [
      {
        id: 'feat-scan-qr',
        label: 'Scan BCSC barcode: QR',
        platforms: both,
        proof: [
          {
            file: spec('main/unverified-main.journey.ts'),
            tests: [
              'the scan FAB opens the ungated QR scanner',
              'an unrecognised QR raises the scan-error popup',
              'an OpenID credential-offer QR is deliberately rejected',
              'a mediator-invitation QR is deliberately rejected',
            ],
          },
          {
            file: spec('verify/verified-combined.journey.ts'),
            tests: ['verified: scans a pairing QR and lands on the service confirmation'],
          },
        ],
        note: 'rejections + pairing QR are Sauce-only',
      },
      {
        id: 'feat-scan-card-serial',
        label: 'Scan BCSC barcode: card serial',
        platforms: androidOnly,
        proof: [{ file: spec('scan/serial-scanner.journey.ts') }],
        note: 'unrecognised-code path only; happy path stays manual — the scanner reroutes on any value-less detection',
      },
      {
        id: 'feat-change-nickname',
        label: 'Change nickname',
        platforms: both,
        proof: [
          {
            file: spec('verify/verified-combined.journey.ts'),
            tests: ['verified: edits the account nickname and it persists on the profile card'],
          },
        ],
      },
      {
        id: 'feat-change-security',
        label: 'Change security method (biometrics)',
        platforms: { ios: 'skipped', android: 'skipped' },
        proof: [],
        note: 'skipped for e2e 2026-08-28 — device biometrics owned by the UAT team',
      },
      {
        id: 'feat-change-pin',
        label: 'Change PIN',
        platforms: both,
        proof: [
          {
            file: spec('main/settings.journey.ts'),
            tests: ['changes the PIN, exercising the wrong-current, mismatch and checkbox-gate errors'],
          },
        ],
      },
      {
        id: 'feat-forget-pairings',
        label: 'Forget pairings',
        platforms: both,
        proof: [{ file: spec('verify/verified-combined.journey.ts'), tests: ['verified: forgets all device pairings'] }],
      },
      {
        id: 'feat-bookmark-access',
        label: 'Access service from bookmark',
        platforms: both,
        proof: [
          {
            file: spec('verify/verified-combined.journey.ts'),
            tests: [
              'logs in from a computer with a minted pairing code and bookmarks the service',
              'sorts the bookmarked service to the top of the catalogue and search-filters it',
            ],
          },
        ],
        note: "sort/filter skips when SIT's catalogue lacks the demo RP",
      },
      {
        id: 'feat-listing-login',
        label: 'Log in from in-app service listing',
        platforms: both,
        proof: [
          {
            file: spec('verify/verified-combined.journey.ts'),
            tests: [
              'logs in to the known catalogue service, covering whichever ServiceLogin branch it renders',
              'covers the other ServiceLogin branch from another catalogue service',
            ],
          },
        ],
        note: 'other-branch probe always skips on iOS (flattened catalogue ids)',
      },
      {
        id: 'feat-info-links',
        label: 'Information links (Help, Privacy, Contact Us, Feedback, Accessibility, Terms)',
        platforms: both,
        proof: [
          {
            file: spec('main/settings.journey.ts'),
            tests: [
              'opens the Help Centre webview and returns',
              'opens Privacy and returns',
              'opens the Contact Us webview and returns',
              'opens the external Feedback, Accessibility and Terms links and returns',
            ],
          },
        ],
      },
      {
        id: 'feat-sign-out-in',
        label: 'Sign out / in',
        platforms: { ios: 'na', android: 'na' },
        proof: [
          {
            file: spec('main/settings.journey.ts'),
            tests: ['auto-locks after the inactivity timeout and re-unlocks with the changed PIN'],
          },
          {
            file: spec('auth/auth-unlock.journey.ts'),
            tests: ['locks on return from a long background and re-unlocks with the PIN (terminal)'],
          },
        ],
        note: 'no such feature in v4; lock is inactivity/background driven — nearest checkpoints shown',
      },
      {
        id: 'feat-login-tile',
        label: 'Log in using tile (deep link)',
        platforms: both,
        proof: [
          {
            file: spec('verify/verified-combined.journey.ts'),
            tests: ['logs in via a warm deep link and returns home', 'logs in via a cold deep link after re-authenticating'],
          },
        ],
      },
      {
        id: 'feat-manage-devices',
        label: 'Manage devices',
        platforms: both,
        proof: [
          {
            file: spec('verify/verified-combined.journey.ts'),
            tests: [
              'verified: opens Manage Devices (in-app webview) from Settings',
              'shows the account-transfer QR to add another device',
            ],
          },
        ],
      },
      {
        id: 'feat-account-details',
        label: 'Account details',
        platforms: both,
        proof: [
          {
            file: spec('verify/verified-combined.journey.ts'),
            tests: ['verified: opens Account Details and shows the account fields'],
          },
        ],
      },
      {
        id: 'feat-remove-account',
        label: 'Remove account',
        platforms: both,
        proof: [
          {
            file: spec('main/settings.journey.ts'),
            tests: [
              'shows the Remove Account confirmation and cancels',
              'removes the account (terminal) and returns to onboarding',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'external',
    title: 'External',
    rows: [
      {
        id: 'ext-upgrade-prev',
        label: 'Upgrade from previous release',
        platforms: both,
        proof: [{ file: spec('upgrade/upgrade.spec.ts') }],
        note: 'lane exits early with a notice until BCSC-prev.* exists in Sauce storage → shows not run',
      },
      {
        id: 'ext-upgrade-403',
        label: 'Upgrade from 4.0.3',
        platforms: both,
        proof: [{ file: spec('upgrade/upgrade-from-v403.spec.ts') }],
      },
      {
        id: 'ext-migration-v3',
        label: 'Migration v3 → v4',
        platforms: androidOnly,
        proof: [
          {
            file: spec('migration/migration.spec.ts'),
            sources: [
              spec('migration/v3-onboarding.spec.ts'),
              spec('migration/upgrade.spec.ts'),
              spec('migration/v4-unlock.spec.ts'),
            ],
          },
        ],
        note: 'nightly runs it on Android only',
      },
    ],
  },
  {
    id: 'a11y',
    title: 'Accessibility',
    rows: [
      {
        id: 'a11y-automated',
        label: 'Automated audit (iOS: Apple audit engine · Android: heuristics)',
        platforms: both,
        proof: [{ file: spec('a11y/accessibility.journey.ts'), tests: ['reports the accessibility audit roll-up'] }],
        note: 'advisory; the roll-up fails only if the engine could not run — findings below',
      },
      {
        id: 'a11y-screen-reader',
        label: 'Screen-reader pass (VoiceOver / TalkBack)',
        platforms: manual,
        proof: [],
      },
    ],
  },
]

/** One row per journey/spec, so a file that stops running is visible even when no UAT row names it. */
export const OTHER_COVERAGE: CoverageSection[] = [
  {
    id: 'journeys',
    title: 'Journeys',
    rows: [
      { id: 'j-smoke', label: 'Smoke: launch + onboarding entry', platforms: both, proof: [{ file: spec('smoke.spec.ts') }] },
      { id: 'j-onboarding-happy', label: 'Onboarding: happy path', platforms: both, proof: [{ file: spec('onboarding/onboarding.journey.ts') }] },
      { id: 'j-onboarding-detours', label: 'Onboarding: detours', platforms: both, proof: [{ file: spec('onboarding/onboarding-detours.journey.ts') }] },
      { id: 'j-onboarding-permissions', label: 'Onboarding: notification permission granted', platforms: both, proof: [{ file: spec('onboarding/onboarding-permissions.journey.ts') }] },
      { id: 'j-auth-unlock', label: 'Auth: unlock', platforms: both, proof: [{ file: spec('auth/auth-unlock.journey.ts') }] },
      { id: 'j-auth-intro', label: 'Auth: returning-user intro', platforms: both, proof: [{ file: spec('auth/auth-intro.journey.ts') }] },
      { id: 'j-verify-entry', label: 'Verify: entry spine', platforms: both, proof: [{ file: spec('verify/verify-entry.journey.ts') }] },
      { id: 'j-verify-detours', label: 'Verify: entry detours', platforms: both, proof: [{ file: spec('verify/verify-entry-detours.journey.ts') }] },
      { id: 'j-verify-resume', label: 'Verify: resume routing', platforms: both, proof: [{ file: spec('verify/verify-resume.journey.ts') }] },
      { id: 'j-verified-photo', label: 'Verified: photo card', platforms: both, proof: [{ file: spec('verify/verified-photo.journey.ts') }] },
      { id: 'j-verified-non-photo', label: 'Verified: non-photo card', platforms: both, proof: [{ file: spec('verify/verified-non-photo.journey.ts') }] },
      { id: 'j-verified-combined', label: 'Verified: combined card', platforms: both, proof: [{ file: spec('verify/verified-combined.journey.ts') }] },
      { id: 'j-verified-non-bcsc', label: 'Verified: non-BCSC', platforms: both, proof: [{ file: spec('verify/verified-non-bcsc.journey.ts') }] },
      { id: 'j-under-12', label: 'Verified: under-12 account', platforms: both, proof: [{ file: spec('verify/under-12.journey.ts') }] },
      { id: 'j-send-video-approved', label: 'Send video: approved', platforms: both, proof: [{ file: spec('verify/send-video-approved.journey.ts') }] },
      { id: 'j-send-video-cancelled', label: 'Send video: rejected', platforms: both, proof: [{ file: spec('verify/send-video-cancelled.journey.ts') }] },
      { id: 'j-send-video-non-photo', label: 'Send video: non-photo card', platforms: both, proof: [{ file: spec('verify/send-video-non-photo.journey.ts') }] },
      { id: 'j-send-video-non-bcsc', label: 'Send video: non-BCSC', platforms: both, proof: [{ file: spec('verify/send-video-non-bcsc.journey.ts') }] },
      { id: 'j-video-call', label: 'Verify: video call to the approval boundary', platforms: both, proof: [{ file: spec('verify/video-call.journey.ts') }] },
      { id: 'j-unverified-main', label: 'Main: unverified gating', platforms: both, proof: [{ file: spec('main/unverified-main.journey.ts') }] },
      { id: 'j-settings', label: 'Main: settings', platforms: both, proof: [{ file: spec('main/settings.journey.ts') }] },
      { id: 'j-wallet', label: 'Wallet: DIDComm credential lifecycle', platforms: both, proof: [{ file: spec('main/wallet.journey.ts') }] },
      { id: 'j-a11y', label: 'Accessibility: automated audits', platforms: both, proof: [{ file: spec('a11y/accessibility.journey.ts') }] },
    ],
  },
  {
    id: 'scan',
    title: 'Card-barcode scanning (Android + Sauce only)',
    rows: [
      { id: 'j-scan-reroute-photo', label: 'Scan: reroute to a photo card', platforms: androidOnly, proof: [{ file: spec('scan/reroute-photo-card.journey.ts') }] },
      { id: 'j-scan-reroute-non-photo', label: 'Scan: reroute to a non-photo card', platforms: androidOnly, proof: [{ file: spec('scan/reroute-non-photo-card.journey.ts') }] },
      { id: 'j-scan-reroute-combined', label: 'Scan: reroute to a combined card', platforms: androidOnly, proof: [{ file: spec('scan/reroute-combined-card.journey.ts') }] },
      { id: 'j-scan-reroute-second-id', label: 'Scan: reroute on the second ID', platforms: androidOnly, proof: [{ file: spec('scan/reroute-second-id.journey.ts') }] },
      { id: 'j-scan-serial', label: 'Scan: unrecognised barcode at the serial scanner', platforms: androidOnly, proof: [{ file: spec('scan/serial-scanner.journey.ts') }] },
    ],
  },
  {
    id: 'upgrades',
    title: 'Upgrades (separate lanes)',
    rows: [
      { id: 'j-upgrade', label: 'Upgrade from previous release', platforms: both, proof: [{ file: spec('upgrade/upgrade.spec.ts') }] },
      { id: 'j-upgrade-403', label: 'Upgrade from 4.0.3', platforms: both, proof: [{ file: spec('upgrade/upgrade-from-v403.spec.ts') }] },
      {
        id: 'j-migration-v3-add-card',
        label: 'Migration: v3 add card',
        platforms: androidOnly,
        proof: [{ file: spec('migration/migration.spec.ts'), suite: 'V3 Add Card', sources: [spec('migration/v3-onboarding.spec.ts')] }],
      },
      {
        id: 'j-migration-upgrade',
        label: 'Migration: upgrade v3 → v4',
        platforms: androidOnly,
        proof: [{ file: spec('migration/migration.spec.ts'), suite: 'Upgrade v3 → v4', sources: [spec('migration/upgrade.spec.ts')] }],
      },
      {
        id: 'j-migration-v4-unlock',
        label: 'Migration: v4 unlock',
        platforms: androidOnly,
        proof: [{ file: spec('migration/migration.spec.ts'), suite: 'V4 Unlock After Migration', sources: [spec('migration/v4-unlock.spec.ts')] }],
      },
    ],
  },
]
