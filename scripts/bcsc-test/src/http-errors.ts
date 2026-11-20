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

/**
 * Turns an IAS test API failure into a cause and a next action. Commands pass
 * overrides for statuses whose meaning is endpoint-specific (e.g. 400 preconditions).
 */
export const explainHttpFailure = (
  { status, wwwAuthenticate }: HttpFailure,
  overrides: Overrides = {}
): Explanation => {
  const override = overrides[status]
  if (override) {
    return { message: override, exitCode: status === 401 ? ExitCode.authRequired : ExitCode.failure }
  }
  switch (status) {
    case 400:
      return {
        message: "IAS rejected the request as invalid. Check the preconditions in this command's --help.",
        exitCode: ExitCode.failure,
      }
    case 401:
      return {
        message:
          'The token is missing, expired or invalid. Run `bcsc-test auth status`, then `bcsc-test auth login` if needed.',
        exitCode: ExitCode.authRequired,
      }
    case 403:
      // Spring adds this header; httpd/SiteMinder in front of Tomcat does not.
      if (wwwAuthenticate?.includes('insufficient_scope')) {
        return {
          message:
            'The token lacks the scope this endpoint needs. Run `bcsc-test auth status` to see which scopes are missing, and ask for them to be granted to the client.',
          exitCode: ExitCode.failure,
        }
      }
      return {
        message:
          'The request was blocked in front of IAS (httpd/SiteMinder), not by a missing scope. Check the host and your network access.',
        exitCode: ExitCode.failure,
      }
    case 404:
      return { message: 'IAS found no such usercode or CSN on this host.', exitCode: ExitCode.failure }
    case 501:
      return {
        message: 'IAS does not implement this operation; retrying will not help.',
        exitCode: ExitCode.failure,
      }
    default:
      if (status >= 500) {
        return {
          message: `IAS failed with status ${status}. Retry; if it persists, check the IAS server logs.`,
          exitCode: ExitCode.failure,
        }
      }
      return { message: `IAS returned an unexpected status ${status}.`, exitCode: ExitCode.failure }
  }
}
