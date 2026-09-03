import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { TestUsers } from '../constants.js'
import { clearQueuedSubmission } from '../support/send-video-queue.js'

/**
 * Normalizes BIRTH_DATE to YYYY-MM-DD regardless of input format.
 * Accepts "19840913", "1984/09/13", or "1984-09-13".
 */
function normalizeBirthdate(value: string): string {
  const digits = value.replaceAll(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }
  return value
}

const loginModuleUrl = pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), '../../scripts/login.mjs')).href

/** Appium idles a session out at `newCommandTimeout` (180 s); a cheap command this often keeps it alive through Node-only work. */
const KEEPALIVE_INTERVAL_MS = 45_000

/** Default budget for a drain: generous for a full queue, well inside mocha's 600 s test/hook timeout. */
const DRAIN_TIMEOUT_MS = 150_000

export interface RegistrationDocument {
  typeId: string
  number: string
}

export type ApproveInPersonInput =
  | {
      flow: 'photo'
      cardSerialNumber: string
      cardBirthdate: string
    }
  | {
      flow: 'non-photo'
      cardSerialNumber: string
      cardBirthdate: string
      document: RegistrationDocument
    }
  | {
      flow: 'non-bcsc'
      documents: RegistrationDocument[]
    }

type ApproveInPersonLoginInput = ApproveInPersonInput extends infer T
  ? T extends { flow: infer F }
    ? T & { flow: F; userCode: string }
    : never
  : never

/** Who the claimed request must be for. Checked before any decision, and never guessed at. */
export interface SendVideoReviewIdentity {
  /** Guards the claim. A cardless registration has no card, and the portal shows 'N/A' for it. */
  cardSerialNumber: string
  /** The real guard for a cardless request, where every serial reads the same. */
  surname: string
  /** Also picks the identity match, on the flows where the portal asks for one. */
  firstName: string
  /** The submitting device's platform: the personas are shared, so the other platform's upload of the same person is foreign. */
  platform?: 'ios' | 'android'
}

export type SendVideoReviewInput =
  | ({
      decision: 'approve'
    } & SendVideoReviewIdentity)
  | ({
      decision: 'reject'
      /** Reason text the app shows the user on the cancelled-review screen — tests assert it verbatim. */
      verificationComment: string
      /** Internal portal note; defaults to verificationComment. */
      comment?: string
      /** Portal reject-reason id; defaults to '22' (additional person in photo or video). */
      typeReasonId?: string
    } & SendVideoReviewIdentity)

/** What the scripted review claimed and decided — for the journey's logs and its decision-timeout message. */
export interface ClaimedRequestSummary {
  requestIdentifier: string
  queue: 'cardholder' | 'cardless'
  claimedName: string
  claimedSerial: string
  /** "iOS 18.6" / "Android 15" as the portal renders it; '' when the page did not say. */
  claimedOs: string
  claimedAppVersion: string
  videoDate: string
}

/** 'all' rejects every queued request; 'e2e' only the journeys' personas, stopping at a foreign head. */
export type DrainScope = 'all' | 'e2e'

export interface DrainSendVideoQueueOptions {
  /** Defaults to E2E_QUEUE_DRAIN_SCOPE, else 'all'. */
  scope?: DrainScope
  maxClaims?: number
  /** The reason the portal records against each rejected request. */
  reason?: string
  /** Budget for the WHOLE drain — login plus ~5 round trips per queued request. */
  timeoutMs?: number
  /** Log in and read which queues hold work; claim nothing. */
  dryRun?: boolean
}

export interface DrainSendVideoQueueResult {
  rejected: ClaimedRequestSummary[]
  released: ClaimedRequestSummary[]
  /** Queues still showing a claim button when the drain ended ('cardholder' / 'cardless'). */
  queuesWithWork: ('cardholder' | 'cardless')[]
  /** Set when work was still queued: a foreign head under 'e2e', the claim cap, or a decision that did not stick. */
  stoppedReason?: string
}

type LoginModule = {
  approveInPersonLogin: (input: ApproveInPersonLoginInput, options?: { signal?: AbortSignal }) => Promise<void>
  reviewSendVideoLogin: (
    input: SendVideoReviewInput,
    options?: { signal?: AbortSignal; claimTimeoutMs?: number }
  ) => Promise<ClaimedRequestSummary>
  drainSendVideoQueue: (options: {
    scope: DrainScope
    personas: SendVideoReviewIdentity[]
    reason?: string
    maxClaims?: number
    dryRun?: boolean
    signal?: AbortSignal
  }) => Promise<DrainSendVideoQueueResult>
}

