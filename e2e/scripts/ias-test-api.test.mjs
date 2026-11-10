/**
 * The IAS test-API client's contract (src/api/ias-test.ts) against a fake host: the token's life, what
 * each status is named, and what an error may say. No network and no credentials; every value is made up.
 */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { inspect } from 'node:util'
import {
  completeRegistrationEmail,
  decideVerification,
  getGrantedScopes,
  getIasTestApiConfig,
  IasTestApiError,
  mintIdentity,
  normalizeUsercode,
  setCardStatus,
  setMobileAppExpiry,
} from '../src/api/ias-test.ts'

const ENV_KEYS = ['IAS_TEST_API_HOST', 'IAS_TEST_API_CLIENT_ID', 'IAS_TEST_API_CLIENT_SECRET']
const CLIENT_ID = 'e2e.unit.test.client'
const SECRET = 'not-a-real-secret'
const USERCODE = 'ABCD2345'
const DISPLAYED_USERCODE = 'ABCD-2345'
const SERIAL = 'C00000001'
const BOTH_SCOPES = 'test-idv-accounts test-idv-verify'

let saved = {}
let hosts = 0
let origin = ''

// The client caches a token per host, so every test talks to a host of its own.
beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  origin = `https://ias-${++hosts}.test`
  process.env.IAS_TEST_API_HOST = origin
  process.env.IAS_TEST_API_CLIENT_ID = CLIENT_ID
  process.env.IAS_TEST_API_CLIENT_SECRET = SECRET
})
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

const json = (status, body) => new Response(JSON.stringify(body), { status })
const empty = (status) => new Response(null, { status })
/** The host's own error page, as it answers a request it cannot accept. */
const errorPage = (status) => new Response('<!doctype html><html><body><h1>HTTP Status</h1></body></html>', { status })
/** What fetch throws when a socket error ends the request. */
const socketError = (code) =>
  Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('socket error'), { code }) })

/**
 * Stand in for the host. Token requests are answered here (`token-1`, `token-2`, ...); every other
 * request goes to `respond(request, n)`, which returns a Response or throws like fetch would.
 */
function fakeHost(t, respond, { scope = BOTH_SCOPES, tokenAnswer } = {}) {
  const host = { tokenRequests: [], requests: [] }
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const { host: name, pathname } = new URL(url)
    if (pathname === '/oauth2/token') {
      host.tokenRequests.push({ url: String(url), host: name, init })
      if (tokenAnswer) return tokenAnswer()
      const accessToken = `token-${host.tokenRequests.length}`
      return json(200, { access_token: accessToken, token_type: 'Bearer', expires_in: 3599, scope })
    }
    const request = {
      path: pathname,
      authorization: init.headers.authorization,
      body: init.body === undefined ? undefined : JSON.parse(init.body),
    }
    host.requests.push(request)
    return respond(request, host.requests.length)
  })
  return host
}

const identity = () => json(200, { csn: SERIAL, birthDate: '1990-01-01' })

/** Asserts a rejection is the client's own error of this kind and status. */
const failsAs = (kind, status) => (error) => {
  assert.ok(error instanceof IasTestApiError, `expected an IasTestApiError, got ${error}`)
  assert.equal(error.kind, kind)
  assert.equal(error.status, status)
  return true
}

/** Everything an error shows when it is logged or reported. */
const shown = (error) => inspect(error)

/** Let pending work settle, then move the mocked clock, until `done()`. */
async function advanceUntil(t, done, stepMs = 3_000) {
  for (let step = 0; step < 100 && !done(); step++) {
    for (let turn = 0; turn < 5; turn++) await new Promise((resolve) => setImmediate(resolve))
    t.mock.timers.tick(stepMs)
  }
  assert.ok(done(), 'the awaited condition never came')
}

// --- usercode and config ----------------------------------------------------------------------------

