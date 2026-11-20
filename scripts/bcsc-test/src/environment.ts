import { CliError } from './exit-codes.ts'
import type { FlagValue, HandlerContext } from './spec.ts'

// The dev IAS host, the only deployment of the test API today.
export const DEFAULT_HOST = 'iddev.gov.bc.ca'

const HOST_PATTERN = /^[A-Za-z0-9.-]+(:\d+)?$/

/** Hosts end up in URLs, so reject anything that is not a plain hostname with an optional port. */
export const validateHost = (host: string): string => {
  if (!HOST_PATTERN.test(host)) {
    throw new CliError(`"${host}" is not a valid host. Use a hostname such as ${DEFAULT_HOST}.`)
  }
  return host
}

/** Precedence matches gh: --hostname, then BCSC_TEST_HOST, then the default. */
export const resolveHost = (flags: Record<string, FlagValue>, env: NodeJS.ProcessEnv): string => {
  const flag = flags.hostname
  if (typeof flag === 'string' && flag.trim()) return validateHost(flag.trim())
  return validateHost(env.BCSC_TEST_HOST?.trim() || DEFAULT_HOST)
}

/** Resolves the host once per invocation; handlers reuse the result for the prompt, URL and output. */
export const contextHost = (ctx: Pick<HandlerContext, 'flags' | 'env'>): string => resolveHost(ctx.flags, ctx.env)

/** BCSC_TEST_TOKEN overrides any stored credential, like GH_TOKEN; undefined means fall back to auth. */
export const resolveToken = (env: NodeJS.ProcessEnv): string | undefined => env.BCSC_TEST_TOKEN?.trim() || undefined
