import { resolveToken } from './environment.ts'
import { CliError, ExitCode } from './exit-codes.ts'

/**
 * The bearer token for `host`. `BCSC_TEST_TOKEN` wins; every command that needs
 * a token goes through here so credential sources stay in one place.
 */
export const requireToken = async (host: string, env: NodeJS.ProcessEnv): Promise<string> => {
  const token = resolveToken(env)
  if (token) return token
  throw new CliError(`No token for ${host}. Set BCSC_TEST_TOKEN.`, ExitCode.authRequired)
}
