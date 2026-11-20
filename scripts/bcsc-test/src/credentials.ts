import { spawnSync } from 'node:child_process'
import type { SecretLocation } from './config.ts'
import { CliError, ExitCode } from './exit-codes.ts'

const KEYCHAIN_NOT_FOUND = 44
// `security -i` reads one command per line; longer secrets were seen to fail, so refuse them up front.
const MAX_KEYCHAIN_SECRET_BYTES = 1024
// An absolute path, so a PATH entry cannot stand in for the tool that holds the secret.
const SECURITY = '/usr/bin/security'
const MAX_DIAGNOSTIC_LENGTH = 200

const keychainService = (host: string): string => `bcsc-test:${host}`

const firstLine = (text: string | null | undefined): string =>
  (text ?? '').split('\n')[0].trim().slice(0, MAX_DIAGNOSTIC_LENGTH)

const secretError = (message: string): CliError => new CliError(message, ExitCode.authRequired)

export const requireKeychain = (): void => {
  if (process.platform !== 'darwin') {
    throw secretError('The keychain source needs macOS. Use --secret-source op or --secret-source env.')
  }
}

/** A stored value of the form `CLIENT_ID:CLIENT_SECRET` (like curl -u) splits on the first colon. */
export const splitCredential = (value: string): { clientId?: string; secret: string } => {
  const colon = value.indexOf(':')
  return colon === -1 ? { secret: value } : { clientId: value.slice(0, colon), secret: value.slice(colon + 1) }
}

const readKeychain = (host: string, clientId: string, env: NodeJS.ProcessEnv): string => {
  requireKeychain()
  const result = spawnSync(SECURITY, ['find-generic-password', '-s', keychainService(host), '-a', clientId, '-w'], {
    env,
    encoding: 'utf8',
  })
  if (result.error) throw secretError(`Could not run the macOS security tool: ${result.error.message}.`)
  if (result.status === KEYCHAIN_NOT_FOUND) {
    throw secretError(`No keychain entry for ${clientId} on ${host}. Run \`bcsc-test auth login\`.`)
  }
  if (result.status !== 0) {
    throw secretError(`Could not read the keychain entry for ${clientId} on ${host}: ${firstLine(result.stderr)}`)
  }
  return Buffer.from(result.stdout.trim(), 'base64').toString('utf8')
}

const checkStorable = (secret: string): void => {
  if (!secret) throw secretError('The client secret is empty.')
  if (Buffer.byteLength(secret) > MAX_KEYCHAIN_SECRET_BYTES) {
    throw secretError(
      `The secret is longer than ${MAX_KEYCHAIN_SECRET_BYTES} bytes, which the keychain source cannot store. Use --secret-source op or env.`
    )
  }
}

// `security -i` keeps the secret off argv; base64 avoids quoting, and the read-back catches a silent failed store.
export const storeKeychainSecret = (host: string, clientId: string, secret: string, env: NodeJS.ProcessEnv): void => {
  requireKeychain()
  checkStorable(secret)
  const encoded = Buffer.from(secret).toString('base64')
  const command = `add-generic-password -U -s "${keychainService(host)}" -a "${clientId}" -w "${encoded}"\n`
  const result = spawnSync(SECURITY, ['-i'], { input: command, env, encoding: 'utf8' })
  const failed = (reason: string) =>
    secretError(`Could not save the secret for ${clientId} on ${host} to the keychain (${reason}). Nothing was saved.`)
  if (result.error || result.status !== 0) throw failed(result.error?.message ?? `security exited ${result.status}`)
  let stored: string | undefined
  try {
    stored = readKeychain(host, clientId, env)
  } catch {
    stored = undefined
  }
  if (stored !== secret) throw failed('the stored value could not be read back unchanged')
}

export const deleteKeychainSecret = (host: string, clientId: string, env: NodeJS.ProcessEnv): void => {
  if (process.platform !== 'darwin') return
  const result = spawnSync(SECURITY, ['delete-generic-password', '-s', keychainService(host), '-a', clientId], {
    env,
    encoding: 'utf8',
  })
  if (result.error) throw secretError(`Could not run the macOS security tool: ${result.error.message}.`)
  if (result.status !== 0 && result.status !== KEYCHAIN_NOT_FOUND) {
    throw secretError(`Could not remove the keychain entry for ${clientId} on ${host}: ${firstLine(result.stderr)}`)
  }
}

const readOp = (ref: string, env: NodeJS.ProcessEnv): string => {
  const result = spawnSync('op', ['read', '--no-newline', ref], {
    env,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
    throw secretError('1Password CLI (op) not found; install it or use another --secret-source.')
  }
  if (result.error) throw secretError(`Could not run op: ${result.error.message}.`)
  if (result.status !== 0) {
    throw secretError(
      `op could not read the secret (${firstLine(result.stderr) || `exit ${result.status}`}). Unlock 1Password and check the reference; set OP_ACCOUNT if the item is in another account.`
    )
  }
  return result.stdout
}

const readEnv = (variable: string, env: NodeJS.ProcessEnv): string => {
  const value = env[variable]
  if (!value?.trim()) {
    throw secretError(`$${variable} is not set; it must hold CLIENT_ID:CLIENT_SECRET or the client secret.`)
  }
  return value.trim()
}

/** The stored value for a client; for the op and env sources it may be `CLIENT_ID:CLIENT_SECRET`. */
export const readSecret = (
  host: string,
  clientId: string,
  location: SecretLocation,
  env: NodeJS.ProcessEnv
): string => {
  switch (location.source) {
    case 'keychain':
      return readKeychain(host, clientId, env)
    case 'op':
      return readOp(location.ref, env)
    case 'env':
      return readEnv(location.variable, env)
  }
}
