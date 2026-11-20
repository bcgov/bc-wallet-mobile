import { stringFlag } from './auth-common.ts'
import {
  contextHost,
  hostEntry,
  readHosts,
  removeCachedTokenQuietly,
  validateClientId,
  writeHosts,
  type ClientEntry,
  type HostsConfig,
} from './config.ts'
import { deleteKeychainSecret } from './credentials.ts'
import { CliError, ExitCode } from './exit-codes.ts'
import type { HandlerContext } from './spec.ts'
import { requireToken } from './token.ts'

export const token = async (ctx: HandlerContext): Promise<number> => {
  ctx.io.stdout(`${await requireToken(contextHost(ctx), ctx.env)}\n`)
  return ExitCode.ok
}

const listClients = (entry: ClientEntry): string =>
  Object.keys(entry.clients)
    .map((client) => `  ${client}`)
    .join('\n')

const requireEntry = (config: HostsConfig, host: string): ClientEntry => {
  const entry = hostEntry(config, host)
  if (!entry) throw new CliError(`Not logged in to ${host}. Run \`bcsc-test auth login\`.`)
  return entry
}

/** Validates a --user value and checks it is saved on the host. */
const requireClient = (entry: ClientEntry, host: string, name: string): string => {
  const clientId = validateClientId(name)
  if (!Object.hasOwn(entry.clients, clientId)) {
    throw new CliError(`${clientId} is not logged in to ${host}. Saved clients:\n${listClients(entry)}`)
  }
  return clientId
}

const otherClient = (entry: ClientEntry, host: string): string => {
  const clients = Object.keys(entry.clients)
  if (clients.length === 2) return clients.find((client) => client !== entry.activeClient) ?? entry.activeClient
  const reason = clients.length === 1 ? 'Only one client is logged in' : 'More than two clients are logged in'
  throw new CliError(`${reason} to ${host}; pass --user <client-id>. Saved clients:\n${listClients(entry)}`)
}

export const switchClient = (ctx: HandlerContext): number => {
  const host = contextHost(ctx)
  const config = readHosts(ctx.env)
  const entry = requireEntry(config, host)
  const requested = stringFlag(ctx, 'user')

  entry.activeClient = requested ? requireClient(entry, host, requested) : otherClient(entry, host)
  writeHosts(ctx.env, config)
  ctx.io.stdout(`Switched the active client for ${host} to ${entry.activeClient}\n`)
  return ExitCode.ok
}

const onlyClient = (entry: ClientEntry, host: string): string => {
  const clients = Object.keys(entry.clients)
  if (clients.length === 1) return clients[0]
  throw new CliError(
    `Several clients are logged in to ${host}; pass --user <client-id>. Saved clients:\n${listClients(entry)}`
  )
}

export const logout = (ctx: HandlerContext): number => {
  const host = contextHost(ctx)
  const config = readHosts(ctx.env)
  const entry = requireEntry(config, host)
  const requested = stringFlag(ctx, 'user')
  const target = requested ? requireClient(entry, host, requested) : onlyClient(entry, host)

  // Deleting the keychain item first means a failure leaves everything as it was, so logout can be retried.
  if (entry.clients[target].source === 'keychain') deleteKeychainSecret(host, target, ctx.env)
  delete entry.clients[target]
  const remaining = Object.keys(entry.clients)
  if (remaining.length === 0) delete config.hosts[host]
  else if (entry.activeClient === target) entry.activeClient = remaining[0]
  writeHosts(ctx.env, config)
  removeCachedTokenQuietly(ctx.env, host, target)
  ctx.io.stdout(`Logged out ${target} from ${host}\n`)
  return ExitCode.ok
}