/** The SiteMinder/IDcheck script, loaded lazily so a journey only pays for it at the approval step. */
async function loadLoginModule(): Promise<LoginModule> {
  return (await import(loginModuleUrl)) as LoginModule
}

/** The submitting device's platform when this runs inside a wdio session; the CLI has none. */
function currentPlatform(): 'ios' | 'android' | undefined {
  if (typeof driver === 'undefined') return undefined
  return driver.isIOS ? 'ios' : 'android'
}

/** Run portal round trips without the Appium session idling out underneath them. */
async function withDriverKeepalive<T>(work: () => Promise<T>): Promise<T> {
  if (typeof driver === 'undefined') return work()
  const timer = setInterval(() => {
    driver.getWindowSize().catch(() => undefined)
  }, KEEPALIVE_INTERVAL_MS)
  try {
    return await work()
  } finally {
    clearInterval(timer)
  }
}

/**
 * Approve an in-person verification request by running the SM login flow in-process.
 *
 * Strips dashes/spaces from the formatted code (e.g. "PEDD-RJUW" → "PEDDRJUW")
 * before passing it to the script. For card-tap flows ('photo', 'non-photo') the
 * birthdate is normalized to YYYY-MM-DD on the way through.
 *
 * @param formattedCode - The confirmation code as displayed in the app (XXXX-XXXX)
 * @param input - Flow selector + per-flow inputs
 * @param timeoutMs - Budget for the WHOLE chain (~10 sequential SIT round trips), not per request — so a
 *   thin budget always expires on the last one, `approve`, whatever was actually slow. The per-step
 *   `[sm-login]` timings tell them apart.
 */
