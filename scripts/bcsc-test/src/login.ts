import { describeExpiry, stringFlag } from './auth-common.ts'
import {
  contextHost,
  hostEntry,
  isValidClientId,
  readHosts,
  removeCachedTokenQuietly,
  validateClientId,
  validateEnvName,
  writeHosts,
  type ClientTarget,
  type SecretLocation,
} from './config.ts'
import {
  deleteKeychainSecret,
  readSecret,
  requireKeychain,
  splitCredential,
  storeKeychainSecret,
} from './credentials.ts'
import { CliError, ExitCode } from './exit-codes.ts'
import { ask, askSecret, readStdin } from './prompt.ts'
import type { HandlerContext } from './spec.ts'
import { describeLocation, fetchToken, missingScopes, saveToken, type IssuedToken } from './token.ts'

const SECRET_SOURCES = ['keychain', 'op', 'env']

// A companion flag that only makes sense with one secret source.
const SOURCE_FLAGS = [
  { flag: 'secret-ref', source: 'op', message: '--secret-ref only applies to --secret-source op.' },
  { flag: 'secret-env', source: 'env', message: '--secret-env only applies to --secret-source env.' },
  {
    flag: 'with-secret',
    source: 'keychain',
    message: '--with-secret only applies to the keychain source; the other sources read their own value.',
  },
]

const secretSource = (ctx: HandlerContext): string => {
  const source = stringFlag(ctx, 'secret-source') ?? 'keychain'
  if (!SECRET_SOURCES.includes(source)) {
    throw new CliError(`Unknown secret source "${source}". Choose one of: ${SECRET_SOURCES.join(', ')}.`)
  }
  const stray = SOURCE_FLAGS.find(({ flag, source: owner }) => source !== owner && stringFlagOrSet(ctx, flag))
  if (stray) throw new CliError(stray.message)
  return source
}

const stringFlagOrSet = (ctx: HandlerContext, flag: string): boolean =>
  ctx.flags[flag] === true || stringFlag(ctx, flag) !== undefined

const secretLocation = (ctx: HandlerContext): SecretLocation => {
  const source = secretSource(ctx)
  if (source === 'op') {
    const ref = stringFlag(ctx, 'secret-ref')
    if (!ref?.startsWith('op://'))
      throw new CliError('--secret-source op needs --secret-ref op://<vault>/<item>/<field>.')
    return { source, ref }
  }
  if (source === 'env') {
    const variable = stringFlag(ctx, 'secret-env')
    if (!variable) throw new CliError('--secret-source env needs --secret-env <VARIABLE>.')
    return { source, variable: validateEnvName(variable) }
  }
  requireKeychain()
  return { source: 'keychain' }
}

const NEEDS_CREDENTIAL =
  'Not a terminal, so the client ID cannot be prompted for. Provide CLIENT_ID:CLIENT_SECRET (as with curl -u).'

const requirePair = (clientId: string, secret: string): { clientId: string; secret: string } => {
  if (!clientId || !secret) throw new CliError('Both the client ID and the secret are required.')
  return { clientId, secret }
}

/** Splits `CLIENT_ID:CLIENT_SECRET`, as with curl -u; the secret may itself contain colons. */
const parseCredential = (value: string): { clientId: string; secret: string } => {
  const { clientId, secret } = splitCredential(value)
  const id = clientId?.trim()
  if (!id || !secret) throw new CliError('Expected CLIENT_ID:CLIENT_SECRET with both parts non-empty.')
  // A bare secret containing a colon lands here with its prefix as the "ID", so the ID is never echoed.
  if (!isValidClientId(id)) {
    throw new CliError(
      "The client ID part of the value is not valid (letters, digits and . _ ~ @ - only, and no ':' in the ID)."
    )
  }
  return { clientId: id, secret }
}

const promptCredential = async (): Promise<{ clientId: string; secret: string }> => {
  const clientId = validateClientId(await ask('Client ID: '))
  return requirePair(clientId, await askSecret('Client secret: '))
}

const gatherKeychainCredential = async (ctx: HandlerContext): Promise<{ clientId: string; secret: string }> => {
  if (ctx.flags['with-secret'] === true) return parseCredential(await readStdin())
  if (!ctx.io.isTTY) throw new CliError(`${NEEDS_CREDENTIAL} Pipe it in with --with-secret.`)
  return promptCredential()
}

const gatherStoredCredential = async (
  ctx: HandlerContext,
  host: string,
  location: SecretLocation
): Promise<{ clientId: string; secret: string }> => {
  // The client ID may be inside the stored value, so it is not known yet; op and env ignore it.
  const stored = readSecret(host, '', location, ctx.env)
  const { clientId, secret } = splitCredential(stored)
  if (clientId !== undefined) return parseCredential(stored)
  if (!ctx.io.isTTY) {
    throw new CliError(
      `The value in ${describeLocation(location)} has no client ID. When not on a terminal it must be CLIENT_ID:CLIENT_SECRET.`
    )
  }
  return requirePair(validateClientId(await ask('Client ID: ')), secret)
}

// The new credential is already saved, so a failed cleanup is reported rather than undoing the login.
const discardOldKeychainSecret = (ctx: HandlerContext, host: string, clientId: string): void => {
  try {
    deleteKeychainSecret(host, clientId, ctx.env)
  } catch (error) {
    if (!(error instanceof CliError)) throw error
    ctx.io.stderr(
      `Warning: ${error.message.replace(/\.?$/, '.')} It is no longer used; the item is named bcsc-test:${host}.\n`
    )
  }
}

// Order matters: the keychain item and hosts.json are written only after the token proved the
// credential, and the old keychain item goes last so a failure never leaves a client without one.
const persistLogin = (ctx: HandlerContext, target: ClientTarget, secret: string, token: IssuedToken): void => {
  const { host, clientId, location } = target
  const config = readHosts(ctx.env)
  const entry = hostEntry(config, host)
  const previous = entry && Object.hasOwn(entry.clients, clientId) ? entry.clients[clientId] : undefined
  if (location.source === 'keychain') storeKeychainSecret(host, clientId, secret, ctx.env)
  config.hosts[host] = { activeClient: clientId, clients: { ...entry?.clients, [clientId]: location } }
  writeHosts(ctx.env, config)
  if (previous?.source === 'keychain' && location.source !== 'keychain') discardOldKeychainSecret(ctx, host, clientId)
  removeCachedTokenQuietly(ctx.env, host, clientId)
  saveToken(ctx.env, host, clientId, token)
}

export const login = async (ctx: HandlerContext): Promise<number> => {
  if (stringFlag(ctx, 'key-file')) {
    throw new CliError('private_key_jwt is not supported yet; log in with a client secret.')
  }
  const host = contextHost(ctx)
  const location = secretLocation(ctx)
  const { clientId, secret } =
    location.source === 'keychain'
      ? await gatherKeychainCredential(ctx)
      : await gatherStoredCredential(ctx, host, location)

  const target = { host, clientId, location }
  const token = await fetchToken({ ...target, secret })
  persistLogin(ctx, target, secret, token)

  ctx.io.stdout(
    [
      `Logged in to ${host} as ${clientId}`,
      `Token scopes: ${token.scopes?.join(', ') ?? 'unknown'}`,
      `Token expires: ${describeExpiry(token.expiresAt)}`,
    ].join('\n') + '\n'
  )
  const missing = missingScopes(token.scopes)
  if (missing && missing.length > 0) {
    ctx.io.stderr(`Warning: the client lacks ${missing.join(', ')}; commands that need them will fail with a 403.\n`)
  }
  return ExitCode.ok
}
