import {
  hostEntry,
  readCachedToken,
  readHosts,
  removeCachedTokenQuietly,
  writeCachedToken,
  type ClientTarget,
  type SecretLocation,
} from './config.ts'
import { readSecret, splitCredential } from './credentials.ts'
import { resolveToken } from './environment.ts'
import { CliError, ExitCode } from './exit-codes.ts'
import { failureReason } from './network-errors.ts'

export const SCOPES = ['test-idv-accounts', 'test-idv-verify']

const REQUEST_TIMEOUT_MS = 30_000
// Refresh slightly early so a token does not expire between being read and being used.
const REFRESH_MARGIN_SECONDS = 60
const MAX_DIAGNOSTIC_LENGTH = 200
const basicCredential = (clientId: string, secret: string): string =>
  Buffer.from(`${clientId}:${secret}`).toString('base64')

/** The one place the token endpoint is derived from a host. */
export const tokenUrl = (host: string): string => `https://${host}/oauth2/token`

export interface IssuedToken {
  accessToken: string
  /** Epoch seconds; absent when the response gave no expiry, in which case the token is not cached. */
  expiresAt?: number
  /** Absent when the token did not say which scopes it carries. */
  scopes?: string[]
}

export interface JwtClaims {
  scope?: unknown
  exp?: unknown
}

const nowSeconds = (): number => Math.floor(Date.now() / 1000)

/** Reads the claims of a JWT without verifying it; the server is the authority, this is for display. */
export const decodeJwtClaims = (token: string): JwtClaims | undefined => {
  const payload = token.split('.')[1]
  if (!payload) return undefined
  try {
    const claims: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof claims === 'object' && claims !== null ? (claims as JwtClaims) : undefined
  } catch {
    return undefined
  }
}

const parseScopes = (value: unknown): string[] | undefined => {
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean)
  if (Array.isArray(value) && value.every((s) => typeof s === 'string')) return value
  return undefined
}

/** Scopes and expiry as the token itself reports them, for tokens not obtained through this CLI. */
export const describeToken = (accessToken: string): Pick<IssuedToken, 'scopes' | 'expiresAt'> => {
  const claims = decodeJwtClaims(accessToken)
  return {
    scopes: parseScopes(claims?.scope),
    expiresAt: typeof claims?.exp === 'number' ? claims.exp : undefined,
  }
}

const parseTokenResponse = (body: Record<string, unknown>): IssuedToken => {
  const accessToken = body.access_token as string
  const fromJwt = describeToken(accessToken)
  const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : undefined
  return {
    accessToken,
    expiresAt: expiresIn === undefined ? fromJwt.expiresAt : nowSeconds() + expiresIn,
    scopes: fromJwt.scopes ?? parseScopes(body.scope),
  }
}

const asRecord = (text: string): Record<string, unknown> | undefined => {
  try {
    const value: unknown = JSON.parse(text)
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}

const clip = (value: unknown): string => {
  const text = typeof value === 'string' ? value : (JSON.stringify(value) ?? '')
  return text.slice(0, MAX_DIAGNOSTIC_LENGTH)
}

/** Where a secret lives, for display: keychain, the op reference, or the env variable name. */
export const describeLocation = (location: SecretLocation): string => {
  switch (location.source) {
    case 'keychain':
      return 'keychain'
    case 'op':
      return `op ${location.ref}`
    case 'env':
      return `env $${location.variable}`
  }
}

interface TokenAttempt extends ClientTarget {
  secret: string
}

const invalidScopeMessage = (): string =>
  `IAS refused the scopes: the client must be registered for ${SCOPES.join(' or ')}. Ask the IAS team to grant them, then run bcsc-test auth login.`

// The client ID is left out: when it was parsed from a bare secret value it would echo part of the secret.
const rejectedCredentialMessage = ({ host, location }: TokenAttempt): string =>
  `IAS rejected the client ID or secret on ${host}. Check the secret stored in ${describeLocation(location)}, or re-run bcsc-test auth login. A client registered for private_key_jwt cannot log in with a secret yet.`

// Likely causes only: the status alone does not say which layer answered.
const STATUS_FAILURES: Record<number, (host: string) => string> = {
  403: () =>
    'The token request was blocked, most likely in front of IAS (httpd/SiteMinder). Check the hostname and your network access.',
  404: (host) => `No token endpoint at ${tokenUrl(host)}; check --hostname.`,
}

type AttemptResult = { token: IssuedToken } | { invalidScope: true }

const refusalMessage = (error: string, description: unknown): string => {
  const detail = description ? `: ${clip(description)}` : ''
  return `IAS refused the token request (${clip(error)}${detail}).`
}

const failureFor = (attempt: TokenAttempt, status: number, body: Record<string, unknown> | undefined): CliError => {
  const error = body?.error
  if (status === 401 || error === 'invalid_client') {
    return new CliError(rejectedCredentialMessage(attempt), ExitCode.authRequired)
  }
  if (Object.hasOwn(STATUS_FAILURES, status)) return new CliError(STATUS_FAILURES[status](attempt.host))
  if (status >= 500) {
    return new CliError(
      `IAS failed with status ${status} on the token request. Retry; if it persists, check the IAS server logs.`
    )
  }
  if (typeof error === 'string') return new CliError(refusalMessage(error, body?.error_description))
  return new CliError(`IAS returned an unexpected status ${status} for the token request at ${tokenUrl(attempt.host)}.`)
}

const postToken = async ({ host, clientId, secret }: TokenAttempt, scopes: string[]): Promise<Response> => {
  try {
    return await fetch(tokenUrl(host), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicCredential(clientId, secret)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: scopes.join(' ') }).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    throw new CliError(
      `Could not reach https://${host}: ${clip(failureReason(error).text)}. Check the hostname and your network or VPN.`
    )
  }
}

