import { contextHost } from './config.ts'
import { CliError, ExitCode } from './exit-codes.ts'
import { OUTCOME_UNKNOWN, readJson, sendApiRequest } from './request.ts'
import type { HandlerContext } from './spec.ts'

const MAX_TEXT_LENGTH = 500
const CHANNELS = ['counter', 'live-video', 'send-video']
const UNIMPLEMENTED_CHANNELS = new Set(['live-video', 'send-video'])

const DECISION_ERRORS = {
  400: 'IAS rejected the decision. It accepts one only for a usercode whose registration is still waiting for a decision (registration Requested, credential Pending), has not expired, and has a CSN that resolves to an identity. An unknown or already-decided usercode gets the same answer.',
  404: 'No verification endpoint at this URL. The test API is deployed on dev only; check --hostname.',
}

const checkChannel = (flag: string | boolean | undefined): void => {
  const channel = typeof flag === 'string' ? flag : 'counter'
  if (UNIMPLEMENTED_CHANNELS.has(channel)) {
    throw new CliError(
      `The ${channel} channel is not implemented on the IAS test API; only counter is. Nothing was sent. Drop --channel or use --channel counter.`
    )
  }
  if (!CHANNELS.includes(channel)) {
    throw new CliError(`Unknown channel "${channel}". Choose one of: ${CHANNELS.join(', ')}.`)
  }
}

const requiredText = (ctx: HandlerContext, flag: string): string => {
  const value = ctx.flags[flag]
  if (typeof value !== 'string' || !value.trim()) throw new CliError(`--${flag} is required.`)
  if (value.length > MAX_TEXT_LENGTH) throw new CliError(`--${flag} must be at most ${MAX_TEXT_LENGTH} characters.`)
  return value
}

// Only a 200 carrying the expected status proves the decision was recorded; anything else is ambiguous.
const confirmDecision = async (response: Response, expected: 'VERIFIED' | 'DECLINED'): Promise<void> => {
  const body = await readJson(response)
  const status = (body as { status?: unknown } | undefined)?.status
  if (response.status !== 200 || status !== expected)
    throw new CliError(`IAS answered unexpectedly. ${OUTCOME_UNKNOWN}`)
}

const decisionPath = (usercode: string): string => `/verifications/${encodeURIComponent(usercode)}/decision`

export const approve = async (ctx: HandlerContext): Promise<number> => {
  checkChannel(ctx.flags.channel)
  const host = contextHost(ctx)
  const usercode = ctx.args.usercode
  const response = await sendApiRequest(ctx, host, {
    method: 'POST',
    path: decisionPath(usercode),
    body: { channel: 'COUNTER', decision: 'APPROVE' },
    errors: DECISION_ERRORS,
    confirm: {
      notice:
        'This approval is recorded as a counter visit: the registration type becomes Counter, whatever channel the device used.',
      question: `Approve ${usercode} on ${host}?`,
    },
  })
  if (response) {
    await confirmDecision(response, 'VERIFIED')
    ctx.io.stdout(`Approved ${usercode} on ${host}.\n`)
  }
  return ExitCode.ok
}

export const decline = async (ctx: HandlerContext): Promise<number> => {
  const userMessage = requiredText(ctx, 'user-message')
  const internalComment = requiredText(ctx, 'internal-comment')
  const host = contextHost(ctx)
  const usercode = ctx.args.usercode
  const response = await sendApiRequest(ctx, host, {
    method: 'POST',
    path: decisionPath(usercode),
    body: { channel: 'COUNTER', decision: 'DECLINE', userMessage, internalComment },
    errors: DECISION_ERRORS,
  })
  if (response) {
    await confirmDecision(response, 'DECLINED')
    ctx.io.stdout(`Declined ${usercode} on ${host}.\n`)
  }
  return ExitCode.ok
}
