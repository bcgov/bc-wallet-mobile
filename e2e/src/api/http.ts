/**
 * Shared HTTP core for the e2e support-API layer (see "Runner-side API clients" in ../../README.md).
 *
 * Every runner-driven API client goes through these two primitives so failures read the same way
 * everywhere: a non-2xx is an {@link ApiError} carrying the status + a body snippet, no response is
 * an {@link ApiTransportError}, and OUR OWN timeout is named as a budget — never mistakable for a
 * server rejection (the same convention as `helpers/approval.ts`).
 */

/** A non-2xx response, with enough context to diagnose from a CI log alone. */
export class ApiError extends Error {
  constructor(
    readonly method: string,
    readonly url: string,
    readonly status: number,
    readonly bodySnippet: string
  ) {
    super(`${method} ${url} → ${status}: ${bodySnippet || '(empty body)'}`)
    this.name = 'ApiError'
  }
}

/** No response at all: our own request budget ran out, or the transport failed. */
export class ApiTransportError extends Error {
  constructor(
    readonly method: string,
    readonly url: string,
    /** What happened, without the URL (`after 10004ms: fetch failed (UND_ERR_CONNECT_TIMEOUT)`). */
    readonly detail: string,
    /** The socket error's code, when the transport named one. */
    readonly code?: string
  ) {
    super(`${method} ${url} failed ${detail}`)
    this.name = 'ApiTransportError'
  }
}

/** A caught `unknown` as a readable string — its `Error.message`, or the value itself. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Undici's bare "fetch failed" keeps the socket error on `cause`. */
function transportErrorCode(error: unknown): string | undefined {
  const code = (error as { cause?: { code?: unknown } } | undefined)?.cause?.code
  return typeof code === 'string' ? code : undefined
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** JSON-serialized when provided; a `URLSearchParams` is sent as a form instead. */
  body?: unknown
  headers?: Record<string, string>
  timeoutMs?: number
  /** Statuses to return (as parsed JSON or undefined) instead of throwing — for lookup-style calls
   *  where a 404 is an answer, not an error. */
  allowStatuses?: number[]
}

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000

/**
 * `fetch` with a per-request abort budget and typed errors. Returns the parsed JSON body
 * (`undefined` for an empty or non-JSON body).
 */
export async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, allowStatuses = [] } = options
  // fetch labels a URLSearchParams body as a form itself.
  const form = body instanceof URLSearchParams ? body : undefined
  const json = body === undefined || form ? undefined : JSON.stringify(body)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: { ...(json === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
      body: form ?? json,
      signal: controller.signal,
    })
  } catch (error: unknown) {
    const code = controller.signal.aborted ? undefined : transportErrorCode(error)
    const codeSuffix = code ? ` (${code})` : ''
    const reason = controller.signal.aborted
      ? `the ${timeoutMs}ms request budget ran out`
      : `${describeError(error)}${codeSuffix}`
    throw new ApiTransportError(method, url, `after ${Date.now() - startedAt}ms: ${reason}`, code)
  } finally {
    clearTimeout(timeoutId)
  }

  const text = await response.text()
  if (!response.ok && !allowStatuses.includes(response.status)) {
    throw new ApiError(method, url, response.status, text.slice(0, 300))
  }
  try {
    return (text ? JSON.parse(text) : undefined) as T
  } catch {
    return undefined as T
  }
}

export interface PollOptions {
  timeoutMs: number
  intervalMs?: number
  /** Names the awaited condition in the timeout error — write it as a noun phrase
   *  (`'cred-ex abc123 to reach "done"'`). */
  description: string
  /** Evaluated on timeout to report what WAS observed (e.g. the last record state) — the API-side
   *  analogue of `describeCurrentScreen()`. */
  lastObserved?: () => string | undefined
}

/** The budget-overrun message, assembled off the poll loop so the wait itself stays readable. */
function timeoutMessage(timeoutMs: number, description: string, observed?: string, lastError?: string): string {
  const parts = [`Timed out after ${timeoutMs}ms waiting for ${description}`]
  if (observed) parts.push(`last observed: ${observed}`)
  if (lastError) parts.push(`last error: ${lastError}`)
  return parts.join('; ')
}

/**
 * Re-run `probe` until it returns a value (anything but `undefined`) or the budget runs out.
 * A throwing probe counts as "not yet" and its message is kept for the timeout error.
 */
export async function pollUntil<T>(probe: () => Promise<T | undefined>, options: PollOptions): Promise<T> {
  const { timeoutMs, intervalMs = 2_000, description, lastObserved } = options
  const deadline = Date.now() + timeoutMs
  let lastError: string | undefined

  for (;;) {
    try {
      const value = await probe()
      if (value !== undefined) return value
    } catch (error: unknown) {
      lastError = describeError(error)
    }
    if (Date.now() > deadline) {
      throw new Error(timeoutMessage(timeoutMs, description, lastObserved?.(), lastError))
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}
