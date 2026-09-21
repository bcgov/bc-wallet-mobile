import type { TestUser } from '../../constants.js'

/** The persona shape the non-BCSC arranges need (document numbers, no card). */
export type NonBcscTestUser = Extract<TestUser, { flow: 'non-bcsc' }>

/**
 * The previous build an upgrade scenario arranges state on. Only that half of an upgrade is
 * version-specific — after the swap every assertion is today's DSL — so each supported previous
 * release implements the arranges its screens can drive, each ending where its scenario expects
 * (the build's method selection, its resting screen, or a specific mid-step screen). A scenario a
 * lineage cannot arrange has no wrapper spec for it, so nothing skips at runtime.
 */
export interface PrevBuild {
  /** Names the build in annotations, e.g. 'previous release', '4.0.3', 'v3'. */
  readonly label: string
  /** The PIN created on this build and used to unlock the current one after the swap. */
  readonly pin: string
  /** The BCSC-card persona this build's driver is proven with. */
  readonly bcscUser: TestUser
  readonly nonBcscUser?: NonBcscTestUser
  /** Row-id substrings for the two non-BCSC documents (4.0.3 keys the rows by label, today by type). */
  readonly nonBcscDocs?: { readonly first: string; readonly second: string }

  /** Cold start → this build's unverified resting state, with `pin` created. */
  onboard(pin: string, user: TestUser): Promise<void>
  /** Resting state → serial + birthdate submitted (device authorized) → this build's method selection. */
  authorize(user: TestUser): Promise<void>
  /** Method selection → In person → the displayed XXXX-XXXX code, NOT approved. */
  showInPersonCode(): Promise<string>
  /** Approve `code` in IDCheck, Complete → this build's verified Home. */
  approveAndComplete(user: TestUser, code: string): Promise<void>

  /** Resting state → serial typed, stopping ON the birthdate step (serial persisted, card not authorized). */
  enterSerial?(user: TestUser): Promise<void>
  /** Method selection → selfie + recording submitted → this build's resting state. */
  submitSendVideo?(user: TestUser): Promise<void>
  /** Resting state → the first non-BCSC document photographed, stopping ON its number form. */
  captureFirstDocumentOnly?(user: NonBcscTestUser, docMatch: string): Promise<void>
  /** Resting state → two documents + address + verified email → this build's method selection. */
  arrangeNonBcscPartial?(user: NonBcscTestUser, docs: { first: string; second: string }): Promise<void>
}

type OptionalArrange = 'enterSerial' | 'submitSendVideo' | 'captureFirstDocumentOnly' | 'arrangeNonBcscPartial'

/** An optional arrange, bound — or a named error, so a wrapper on the wrong lineage fails at its first step. */
export function capability<K extends OptionalArrange>(prev: PrevBuild, name: K): NonNullable<PrevBuild[K]> {
  const arrange = prev[name]
  if (!arrange) {
    throw new Error(`The ${prev.label} build has no driver for "${name}"`)
  }
  return arrange.bind(prev) as NonNullable<PrevBuild[K]>
}

/** The non-BCSC persona a driver carries, or a named error for a lineage without one. */
export function nonBcscUserOf(prev: PrevBuild): NonBcscTestUser {
  if (!prev.nonBcscUser) {
    throw new Error(`The ${prev.label} build has no non-BCSC persona`)
  }
  return prev.nonBcscUser
}

/** The two non-BCSC document row matches a driver carries, or a named error. */
export function nonBcscDocsOf(prev: PrevBuild): { readonly first: string; readonly second: string } {
  if (!prev.nonBcscDocs) {
    throw new Error(`The ${prev.label} build has no non-BCSC document rows`)
  }
  return prev.nonBcscDocs
}