test('a usercode is taken as displayed or already stripped', () => {
  assert.equal(normalizeUsercode(DISPLAYED_USERCODE), USERCODE)
  assert.equal(normalizeUsercode(' ABCD 2345 '), USERCODE)
  assert.equal(normalizeUsercode(USERCODE), USERCODE)
})

test('a malformed usercode is refused without being quoted', () => {
  for (const malformed of ['ABCD-234', 'ABCD-23456', 'ABCD_2345']) {
    assert.throws(
      () => normalizeUsercode(malformed),
      (error) => /8 alphanumeric characters/.test(error.message) && !error.message.includes(malformed)
    )
  }
  assert.throws(() => normalizeUsercode(''), /8 alphanumeric characters/)
})

test('the host is reduced to an https origin, however it is stored', () => {
  for (const stored of ['ias.example.test', 'https://ias.example.test/', 'https://ias.example.test/test/idv/v1']) {
    process.env.IAS_TEST_API_HOST = stored
    assert.equal(getIasTestApiConfig().origin, 'https://ias.example.test')
  }
  process.env.IAS_TEST_API_HOST = 'http://ias.example.test'
  assert.throws(() => getIasTestApiConfig(), /must be an https host/)
})

test('a missing value is named, and only that one', () => {
  delete process.env.IAS_TEST_API_CLIENT_SECRET
  assert.throws(
    () => getIasTestApiConfig(),
    (error) =>
      error.message.includes('set IAS_TEST_API_CLIENT_SECRET in') && !error.message.includes('IAS_TEST_API_CLIENT_ID')
  )
})

// --- token ------------------------------------------------------------------------------------------

test('the token is asked for with basic auth and a form, then reused', async (t) => {
  const host = fakeHost(t, identity)
  await mintIdentity({ cardType: 'COMBO' })
  await mintIdentity({ cardType: 'COMBO' })

  assert.equal(host.tokenRequests.length, 1)
  const [{ url, init }] = host.tokenRequests
  assert.equal(url, `${origin}/oauth2/token`)
  assert.equal(init.method, 'POST')
  assert.equal(init.headers.authorization, `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')}`)
  assert.ok(init.body instanceof URLSearchParams, 'the grant is a form, not JSON')
  assert.equal(init.headers['content-type'], undefined)
  assert.deepEqual(Object.fromEntries(init.body), { grant_type: 'client_credentials', scope: BOTH_SCOPES })
  assert.deepEqual(
    host.requests.map((request) => request.authorization),
    ['Bearer token-1', 'Bearer token-1']
  )
})

test('a token is replaced a minute before it expires', async (t) => {
  let now = 1_700_000_000_000
  t.mock.method(Date, 'now', () => now)
  const host = fakeHost(t, identity) // expires_in 3599

  await mintIdentity({ cardType: 'COMBO' })
  now += 3_538_000
  await mintIdentity({ cardType: 'COMBO' })
  assert.equal(host.tokenRequests.length, 1)

  now += 1_000
  await mintIdentity({ cardType: 'COMBO' })
  assert.equal(host.tokenRequests.length, 2)
  assert.equal(host.requests.at(-1).authorization, 'Bearer token-2')
})

test('each host gets its own token', async (t) => {
  const host = fakeHost(t, identity)
  await mintIdentity({ cardType: 'COMBO' })
  process.env.IAS_TEST_API_HOST = `https://ias-${hosts}-other.test`
  await mintIdentity({ cardType: 'COMBO' })
  assert.deepEqual(
    host.tokenRequests.map((request) => request.host),
    [`ias-${hosts}.test`, `ias-${hosts}-other.test`]
  )
})

test('the granted scopes are the ones the token response names', async (t) => {
  fakeHost(t, identity, { scope: 'test-idv-accounts' })
  assert.deepEqual(await getGrantedScopes(), ['test-idv-accounts'])
})