export async function approveInPersonRequest(
  formattedCode: string,
  input: ApproveInPersonInput,
  timeoutMs = 60_000
): Promise<void> {
  const code = formattedCode.replaceAll(/[\s-]/g, '')
  if (!/^[A-Za-z0-9]{8}$/.test(code)) {
    throw new Error('Invalid confirmation code: expected 8 alphanumeric characters (optionally formatted as XXXX-XXXX)')
  }
  console.log(`[approval] Approving in-person request (flow=${input.flow}) with code: ${code}`)

  const loginInput: ApproveInPersonLoginInput =
    input.flow === 'non-bcsc'
      ? { ...input, userCode: code }
      : { ...input, cardBirthdate: normalizeBirthdate(input.cardBirthdate), userCode: code }

  const { approveInPersonLogin } = await loadLoginModule()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    await approveInPersonLogin(loginInput, { signal: controller.signal })
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : String(error)
    // Our own abort surfaces from undici as a bare "This operation was aborted" — name it as OUR budget
    // so it is never mistaken for an SM rejection.
    const detail = controller.signal.aborted
      ? `the ${timeoutMs}ms budget for the whole SM chain ran out (see the per-step [sm-login] timings for where it went)`
      : message
    throw new Error(`In-person approval failed after ${elapsedMs}ms (flow=${input.flow}, code="${code}"): ${detail}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Review (approve or reject) a queued send-video verification request by running the SM login flow
 * in-process, and say which request that was.
 *
 * The portal's queue is a blind FIFO claim, so the script polls until the submission appears and
 * refuses to review one that is not for the expected person on the expected platform. It works for
 * every card type: the review form is echoed back as rendered, which covers the extra document and
 * name fields an added photo ID or a cardless registration brings, and the identity-match step a
 * cardless one inserts.
 *
 * @param input - Decision + who the request must be for (reject adds the reason fields)
 * @param timeoutMs - Budget for the WHOLE chain — dominated by the claim polling (up to 120s in the
 *   script) plus SM login and the decision round trips, so a thin budget expires mid-poll.
 */
export async function reviewSendVideoRequest(
  input: SendVideoReviewInput,
  timeoutMs = 180_000
): Promise<ClaimedRequestSummary> {
  const platform = input.platform ?? currentPlatform()
  console.log(
    `[approval] Reviewing send-video request (decision=${input.decision}, serial=${input.cardSerialNumber}, platform=${platform ?? 'any'})`
  )

  const { reviewSendVideoLogin } = await loadLoginModule()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const claimed = await withDriverKeepalive(() =>
      reviewSendVideoLogin({ ...input, platform }, { signal: controller.signal })
    )
    clearQueuedSubmission()
    console.log(
      `[approval] Decided ${claimed.queue} request ${claimed.requestIdentifier}: ${claimed.claimedName} ` +
        `(serial ${claimed.claimedSerial}, ${claimed.claimedOs || 'os unknown'})`
    )
    return claimed
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : String(error)
    // Our own abort surfaces from undici as a bare "This operation was aborted" — name it as OUR budget
    // so it is never mistaken for an SM rejection.
    const detail = controller.signal.aborted
      ? `the ${timeoutMs}ms budget for the whole SM chain ran out (see the per-step [sm-login] timings for where it went)`
      : message
    throw new Error(
      `Send-video ${input.decision} failed after ${elapsedMs}ms (serial=${input.cardSerialNumber}): ${detail}`
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

/** The personas the journeys submit as — what `scope: 'e2e'` keeps a drain to. */
export const E2E_SEND_VIDEO_PERSONAS: SendVideoReviewIdentity[] = Object.values(TestUsers).map((user) => ({
  cardSerialNumber: user.cardSerial,
  surname: user.lastName,
  firstName: user.firstName,
}))

/** The drain scope to use: an explicit one, else E2E_QUEUE_DRAIN_SCOPE, else 'all'. */
export function resolveDrainScope(scope?: DrainScope): DrainScope {
  if (scope) return scope
  const fromEnv = process.env.E2E_QUEUE_DRAIN_SCOPE
  if (fromEnv === 'all' || fromEnv === 'e2e') return fromEnv
  if (fromEnv) console.warn(`[queue] Unknown E2E_QUEUE_DRAIN_SCOPE "${fromEnv}" — draining with scope 'all'`)
  return 'all'
}

/**
 * Empty the SIT send-video review queue by rejecting whatever is queued, so the next upload is the
 * head the scripted review claims. The queue is shared with the UAT team and the other platform's
 * run, which is why the journeys never run send-video on two platforms at once, and why `scope`
 * exists: 'e2e' keeps a daytime run to the journeys' own personas.
 */
export async function drainSendVideoQueue(options: DrainSendVideoQueueOptions = {}): Promise<DrainSendVideoQueueResult> {
  const scope = resolveDrainScope(options.scope)
  const timeoutMs = options.timeoutMs ?? DRAIN_TIMEOUT_MS
  console.log(`[queue] ${options.dryRun ? 'Inspecting' : 'Draining'} the send-video review queue (scope=${scope})`)

  const { drainSendVideoQueue: drain } = await loadLoginModule()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const result = await withDriverKeepalive(() =>
      drain({
        scope,
        personas: E2E_SEND_VIDEO_PERSONAS,
        reason: options.reason,
        maxClaims: options.maxClaims,
        dryRun: options.dryRun,
        signal: controller.signal,
      })
    )
    const stopped = result.stoppedReason ? ` — ${result.stoppedReason}` : ''
    console.log(
      `[queue] Drained in ${Date.now() - startedAt}ms: ${result.rejected.length} rejected, ${result.released.length} released${stopped}`
    )
    return result
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : String(error)
    const detail = controller.signal.aborted
      ? `the ${timeoutMs}ms budget for the whole drain ran out (see the per-step [sm-login] timings for where it went)`
      : message
    throw new Error(`Queue drain failed after ${elapsedMs}ms (scope=${scope}): ${detail}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Markdown for a drain result — what the CI step summary and the CLI print. */
export function renderDrainSummary(result: DrainSendVideoQueueResult, scope: DrainScope): string {
  const lines = [`### Send-video review queue drain (scope: ${scope})`, '']
  const rows = [
    ...result.rejected.map((request) => ({ action: 'rejected', ...request })),
    ...result.released.map((request) => ({ action: 'released', ...request })),
  ]
  if (rows.length === 0) {
    lines.push(
      result.queuesWithWork.length === 0
        ? 'Queue already empty — nothing to do.'
        : `Nothing touched; work still queued in: ${result.queuesWithWork.join(', ')}.`
    )
  } else {
    lines.push(
      '| Action | Queue | Request | Name | Serial | Device | App | Video date |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |'
    )
    for (const row of rows) {
      lines.push(
        `| ${row.action} | ${row.queue} | ${row.requestIdentifier} | ${row.claimedName} | ${row.claimedSerial} | ` +
          `${row.claimedOs || '?'} | ${row.claimedAppVersion || '?'} | ${row.videoDate || '?'} |`
      )
    }
  }
  if (result.stoppedReason) {
    lines.push('', `⚠️ Stopped early: ${result.stoppedReason}`)
  }
  return lines.join('\n')
}
