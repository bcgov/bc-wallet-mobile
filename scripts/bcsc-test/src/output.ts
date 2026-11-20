import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { CliError } from './exit-codes.ts'
import type { FlagValue, HandlerContext } from './spec.ts'

/**
 * Validates --json and --jq before any work is done. Returns the requested fields, or
 * undefined when --json was not passed.
 */
export const jsonFields = (flags: Record<string, FlagValue>, allowed: string[]): string[] | undefined => {
  const json = flags.json
  if (typeof json !== 'string') {
    if (flags.jq !== undefined) throw new CliError('--jq requires --json')
    return undefined
  }
  const fields = json
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean)
  const unknown = fields.filter((field) => !allowed.includes(field))
  if (fields.length === 0 || unknown.length > 0) {
    const problem = unknown.length > 0 ? `Unknown JSON field: ${unknown.join(', ')}.` : 'No JSON fields given.'
    throw new CliError(`${problem} Available fields: ${allowed.join(', ')}`)
  }
  return fields
}

const jqFailure = (result: SpawnSyncReturns<string>): CliError | undefined => {
  if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
    return new CliError('--jq needs the jq binary on PATH (brew install jq), or drop --jq and pipe the JSON.')
  }
  if (result.error) return new CliError(`Could not run jq: ${result.error.message}.`)
  return result.status === 0 ? undefined : new CliError(result.stderr.trim() || `jq exited ${result.status}`)
}

const runJq = (expression: string, input: string, env: NodeJS.ProcessEnv): string => {
  const result = spawnSync('jq', ['-r', expression], { input, env, encoding: 'utf8' })
  const failure = jqFailure(result)
  if (failure) throw failure
  return result.stdout
}

/** Prints the selected fields as JSON: indented on a terminal, compact when piped; --jq filters it with the jq binary. */
export const writeJson = (
  { io, env, flags }: Pick<HandlerContext, 'io' | 'env' | 'flags'>,
  fields: string[],
  data: Record<string, unknown>
): void => {
  const picked = Object.fromEntries(fields.map((field) => [field, data[field]]))
  const json = JSON.stringify(picked, null, io.stdoutIsTTY ? 2 : undefined)
  io.stdout(typeof flags.jq === 'string' ? runJq(flags.jq, json, env) : `${json}\n`)
}
