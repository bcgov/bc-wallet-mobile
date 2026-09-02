/**
 * Shared HTTP core for the e2e support-API layer (see ../../docs/SUPPORT-API.md).
 *
 * Every runner-driven API client goes through these two primitives so failures read the same way
 * everywhere: a non-2xx is an {@link ApiError} carrying the status + a body snippet, and OUR OWN
 * timeout is named as a budget — never mistakable for a server rejection (the same convention as
 * `helpers/approval.ts`).
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

/** A caught `unknown` as a readable string — its `Error.message`, or the value itself. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** JSON-serialized when provided. */
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
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error: unknown) {
    const detail = controller.signal.aborted ? `the ${timeoutMs}ms request budget ran out` : describeError(error)
    throw new Error(`${method} ${url} failed after ${Date.now() - startedAt}ms: ${detail}`)
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