test('refused client credentials are named without being quoted', async (t) => {
  const host = fakeHost(t, identity, { tokenAnswer: () => json(401, { error: 'invalid_client' }) })
  const error = await mintIdentity({ cardType: 'COMBO' }).catch((caught) => caught)

  failsAs('unauthorized', 401)(error)
  assert.match(error.message, /\/oauth2\/token → 401 invalid_client: IAS refused the client credentials/)
  assert.ok(!shown(error).includes(SECRET) && !shown(error).includes(CLIENT_ID))
  assert.equal(host.requests.length, 0)
})

test('a refused token request shows its OAuth error code and nothing else of the body', async (t) => {
  const answer = { error: 'invalid_scope', error_description: 'a detail the host wrote' }
  fakeHost(t, identity, { tokenAnswer: () => json(400, answer) })
  const error = await getGrantedScopes().catch((caught) => caught)

  failsAs('unexpected', 400)(error)
  assert.equal(error.message, `POST ${origin}/oauth2/token → 400 invalid_scope: no token issued`)
})

// --- 401 --------------------------------------------------------------------------------------------

test('a 401 buys one fresh token and one more try', async (t) => {
  const host = fakeHost(t, (request, n) => (n === 1 ? empty(401) : json(200, { status: 'VERIFIED' })))
  assert.equal(await decideVerification(USERCODE, 'COUNTER', 'APPROVE'), 'VERIFIED')
  assert.equal(host.tokenRequests.length, 2)
  assert.deepEqual(
    host.requests.map((request) => request.authorization),
    ['Bearer token-1', 'Bearer token-2']
  )
})

test('a second 401 is the answer', async (t) => {
  const host = fakeHost(t, () => empty(401))
  await assert.rejects(decideVerification(USERCODE, 'COUNTER', 'APPROVE'), failsAs('unauthorized', 401))
  assert.equal(host.requests.length, 2)
  assert.equal(host.tokenRequests.length, 2)
})

// --- status mapping ---------------------------------------------------------------------------------

test('501 is a route that is served but not built yet', async (t) => {
  fakeHost(t, () => empty(501))
  const error = await decideVerification(USERCODE, 'SEND_VIDEO', 'APPROVE').catch((caught) => caught)
  failsAs('not-implemented', 501)(error)
  assert.match(error.message, /\(SEND_VIDEO APPROVE\) → 501/)
})

test('403 with the scope held is a route the build does not have', async (t) => {
  fakeHost(t, () => empty(403))
  await assert.rejects(decideVerification(USERCODE, 'COUNTER', 'APPROVE'), failsAs('route-absent', 403))
})

test('403 without the scope is a scope the client lacks', async (t) => {
  fakeHost(t, () => empty(403), { scope: 'test-idv-accounts' })
  const error = await decideVerification(USERCODE, 'COUNTER', 'APPROVE').catch((caught) => caught)
  failsAs('scope-missing', 403)(error)
  assert.match(error.message, /the token lacks test-idv-verify/)
})

test('400 with an empty body on a usercode route is an unknown usercode', async (t) => {
  fakeHost(t, () => empty(400))
  await assert.rejects(decideVerification(USERCODE, 'COUNTER', 'APPROVE'), failsAs('unknown-usercode', 400))
  await assert.rejects(setMobileAppExpiry(USERCODE, new Date()), failsAs('unknown-usercode', 400))
})

test('400 with a body is the request being refused, not the usercode', async (t) => {
  fakeHost(t, () => errorPage(400))
  const error = await decideVerification(USERCODE, 'COUNTER', 'APPROVE').catch((caught) => caught)
  failsAs('unexpected', 400)(error)
  assert.match(error.message, /→ 400 \(body withheld\): the host rejected the request body$/)
})

test('400 with an empty body on a route without a usercode stays unnamed', async (t) => {
  fakeHost(t, () => empty(400))
  await assert.rejects(mintIdentity({ cardType: 'COMBO' }), failsAs('unexpected', 400))
})

// --- what an error may say --------------------------------------------------------------------------

