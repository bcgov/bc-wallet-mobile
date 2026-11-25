/**
 * Who plays the agent for each verification channel while the suite moves off the ID Check portal
 * onto the IAS test API (src/api/ias-test.ts). A channel's row turns to `api` once IAS serves its
 * decision on SIT, and the journey's holder follows it (`arrangeTestUser` in ./identity.ts). When no
 * row is left on `idcheck`, the portal code and its CI go. See "Card holders and approvals" in the README.
 */
import type { TestUser } from '../constants.js'

/** Who plays the agent: the IDCheck portal replay, or the IAS test API. */
export type ApprovalSource = 'api' | 'idcheck'

/** The ways a journey asks an agent for a decision. A live video call has none to script. */
export type DecisionChannel = 'counter' | 'send-video'

/** The route table: a row turns to `api` once IAS serves that channel's decision on SIT. */
export const APPROVAL_ROUTES: Readonly<Record<DecisionChannel, ApprovalSource>> = {
  // COUNTER decisions: SIT answers every one with a 500 since IAS 4.7.0; DEV decides them.
  counter: 'idcheck',
  // SEND_VIDEO decisions: still 501 on every host.
  'send-video': 'idcheck',
}

/**
 * E2E_APPROVAL_SOURCE, for a local run: `api` puts every channel on the API, `idcheck` puts every
 * channel on the portal with the personas (the suite before the move). Unset, the table decides; CI
 * never sets it.
 */
export function approvalOverride(): ApprovalSource | undefined {
  const value = process.env.E2E_APPROVAL_SOURCE?.trim().toLowerCase()
  if (!value) return undefined
  if (value === 'api' || value === 'idcheck') return value
  throw new Error('Unknown E2E_APPROVAL_SOURCE: use api or idcheck, or leave it unset')
}

/** Who decides a request on this channel. The test API refuses a registration without a card. */
export function approvalSourceFor(channel: DecisionChannel, flow: TestUser['flow']): ApprovalSource {
  const source = approvalOverride() ?? APPROVAL_ROUTES[channel]
  return flow === 'non-bcsc' ? 'idcheck' : source
}

/** Whether journeys mint their holders: from the first channel on the API, so holders and decisions move together. */
export function mintsHolders(): boolean {
  const override = approvalOverride()
  if (override) return override === 'api'
  return Object.values(APPROVAL_ROUTES).includes('api')
}
