import { randomBytes } from 'node:crypto'
import { chmodSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { HOST_PATTERN, resolveHost } from './environment.ts'
import { CliError } from './exit-codes.ts'
import type { HandlerContext } from './spec.ts'

export type SecretLocation =
  | { source: 'keychain' }
  | { source: 'op'; ref: string }
  | { source: 'env'; variable: string }

/** One saved client on one host: everything needed to find its secret. */
export interface ClientTarget {
  host: string
  clientId: string
  location: SecretLocation
}

export interface ClientEntry {
  activeClient: string
  clients: Record<string, SecretLocation>
}

/** Where each client's secret lives. Never holds a secret itself. */
export interface HostsConfig {
  hosts: Record<string, ClientEntry>
}

/** `scopes` is absent when the token did not say which scopes it carries. */
export interface CachedToken {
  accessToken: string
  /** Epoch seconds. */
  expiresAt: number
  scopes?: string[]
}

const CLIENT_ID_PATTERN = /^[A-Za-z0-9._~@-]+$/
const ENV_NAME_PATTERN = /^[A-Za-z_]\w*$/
const FORBIDDEN_KEY = '__proto__'

export const isValidClientId = (clientId: string): boolean =>
  CLIENT_ID_PATTERN.test(clientId) && clientId !== FORBIDDEN_KEY

/** Client IDs become Basic auth, keychain account names and JSON keys, so ':' is rejected as the Basic separator. */
export const validateClientId = (clientId: string): string => {
  if (!isValidClientId(clientId)) {
    throw new CliError(
      `"${clientId}" is not a valid client ID. Use letters, digits and . _ ~ @ - only; ':' is not allowed.`
    )
  }
  return clientId
}

export const validateEnvName = (name: string): string => {
  if (!ENV_NAME_PATTERN.test(name)) throw new CliError(`"${name}" is not a valid environment variable name.`)
  return name
}

export const configDir = (env: NodeJS.ProcessEnv): string =>
  join(env.XDG_CONFIG_HOME?.trim() || join(homedir(), '.config'), 'bcsc-test')

const hostsPath = (env: NodeJS.ProcessEnv): string => join(configDir(env), 'hosts.json')
const tokensPath = (env: NodeJS.ProcessEnv): string => join(configDir(env), 'tokens.json')

const errorCode = (error: unknown): string | undefined => (error as NodeJS.ErrnoException).code

/** Returns undefined when the file does not exist; throws CliError for any other read or parse failure. */
const readJsonFile = (path: string): unknown => {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return undefined
    throw new CliError(`Could not read ${path}: ${errorCode(error) ?? (error as Error).message}.`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new CliError(`${path} is not valid JSON. Fix or delete it, then run \`bcsc-test auth login\`.`)
  }
}

// mode only applies when a file is created, so permissions are re-applied on every write.
const writePrivateFile = (env: NodeJS.ProcessEnv, path: string, data: unknown): void => {
  const temp = `${path}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
  try {
    const dir = configDir(env)
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    chmodSync(dir, 0o700)
    writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 })
    chmodSync(temp, 0o600)
    renameSync(temp, path)
  } catch (error) {
    rmSync(temp, { force: true })
    throw new CliError(`Could not write ${path}: ${errorCode(error) ?? (error as Error).message}.`)
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const LOCATION_PARSERS: Record<string, (value: Record<string, unknown>) => SecretLocation | undefined> = {
  keychain: () => ({ source: 'keychain' }),
  op: ({ ref }) => (typeof ref === 'string' && ref.startsWith('op://') ? { source: 'op', ref } : undefined),
  env: ({ variable }) =>
    typeof variable === 'string' && ENV_NAME_PATTERN.test(variable) ? { source: 'env', variable } : undefined,
}

const parseLocation = (value: unknown): SecretLocation | undefined => {
  if (!isRecord(value) || typeof value.source !== 'string') return undefined
  return Object.hasOwn(LOCATION_PARSERS, value.source) ? LOCATION_PARSERS[value.source](value) : undefined
}

const parseClients = (value: unknown): Record<string, SecretLocation> | undefined => {
  if (!isRecord(value)) return undefined
  const clients: Record<string, SecretLocation> = {}
  for (const [clientId, raw] of Object.entries(value)) {
    const location = parseLocation(raw)
    if (!location || !CLIENT_ID_PATTERN.test(clientId) || clientId === FORBIDDEN_KEY) return undefined
    clients[clientId] = location
  }
  return clients
}

const parseEntry = (value: unknown): ClientEntry | undefined => {
  if (!isRecord(value) || typeof value.activeClient !== 'string') return undefined
  const clients = parseClients(value.clients)
  return clients && Object.hasOwn(clients, value.activeClient)
    ? { activeClient: value.activeClient, clients }
    : undefined
}

const parseHosts = (raw: unknown): HostsConfig | undefined => {
  if (!isRecord(raw) || !isRecord(raw.hosts)) return undefined
  const hosts: Record<string, ClientEntry> = {}
  for (const [host, value] of Object.entries(raw.hosts)) {
    const entry = parseEntry(value)
    if (!entry || !HOST_PATTERN.test(host)) return undefined
    hosts[host] = entry
  }
  return { hosts }
}

export const readHosts = (env: NodeJS.ProcessEnv): HostsConfig => {
  const path = hostsPath(env)
  const raw = readJsonFile(path)
  if (raw === undefined) return { hosts: {} }
  const config = parseHosts(raw)
  if (!config) {
    throw new CliError(`${path} is not a valid hosts file. Fix or delete it, then run \`bcsc-test auth login\`.`)
  }
  return config
}

