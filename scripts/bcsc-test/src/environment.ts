import type { FlagValue } from './spec.ts'

// Taken from the dev token issuer; the test API's own host is unconfirmed (FUL-96 open question 1).
export const DEFAULT_HOST = 'iddev.gov.bc.ca'

/** Precedence matches gh: --hostname, then BCSC_TEST_HOST, then the default. Saved hosts slot in before the default with FUL-167. */
export const resolveHost = (flags: Record<string, FlagValue>, env: NodeJS.ProcessEnv): string => {
  const flag = flags.hostname
  if (typeof flag === 'string' && flag.trim()) return flag.trim()
  return env.BCSC_TEST_HOST?.trim() || DEFAULT_HOST
}

/** BCSC_TEST_TOKEN overrides any stored credential, like GH_TOKEN; undefined means fall back to auth. */
export const resolveToken = (env: NodeJS.ProcessEnv): string | undefined => env.BCSC_TEST_TOKEN?.trim() || undefined
