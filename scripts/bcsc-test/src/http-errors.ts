import { ExitCode } from './exit-codes.ts'

export interface HttpFailure {
  status: number
  wwwAuthenticate?: string | null
}

export interface Explanation {
  message: string
  exitCode: number
}

type Overrides = Partial<Record<number, string>>

const SCOPE_403 =
  'The token lacks the scope this endpoint needs. Run `bcsc-test auth status` to see which scopes are missing, and ask for them to be granted to the client.'
const PROXY_403 =
  'The request was blocked in front of IAS (httpd/SiteMinder), not by a missing scope. Check the host and your network access.'

const messages: Record<number, (failure: HttpFailure) => string> = {
  400: () => "IAS rejected the request as invalid. Check the preconditions in this command's --help.",
  401: () =>
    'The token is missing, expired or invalid. Run `bcsc-test auth status`, then `bcsc-test auth login` if needed.',
  // Spring adds this header; httpd/SiteMinder in front of Tomcat does not.
  403: ({ wwwAuthenticate }) => (wwwAuthenticate?.includes('insufficient_scope') ? SCOPE_403 : PROXY_403),
  404: () => 'IAS found no such usercode or CSN on this host.',
  501: () => 'IAS does not implement this operation; retrying will not help.',
}

const fallbackMessage = (status: number): string =>
  status >= 500
    ? `IAS failed with status ${status}. Retry; if it persists, check the IAS server logs.`
    : `IAS returned an unexpected status ${status}.`

/**
 * Turns an IAS test API failure into a cause and a next action. Commands pass
 * overrides for statuses whose meaning is endpoint-specific (e.g. 400 preconditions).
 */
export const explainHttpFailure = (failure: HttpFailure, overrides: Overrides = {}): Explanation => {
  const { status } = failure
  const message = overrides[status] ?? messages[status]?.(failure) ?? fallbackMessage(status)
  return { message, exitCode: status === 401 ? ExitCode.authRequired : ExitCode.failure }
}