export const writeHosts = (env: NodeJS.ProcessEnv, config: HostsConfig): void =>
  writePrivateFile(env, hostsPath(env), config)

/** The entry for `host`, or undefined when not logged in there. */
export const hostEntry = (config: HostsConfig, host: string): ClientEntry | undefined =>
  Object.hasOwn(config.hosts, host) ? config.hosts[host] : undefined

type TokenCache = Record<string, Record<string, CachedToken>>

const parseCachedToken = (value: unknown): CachedToken | undefined => {
  if (!isRecord(value) || typeof value.accessToken !== 'string' || typeof value.expiresAt !== 'number') return undefined
  const scopes =
    Array.isArray(value.scopes) && value.scopes.every((s) => typeof s === 'string') ? value.scopes : undefined
  return { accessToken: value.accessToken, expiresAt: value.expiresAt, ...(scopes && { scopes }) }
}

// A damaged cache is only a missed optimisation, so it reads as empty and is rewritten on the next fetch.
const readTokenCache = (env: NodeJS.ProcessEnv): TokenCache => {
  let raw: unknown
  try {
    raw = readJsonFile(tokensPath(env))
  } catch {
    return {}
  }
  if (!isRecord(raw)) return {}
  const cache: TokenCache = {}
  for (const [host, clients] of Object.entries(raw)) {
    if (!isRecord(clients) || host === FORBIDDEN_KEY) continue
    cache[host] = {}
    for (const [clientId, token] of Object.entries(clients)) {
      const parsed = parseCachedToken(token)
      if (parsed && clientId !== FORBIDDEN_KEY) cache[host][clientId] = parsed
    }
  }
  return cache
}

const cachedClients = (cache: TokenCache, host: string): Record<string, CachedToken> | undefined =>
  Object.hasOwn(cache, host) ? cache[host] : undefined

export const readCachedToken = (env: NodeJS.ProcessEnv, host: string, clientId: string): CachedToken | undefined => {
  const clients = cachedClients(readTokenCache(env), host)
  return clients && Object.hasOwn(clients, clientId) ? clients[clientId] : undefined
}

export const writeCachedToken = (env: NodeJS.ProcessEnv, host: string, clientId: string, token: CachedToken): void => {
  const cache = readTokenCache(env)
  cache[host] = { ...cachedClients(cache, host), [clientId]: token }
  writePrivateFile(env, tokensPath(env), cache)
}

export const removeCachedToken = (env: NodeJS.ProcessEnv, host: string, clientId: string): void => {
  const cache = readTokenCache(env)
  const clients = cachedClients(cache, host)
  if (!clients || !Object.hasOwn(clients, clientId)) return
  delete clients[clientId]
  if (Object.keys(clients).length === 0) delete cache[host]
  writePrivateFile(env, tokensPath(env), cache)
}

/** The cache is an optimisation, so an unwritable one must not fail the command that dropped an entry. */
export const removeCachedTokenQuietly = (env: NodeJS.ProcessEnv, host: string, clientId: string): void => {
  try {
    removeCachedToken(env, host, clientId)
  } catch {
    // The stale entry expires on its own.
  }
}

/** Reads hosts.json only when neither --hostname nor BCSC_TEST_HOST decides, so a damaged file cannot block them. */
export const contextHost = (ctx: Pick<HandlerContext, 'flags' | 'env'>): string =>
  resolveHost(ctx.flags, ctx.env, () => Object.keys(readHosts(ctx.env).hosts))
