import { confirm } from './confirm.ts'
import { CliError, ExitCode } from './exit-codes.ts'
import { explainHttpFailure } from './http-errors.ts'
import { failureReason } from './network-errors.ts'
import type { HandlerContext } from './spec.ts'
import { requireToken } from './token.ts'

const REQUEST_TIMEOUT_MS = 30_000
const REDACTED = '[REDACTED]'

export const OUTCOME_UNKNOWN = 'The outcome is unknown; check the registration before retrying.'

export const apiUrl = (host: string, path: string): string => `https://${host}/test/idv/v1${path}`

export interface ApiRequest {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  /** Sentences for statuses whose meaning is endpoint-specific; passed to `explainHttpFailure`. */
  errors?: Partial<Record<number, string>>
  /** Shown before a write: `notice` on stderr, then `question` as a y/N prompt. */
  confirm?: { notice: string; question: string }
  /**
   * Opt-in for writes that are not safe to repeat. Redirects are not followed, so the body is never
   * resent to another URL, and any redirect ends the command with `outcomeUnknown`.
   */
  redirect?: 'manual'
  /** Replaces OUTCOME_UNKNOWN after a network failure that may have followed delivery, and after a redirect. */
  outcomeUnknown?: string
}

// One builder for both the real request and --dry-run, so the preview cannot drift from what is sent.
const buildHeaders = (token: string, hasBody: boolean): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  ...(hasBody && { 'Content-Type': 'application/json' }),
  Accept: 'application/json',
})

const printDryRun = (ctx: HandlerContext, url: string, request: ApiRequest): void => {
  const headers = Object.entries(buildHeaders(REDACTED, request.body !== undefined))
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n')
  const body = request.body === undefined ? '' : `\n${JSON.stringify(request.body, null, 2)}\n`
  ctx.io.stdout(`${request.method} ${url}\n${headers}\n${body}`)
}

// Errors raised before a connection exists: the server cannot have seen the request.
const NOT_SENT_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'UND_ERR_CONNECT_TIMEOUT',
])

/** Anything that is not clearly pre-connection is treated as possibly delivered, so a write is never retried blindly. */
export const networkFailure = (host: string, error: unknown, outcomeUnknown = OUTCOME_UNKNOWN): CliError => {
  const { codes, text } = failureReason(error)
  if (codes.some((code) => NOT_SENT_CODES.has(code))) {
    return new CliError(
      `Could not reach https://${host}: ${text}. Nothing was sent. Check the hostname and your network or VPN.`
    )
  }
  const timedOut = (error as Error).name === 'TimeoutError'
  const reason = timedOut ? `no response within ${REQUEST_TIMEOUT_MS / 1000}s` : text
  return new CliError(
    `The request to https://${host} failed after it may have been sent (${reason}). ${outcomeUnknown}`
  )
}

/** A body that is missing or not JSON reads as undefined, so callers treat it as an unknown outcome. */
export const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

const confirmWrite = async (ctx: HandlerContext, prompt: NonNullable<ApiRequest['confirm']>): Promise<void> => {
  ctx.io.stderr(`${prompt.notice}\n`)
  const answer = await confirm(ctx.io, prompt.question, ctx.flags.yes === true)
  if (answer === 'needs-yes') {
    throw new CliError('Not a terminal, so cannot ask for confirmation. Re-run with --yes.')
  }
  if (answer === 'declined') throw new CliError('Cancelled; nothing was sent.', ExitCode.cancelled)
}

// A gateway failure arrives after the request left, so the write may have been applied.
const GATEWAY_ERRORS = Object.fromEntries(
  [502, 503, 504].map((status) => [
    status,
    `IAS answered with status ${status} after the request was sent. ${OUTCOME_UNKNOWN}`,
  ])
)

// Node reports the real 3xx status for a manual redirect; browsers report an opaque response with status 0.
const isRedirect = (response: Response): boolean =>
  response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)

const dispatch = async (host: string, url: string, token: string, request: ApiRequest): Promise<Response> => {
  const outcomeUnknown = request.outcomeUnknown ?? OUTCOME_UNKNOWN
  let response: Response
  try {
    response = await fetch(url, {
      method: request.method,
      headers: buildHeaders(token, request.body !== undefined),
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(request.redirect && { redirect: request.redirect }),
    })
  } catch (error) {
    throw networkFailure(host, error, outcomeUnknown)
  }
  if (request.redirect === 'manual' && isRedirect(response)) {
    throw new CliError(`IAS answered with a redirect (status ${response.status}). ${outcomeUnknown}`)
  }
  return response
}

/** Dry-run, token, confirmation, request, error mapping, in that order. Resolves undefined for --dry-run. */
export const sendApiRequest = async (
  ctx: HandlerContext,
  host: string,
  request: ApiRequest
): Promise<Response | undefined> => {
  const url = apiUrl(host, request.path)
  if (ctx.flags['dry-run'] === true) {
    printDryRun(ctx, url, request)
    return undefined
  }

  const token = await requireToken(host, ctx.env)
  if (request.confirm) await confirmWrite(ctx, request.confirm)

  const response = await dispatch(host, url, token, request)

  if (!response.ok) {
    const { message, exitCode } = explainHttpFailure(
      { status: response.status, wwwAuthenticate: response.headers.get('www-authenticate') },
      { ...GATEWAY_ERRORS, ...request.errors }
    )
    throw new CliError(message, exitCode)
  }
  return response
}
