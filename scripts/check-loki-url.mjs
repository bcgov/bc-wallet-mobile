/**
 * Verify a REMOTE_LOGGING_URL is one the app can actually use.
 *
 * The Loki transport in @bifold/remote-logs parses the URL by hand and posts to
 * it verbatim. This replicates that parsing and compares it against WHATWG URL,
 * so a URL that the transport would mangle fails here instead of silently
 * dropping every log line in production.
 *
 * Usage:
 *   REMOTE_LOGGING_URL='https://user:pass@host/loki/api/v1/push' node scripts/check-loki-url.mjs
 *   REMOTE_LOGGING_URL="$(op read 'op://<vault>/remote-logging-url/prod')" node scripts/check-loki-url.mjs
 *
 * Passwords are never printed -- only their length and a short hash.
 * Exit code 0 = usable, 1 = the app would send the wrong thing, 2 = bad input.
 */

import crypto from 'node:crypto'

const PUSH_PATH = '/loki/api/v1/push'

const lokiUrl = process.env.REMOTE_LOGGING_URL
if (!lokiUrl) {
  console.error('set REMOTE_LOGGING_URL')
  process.exit(2)
}

// Verbatim from bifold packages/remote-logs/src/transports/loki.ts
const [credentials, href] = lokiUrl.split('@')
const [username, password] = credentials.split('//')[1].split(':')
const protocol = credentials.split('//')[0]
const transportTarget = `${protocol}//${href}`

const url = new URL(lokiUrl)
const trueUser = decodeURIComponent(url.username)
const truePass = decodeURIComponent(url.password)
const trueTarget = `${url.protocol}//${url.host}${url.pathname}`

const mask = (s) =>
  s ? `len=${s.length} sha=${crypto.createHash('sha256').update(s).digest('hex').slice(0, 8)}` : '(empty)'

const atCount = (lokiUrl.match(/@/g) ?? []).length
const colonCount = (credentials.split('//')[1].match(/:/g) ?? []).length
const userOk = username === trueUser
const passOk = password === truePass
// WHATWG URL always yields a '/' pathname; the transport's string split does not.
// Normalise it so a bare host is reported as a missing path, not a mangled host.
const stripSlash = (s) => s.replace(/\/$/, '')
const targetOk = stripSlash(transportTarget) === stripSlash(trueTarget)
const hasPushPath = url.pathname.endsWith(PUSH_PATH)

console.log('transport username   :', username, userOk ? 'OK' : `MISMATCH (real: ${trueUser})`)
console.log('transport password   :', mask(password), passOk ? 'OK' : 'MISMATCH -- truncated or mangled')
console.log('transport POST target:', transportTarget || '(empty)', targetOk ? 'OK' : `MISMATCH (real: ${trueTarget})`)
console.log('push path present    :', hasPushPath ? `OK (${url.pathname})` : `MISSING -- expected ${PUSH_PATH}`)

if (!userOk || !passOk || !targetOk) {
  // Splitting on the FIRST '@' and ':' breaks on a password containing either.
  console.log(`\nFAIL - the transport would send the wrong credentials or hit the wrong host.`)
  console.log(`       ${atCount} '@' in the URL, ${colonCount} ':' after the username.`)
  console.log(`       A password containing '@' or ':' breaks the transport's parsing.`)
  process.exit(1)
}

if (!hasPushPath) {
  console.log(`\nFAIL - the URL is missing ${PUSH_PATH}.`)
  console.log(`       The transport posts the URL verbatim and never appends the path.`)
  console.log(`       These hosts answer other paths with an unauthenticated 200 OK and`)
  console.log(`       discard the payload, so logging fails silently.`)
  process.exit(1)
}

console.log('\nPASS - the app can use this URL')
