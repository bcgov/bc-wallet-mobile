import { describeExpiry, stringFlag } from './auth-common.ts'
import { contextHost, hostEntry, readHosts, type ClientTarget, type HostsConfig } from './config.ts'
import { resolveToken, validateHost } from './environment.ts'
import { CliError, ExitCode } from './exit-codes.ts'
import { jsonFields, writeJson } from './output.ts'
import type { HandlerContext } from './spec.ts'
import { clientToken, describeLocation, describeToken, missingScopes } from './token.ts'

export const STATUS_JSON_FIELDS = ['hosts']

interface ClientStatus {
  client: string | null
  active: boolean
  state: 'success' | 'error' | 'unchecked' | 'overridden'
  secretSource: string
  scopes: string[] | null
  missingScopes: string[] | null
  tokenExpiresAt: string | null
  error?: string
}

const expiryIso = (expiresAt: number | undefined): string | null =>
  expiresAt === undefined ? null : new Date(expiresAt * 1000).toISOString()

const checkClient = async (ctx: HandlerContext, target: ClientTarget, active: boolean): Promise<ClientStatus> => {
  const base = { client: target.clientId, active, secretSource: describeLocation(target.location) }
  if (!active) {
    return { ...base, state: 'unchecked', scopes: null, missingScopes: null, tokenExpiresAt: null }
  }
  try {
    const token = await clientToken(ctx.env, target, { fresh: true })
    return {
      ...base,
      state: 'success',
      scopes: token.scopes ?? null,
      missingScopes: missingScopes(token.scopes) ?? null,
      tokenExpiresAt: expiryIso(token.expiresAt),
    }
  } catch (error) {
    if (!(error instanceof CliError)) throw error
    return { ...base, state: 'error', scopes: null, missingScopes: null, tokenExpiresAt: null, error: error.message }
  }
}

const overriddenStatus = ({ clientId, location }: ClientTarget): ClientStatus => ({
  client: clientId,
  active: false,
  state: 'overridden',
  secretSource: describeLocation(location),
  scopes: null,
  missingScopes: null,
  tokenExpiresAt: null,
})

const environmentTokenStatus = (token: string): ClientStatus => {
  const { scopes, expiresAt } = describeToken(token)
  const base = {
    client: null,
    active: true,
    secretSource: 'BCSC_TEST_TOKEN',
    scopes: scopes ?? null,
    missingScopes: missingScopes(scopes) ?? null,
    tokenExpiresAt: expiryIso(expiresAt),
  }
  if (expiresAt !== undefined && expiresAt * 1000 <= Date.now()) {
    return { ...base, state: 'error', error: 'BCSC_TEST_TOKEN has expired. Set a fresh token or unset it.' }
  }
  return { ...base, state: 'success' }
}

const renderDetails = (status: ClientStatus): string[] => [
  `    - Secret source: ${status.secretSource}`,
  `    - Token scopes: ${status.scopes?.join(', ') ?? 'unknown'}`,
  `    - Missing scopes: ${status.missingScopes ? status.missingScopes.join(', ') || 'none' : 'unknown'}`,
  `    - Token expires: ${status.tokenExpiresAt ? describeExpiry(Date.parse(status.tokenExpiresAt) / 1000) : 'unknown'}`,
]

const renderClient = (status: ClientStatus): string => {
  const who = status.client ?? 'BCSC_TEST_TOKEN'
  if (status.state === 'overridden') return `  - ${who} (overridden by BCSC_TEST_TOKEN; not checked)`
  if (status.state === 'unchecked') {
    return `  - ${who} (not checked; \`bcsc-test auth switch --user ${who}\` makes it active)`
  }
  if (status.state === 'error') {
    return status.client ? `  X Could not get a token for ${who}: ${status.error}` : `  X ${status.error}`
  }
  const heading = status.client
    ? `  ✓ Logged in as ${who}${status.active ? ' (active)' : ''}`
    : `  ✓ Using the token in ${who}`
  return [heading, ...renderDetails(status)].join('\n')
}

// BCSC_TEST_TOKEN applies to any host, so with it set a host does not have to be saved to be reported.
const requestedHost = (requested: string, config: HostsConfig, hasOverride: boolean): string => {
  const host = validateHost(requested)
  if (hasOverride || hostEntry(config, host)) return host
  throw new CliError(`Not logged in to ${host}. Run \`bcsc-test auth login\`.`)
}

const statusHosts = (ctx: HandlerContext, config: HostsConfig, hasOverride: boolean): string[] => {
  const requested = stringFlag(ctx, 'hostname')
  if (requested) return [requestedHost(requested, config, hasOverride)]
  const saved = Object.keys(config.hosts)
  if (hasOverride) return [...new Set([contextHost(ctx), ...saved])]
  if (saved.length > 0) return saved
  throw new CliError('Not logged in to any host. Run `bcsc-test auth login`.')
}

// With BCSC_TEST_TOKEN set every command sends it, so it is the in-use entry and the stored clients are not consulted.
const hostStatus = async (
  ctx: HandlerContext,
  config: HostsConfig,
  host: string,
  override?: string
): Promise<ClientStatus[]> => {
  const entry = hostEntry(config, host)
  const stored = Object.entries(entry?.clients ?? {}).map(([clientId, location]): [ClientTarget, boolean] => [
    { host, clientId, location },
    clientId === entry?.activeClient,
  ])
  if (override) {
    return [environmentTokenStatus(override), ...stored.map(([target]) => overriddenStatus(target))]
  }
  return Promise.all(stored.map(([target, active]) => checkClient(ctx, target, active)))
}

export const status = async (ctx: HandlerContext): Promise<number> => {
  const fields = jsonFields(ctx.flags, STATUS_JSON_FIELDS)
  const config = readHosts(ctx.env)
  const override = resolveToken(ctx.env)
  const hosts = statusHosts(ctx, config, override !== undefined)
  if (override && Object.keys(config.hosts).length > 0) {
    ctx.io.stderr('BCSC_TEST_TOKEN is set and overrides the stored credential for every command.\n')
  }

  const report: Record<string, ClientStatus[]> = {}
  for (const host of hosts) report[host] = await hostStatus(ctx, config, host, override)

  if (fields) {
    writeJson(ctx, fields, { hosts: report })
  } else {
    ctx.io.stdout(
      Object.entries(report)
        .map(([host, clients]) => `${host}\n${clients.map(renderClient).join('\n')}\n`)
        .join('\n')
    )
  }
  const failed = Object.values(report).some((clients) => clients.some((c) => c.state === 'error'))
  return failed ? ExitCode.failure : ExitCode.ok
}
