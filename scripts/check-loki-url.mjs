/**
 * Verify a REMOTE_LOGGING_URL is one the app can actually use, and optionally
 * send a test log line through it.
 *
 * The Loki transport in @bifold/remote-logs parses the URL by hand and posts to
 * it verbatim. This replicates that parsing and compares it against WHATWG URL,
 * so a URL the transport would mangle fails here instead of silently dropping
 * every log line in production.
 *
 * Usage:
 *   REMOTE_LOGGING_URL='https://user:pass@host/loki/api/v1/push' node scripts/check-loki-url.mjs
 *   REMOTE_LOGGING_URL="$(op read 'op://<vault>/remote-logging-url/prod')" node scripts/check-loki-url.mjs --push
 *
 * Flags:
 *   --push    after the URL checks pass, send one log line and report the result
 *
 * Env (with --push): JOB, LEVEL, MESSAGE, APP, TIMEOUT
 *
 * The password is never printed, hashed, or otherwise echoed -- only whether
 * the transport's parse of it matches the real one.
 * Exit 0 = usable (and pushed, with --push), 1 = the app would fail, 2 = bad input.
 */

const PUSH_PATH = '/loki/api/v1/push'

const lokiUrl = process.env.REMOTE_LOGGING_URL
if (!lokiUrl) {
  console.error('set REMOTE_LOGGING_URL')
  process.exit(2)
}

let url
try {
  url = new URL(lokiUrl)
} catch {
  console.error('REMOTE_LOGGING_URL is not a valid URL')
  process.exit(2)
}

// Verbatim from bifold packages/remote-logs/src/transports/loki.ts
const [credentials, href] = lokiUrl.split('@')
const [username, password] = credentials.split('//')[1].split(':')
const protocol = credentials.split('//')[0]
const transportTarget = `${protocol}//${href}`

const trueUser = decodeURIComponent(url.username)
const truePass = decodeURIComponent(url.password)
const trueTarget = `${url.protocol}//${url.host}${url.pathname}`

// WHATWG URL always yields a '/' pathname; the transport's string split does not.
// Normalise it so a bare host is reported as a missing path, not a mangled host.
const stripSlash = (s) => s.replace(/\/$/, '')

const atCount = (lokiUrl.match(/@/g) ?? []).length
const colonCount = (credentials.split('//')[1].match(/:/g) ?? []).length
const userOk = username === trueUser
const passOk = password === truePass
const targetOk = stripSlash(transportTarget) === stripSlash(trueTarget)
const hasPushPath = url.pathname.endsWith(PUSH_PATH)

console.log('transport username   :', username, userOk ? 'OK' : `MISMATCH (real: ${trueUser})`)
console.log('transport password   :', passOk ? 'OK' : 'MISMATCH -- truncated or mangled')
console.log('transport POST target:', transportTarget || '(empty)', targetOk ? 'OK' : `MISMATCH (real: ${trueTarget})`)
console.log('push path present    :', hasPushPath ? `OK (${url.pathname})` : `MISSING -- expected ${PUSH_PATH}`)

if (!userOk || !passOk || !targetOk) {
  // Splitting on the FIRST '@' and ':' breaks on a password containing either.
  console.log('\nFAIL - the transport would send the wrong credentials or hit the wrong host.')
  console.log(`       ${atCount} '@' in the URL, ${colonCount} ':' after the username.`)
  console.log(`       A password containing '@' or ':' breaks the transport's parsing.`)
  process.exit(1)
}

if (!hasPushPath) {
  console.log(`\nFAIL - the URL is missing ${PUSH_PATH}.`)
  console.log('       The transport posts the URL verbatim and never appends the path.')
  console.log('       These hosts answer other paths with an unauthenticated 200 OK and')
  console.log('       discard the payload, so logging fails silently.')
  process.exit(1)
}

console.log('\nPASS - the app can use this URL')

if (!process.argv.includes('--push')) {
  process.exit(0)
}

const {
  JOB = 'react-native-logs',
  LEVEL = 'info',
  MESSAGE = 'loki connectivity test',
  APP = 'check-loki-url',
} = process.env
const timeoutMs = Number(process.env.TIMEOUT ?? 25) * 1000

// Loki wants nanosecond precision; Date.now() only gives milliseconds.
const timestamp = `${Date.now()}000000`
const payload = JSON.stringify({
  streams: [
    {
      stream: { job: JOB, level: LEVEL, app: APP },
      values: [[timestamp, JSON.stringify({ message: MESSAGE, data: null, error: null })]],
    },
  ],
})

console.log(`\nPOST ${protocol}//${username}:<redacted>@${url.host}${url.pathname}`)

const response = await fetch(transportTarget, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
  },
  body: payload,
  signal: AbortSignal.timeout(timeoutMs),
}).catch((error) => {
  console.log(`FAIL - no response: ${error.message}`)
  console.log('       Check DNS, TLS, and whether the VPN is connected.')
  process.exit(1)
})

// The body is echoed for diagnostics. Strip control characters -- newlines and
// ANSI escapes are what make echoing a remote response to a terminal unsafe --
// and cap the length. Printable symbols are kept so HTML error pages stay legible.
const body = (await response.text()).replace(/\p{C}/gu, ' ').trim().slice(0, 200)
console.log(`HTTP ${response.status}`)
if (body) {
  console.log(body)
}

// Only 204 means the line was stored. A 200 is the nginx health check
// swallowing the payload -- see the missing-path case above.
if (response.status === 204) {
  console.log('\nOK - accepted (Loki returns 204 on a successful push)')
  process.exit(0)
}
if (response.status === 401 || response.status === 403) {
  console.log('\nFAIL - credentials rejected by the gateway')
  process.exit(1)
}
if (response.status === 400) {
  console.log('\nFAIL - Loki rejected the payload (often a timestamp too old or out of order)')
  process.exit(1)
}
console.log(`\nFAIL - expected 204, got ${response.status}; the line was not stored`)
process.exit(1)