test('an error names the route with its key masked and quotes nothing the host said', async (t) => {
  fakeHost(t, () => new Response(`<html>${USERCODE} ${SERIAL} token-1</html>`, { status: 500 }))

  const error = await decideVerification(DISPLAYED_USERCODE, 'COUNTER', 'APPROVE').catch((caught) => caught)
  assert.equal(
    error.message,
    `POST ${origin}/test/idv/v1/verifications/<usercode>/decision (COUNTER APPROVE) → 500 (body withheld)`
  )
  const cardError = await setCardStatus(SERIAL, 'SUSPEND', 'e2e').catch((caught) => caught)
  assert.equal(
    cardError.message,
    `POST ${origin}/test/idv/v1/accounts/<csn>/card-status (SUSPEND) → 500 (body withheld)`
  )
  for (const sensitive of [USERCODE, DISPLAYED_USERCODE, SERIAL, SECRET, 'token-1']) {
    assert.ok(!shown(error).includes(sensitive) && !shown(cardError).includes(sensitive), `${sensitive} leaked`)
  }
})

test('a lost response is not repeated, and keeps the key out of the error', async (t) => {
  const host = fakeHost(t, () => {
    throw socketError('UND_ERR_SOCKET')
  })
  const error = await decideVerification(USERCODE, 'COUNTER', 'APPROVE').catch((caught) => caught)

  failsAs('unexpected', undefined)(error)
  assert.match(
    error.message,
    /verifications\/<usercode>\/decision \(COUNTER APPROVE\) failed after \d+ms: fetch failed \(UND_ERR_SOCKET\)$/
  )
  assert.ok(!shown(error).includes(USERCODE))
  assert.equal(host.requests.length, 1)
})

// --- connect retry ----------------------------------------------------------------------------------

test('a request that never connected is sent again', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const host = fakeHost(t, (request, n) => {
    if (n === 1) throw socketError('UND_ERR_CONNECT_TIMEOUT')
    return json(200, { status: 'VERIFIED' })
  })

  const decided = decideVerification(USERCODE, 'COUNTER', 'APPROVE')
  await advanceUntil(t, () => host.requests.length === 2)
  assert.equal(await decided, 'VERIFIED')
  assert.equal(host.tokenRequests.length, 1)
})

test('a host that never connects ends as unreachable, with the key still masked', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const host = fakeHost(t, () => {
    throw socketError('UND_ERR_CONNECT_TIMEOUT')
  })

  let error
  decideVerification(USERCODE, 'COUNTER', 'APPROVE').catch((caught) => {
    error = caught
  })
  await advanceUntil(t, () => error !== undefined)

  failsAs('unreachable', undefined)(error)
  assert.match(error.message, /^Timed out after 45000ms waiting for ias-\d+\.test to accept a connection; last error: /)
  assert.match(
    error.message,
    /<usercode>\/decision \(COUNTER APPROVE\) failed after \d+ms: fetch failed \(UND_ERR_CONNECT_TIMEOUT\)$/
  )
  assert.ok(!shown(error).includes(USERCODE))
  assert.ok(host.requests.length > 1, 'the request was repeated')
})

// --- operations -------------------------------------------------------------------------------------

test('a minted identity is the serial and the birth date', async (t) => {
  const host = fakeHost(t, () => json(200, { csn: SERIAL, birthDate: '1990-01-01', transactionId: 'tx-1' }))
  const request = { cardType: 'COMBO', surname: 'TESTER', givenName1: 'PAT', gender: 'X', birthDate: '1990-01-01' }

  assert.deepEqual(await mintIdentity(request), { csn: SERIAL, birthDate: '1990-01-01', transactionId: 'tx-1' })
  assert.deepEqual(host.requests[0], { path: '/test/idv/v1/accounts', authorization: 'Bearer token-1', body: request })
})