const readIssuedToken = (host: string, response: Response, body: Record<string, unknown> | undefined): IssuedToken => {
  if (typeof body?.access_token !== 'string' || !body.access_token) {
    const type = response.headers.get('content-type') ?? 'an unknown content type'
    throw new CliError(
      `Expected a JSON token from ${tokenUrl(host)} but got ${type}; the host may sit behind a login proxy.`
    )
  }
  return parseTokenResponse(body)
}

const requestToken = async (attempt: TokenAttempt, scopes: string[]): Promise<AttemptResult> => {
  const response = await postToken(attempt, scopes)
  const body = asRecord(await response.text().catch(() => ''))
  if (response.ok) return { token: readIssuedToken(attempt.host, response, body) }
  if (body?.error === 'invalid_scope') return { invalidScope: true }
  throw failureFor(attempt, response.status, body)
}

// IAS refuses both scopes if the client lacks either, so each is retried alone after invalid_scope.
export const fetchToken = async (attempt: TokenAttempt): Promise<IssuedToken> => {
  const both = await requestToken(attempt, SCOPES)
  if ('token' in both) return both.token
  for (const scope of SCOPES) {
    const single = await requestToken(attempt, [scope])
    if ('token' in single) return single.token
  }
  throw new CliError(invalidScopeMessage(), ExitCode.authRequired)
}

/** Scopes in SCOPES that the token does not carry; undefined when the token's scopes are unknown. */
export const missingScopes = (granted: string[] | undefined): string[] | undefined =>
  granted && SCOPES.filter((scope) => !granted.includes(scope))

/** The client secret behind a stored value, which may be `CLIENT_ID:CLIENT_SECRET` for the op and env sources. */
const secretFor = ({ host, clientId, location }: ClientTarget, env: NodeJS.ProcessEnv): string => {
  const stored = readSecret(host, clientId, location, env)
  const secret = location.source === 'keychain' ? stored : splitCredential(stored).secret
  if (!secret) throw new CliError(`The stored secret for ${clientId} on ${host} is empty.`, ExitCode.authRequired)
  return secret
}

/**
 * Caches a token for later commands. Best effort: a failed write drops any stale entry so an
 * old token is never reused, and is skipped when the client was logged out in the meantime.
 */
export const saveToken = (env: NodeJS.ProcessEnv, host: string, clientId: string, token: IssuedToken): void => {
  if (token.expiresAt === undefined) return
  try {
    const entry = hostEntry(readHosts(env), host)
    if (!entry || !Object.hasOwn(entry.clients, clientId)) return
    writeCachedToken(env, host, clientId, {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      ...(token.scopes && { scopes: token.scopes }),
    })
  } catch {
    removeCachedTokenQuietly(env, host, clientId)
  }
}

/** A cached token while it has time left, otherwise a fresh one fetched with the stored secret. */
export const clientToken = async (
  env: NodeJS.ProcessEnv,
  target: ClientTarget,
  options: { fresh?: boolean } = {}
): Promise<IssuedToken> => {
  const { host, clientId } = target
  const cached = options.fresh ? undefined : readCachedToken(env, host, clientId)
  if (cached && cached.expiresAt - nowSeconds() > REFRESH_MARGIN_SECONDS) return cached
  const token = await fetchToken({ ...target, secret: secretFor(target, env) })
  saveToken(env, host, clientId, token)
  return token
}

/**
 * The bearer token for `host`. `BCSC_TEST_TOKEN` wins; otherwise the host's active client
 * is used. Every command that needs a token goes through here so credential sources stay in one place.
 */
export const requireToken = async (host: string, env: NodeJS.ProcessEnv): Promise<string> => {
  const override = resolveToken(env)
  if (override) return override
  const entry = hostEntry(readHosts(env), host)
  if (!entry) {
    throw new CliError(
      `Not logged in to ${host}. Run \`bcsc-test auth login\`, or set BCSC_TEST_TOKEN.`,
      ExitCode.authRequired
    )
  }
  const { activeClient } = entry
  const token = await clientToken(env, { host, clientId: activeClient, location: entry.clients[activeClient] })
  return token.accessToken
}