test('a mint that returns no serial is refused without quoting what did arrive', async (t) => {
  fakeHost(t, () => json(200, { birthDate: '1990-01-01' }))
  const error = await mintIdentity({ cardType: 'COMBO' }).catch((caught) => caught)
  failsAs('unexpected', undefined)(error)
  assert.equal(error.message, `POST ${origin}/test/idv/v1/accounts → 2xx without a csn and birthDate`)
})

test('an approval sends the channel and the decision alone, to the stripped usercode', async (t) => {
  const host = fakeHost(t, () => json(200, { status: 'VERIFIED' }))
  assert.equal(await decideVerification(DISPLAYED_USERCODE, 'COUNTER', 'APPROVE'), 'VERIFIED')
  assert.deepEqual(host.requests[0], {
    path: `/test/idv/v1/verifications/${USERCODE}/decision`,
    authorization: 'Bearer token-1',
    body: { channel: 'COUNTER', decision: 'APPROVE' },
  })
})

test('a decline needs both comments and an approval takes none, before anything is sent', async (t) => {
  const host = fakeHost(t, () => json(200, { status: 'DECLINED' }))
  const tooLong = 'x'.repeat(501)

  await assert.rejects(decideVerification(USERCODE, 'COUNTER', 'DECLINE'), /needs userMessage and internalComment/)
  await assert.rejects(decideVerification(USERCODE, 'COUNTER', 'DECLINE', { userMessage: 'Try again' }), /needs/)
  await assert.rejects(
    decideVerification(USERCODE, 'COUNTER', 'DECLINE', { userMessage: tooLong, internalComment: 'e2e' }),
    /500 characters at most/
  )
  await assert.rejects(decideVerification(USERCODE, 'COUNTER', 'APPROVE', { internalComment: 'e2e' }), /no comments/)
  assert.equal(host.tokenRequests.length + host.requests.length, 0)

  const comments = { userMessage: 'Try again', internalComment: 'e2e' }
  assert.equal(await decideVerification(USERCODE, 'COUNTER', 'DECLINE', comments), 'DECLINED')
  assert.deepEqual(host.requests[0].body, { channel: 'COUNTER', decision: 'DECLINE', ...comments })
})

test('a 2xx that does not confirm the decision is a failure', async (t) => {
  fakeHost(t, () => json(200, { status: 'DECLINED' }))
  const error = await decideVerification(USERCODE, 'COUNTER', 'APPROVE').catch((caught) => caught)
  failsAs('unexpected', undefined)(error)
  assert.match(error.message, /\(COUNTER APPROVE\) → 2xx without the status VERIFIED$/)
})

test('an email completion answers completed, not-found or email-mismatch', async (t) => {
  const statuses = [204, 404, 409]
  const host = fakeHost(t, (request, n) => empty(statuses[n - 1]))
  const address = 'someone@example.test'

  assert.equal(await completeRegistrationEmail(DISPLAYED_USERCODE, address), 'completed')
  assert.equal(await completeRegistrationEmail(USERCODE, address), 'not-found')
  assert.equal(await completeRegistrationEmail(USERCODE, address), 'email-mismatch')
  assert.deepEqual(host.requests[0], {
    path: `/test/idv/v1/registrations/${USERCODE}/email-verification/complete`,
    authorization: 'Bearer token-1',
    body: { expectedEmailAddress: address },
  })
})

test('an expiry is sent to the second, the precision the host accepts', async (t) => {
  const host = fakeHost(t, (request) => json(200, { expiryDate: request.body.expiryDate }))

  assert.equal(await setMobileAppExpiry(USERCODE, new Date('2026-12-01T12:00:00.789Z')), '2026-12-01T12:00:00Z')
  assert.equal(await setMobileAppExpiry(USERCODE, '2026-12-01T04:00:00-08:00'), '2026-12-01T12:00:00Z')
  await assert.rejects(setMobileAppExpiry(USERCODE, 'next week'), /ISO 8601 date-time/)
  assert.equal(host.requests.length, 2)
  assert.equal(host.requests[0].path, `/test/idv/v1/accounts/mobile-app/${USERCODE}/expiry`)
})
