/**
 * Who approves an in-person request (src/helpers/approval.ts): which source answers for which flow,
 * what the API path sends, and what its log and its failure may say. A fake host stands in for the
 * test API; the portal is never reached. Every value is made up.
 */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { IasTestApiError } from '../src/api/ias-test.ts'
import { approvalSource, approveInPersonRequest, inPersonApprovalSource } from '../src/helpers/approval.ts'

const ENV_KEYS = ['E2E_APPROVAL_SOURCE', 'IAS_TEST_API_HOST', 'IAS_TEST_API_CLIENT_ID', 'IAS_TEST_API_CLIENT_SECRET']
const DISPLAYED_CODE = 'ABCD-2345'
const CODE = 'ABCD2345'
const SERIAL = 'C00000001'
const BIRTHDATE = '19981114'
const PASSPORT = 'XY48291573'

const PHOTO = { flow: 'photo', cardSerialNumber: SERIAL, cardBirthdate: BIRTHDATE }
const NON_PHOTO = { ...PHOTO, flow: 'non-photo', document: { typeId: '12', number: PASSPORT } }
const FLOWS = ['photo', 'non-photo', 'non-bcsc']

let saved = {}
let hosts = 0

// The client caches a token per host, so every test talks to a host of its own.
beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  process.env.E2E_APPROVAL_SOURCE = 'api'
  process.env.IAS_TEST_API_HOST = `https://ias-approval-${++hosts}.test`
  process.env.IAS_TEST_API_CLIENT_ID = 'e2e.unit.test.client'
  process.env.IAS_TEST_API_CLIENT_SECRET = 'not-a-real-secret'
})
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

const json = (status, body) => new Response(JSON.stringify(body), { status })

/**
 * Stand in for the test API and for the console: a token for the asking, `decide()` for every other
 * request, and whatever the approval logs kept in `lines`.
 */
function fakeApi(t, decide = () => json(200, { status: 'VERIFIED' })) {
  const api = { requests: [], lines: [] }
  t.mock.method(console, 'log', (...args) => api.lines.push(args.join(' ')))
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const { pathname } = new URL(url)
    if (pathname === '/oauth2/token') {
      return json(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3599, scope: 'test-idv-verify' })
    }
    api.requests.push({ path: pathname, body: JSON.parse(init.body) })
    return decide()
  })
  return api
}

/** Nothing a remote log may hold: the code in either form, or what the portal would have been given. */
function assertNamesNoHolder(text) {
  for (const value of [CODE, DISPLAYED_CODE, SERIAL, BIRTHDATE, PASSPORT]) {
    assert.ok(!text.includes(value), `a holder value reached a log or an error: ${text}`)
  }
}

// --- source -----------------------------------------------------------------------------------------

test('the portal approves unless the run says api', () => {
  for (const source of [undefined, '', 'idcheck', ' IDCheck ']) {
    if (source === undefined) delete process.env.E2E_APPROVAL_SOURCE
    else process.env.E2E_APPROVAL_SOURCE = source
    assert.equal(approvalSource(), 'idcheck')
    assert.deepEqual(FLOWS.map(inPersonApprovalSource), ['idcheck', 'idcheck', 'idcheck'])
  }
})

test('with api, a card holder is approved by the test API and a holder without a card by the portal', () => {
  process.env.E2E_APPROVAL_SOURCE = ' API '
  assert.equal(approvalSource(), 'api')
  assert.deepEqual(FLOWS.map(inPersonApprovalSource), ['api', 'api', 'idcheck'])
})

test('an unknown source is refused rather than guessed', async (t) => {
  const api = fakeApi(t)
  process.env.E2E_APPROVAL_SOURCE = 'portal'
  assert.throws(() => approvalSource(), /use api or idcheck/)
  for (const flow of FLOWS) assert.throws(() => inPersonApprovalSource(flow), /use api or idcheck/)
  await assert.rejects(approveInPersonRequest(DISPLAYED_CODE, PHOTO), /use api or idcheck/)
  assert.equal(api.requests.length, 0)
})

// --- the API path -----------------------------------------------------------------------------------

test('the test API is sent a counter approval keyed by the code alone', async (t) => {
  const api = fakeApi(t)
  await approveInPersonRequest(DISPLAYED_CODE, PHOTO)
  await approveInPersonRequest(CODE, NON_PHOTO)

  const decision = { path: `/test/idv/v1/verifications/${CODE}/decision`, body: { channel: 'COUNTER', decision: 'APPROVE' } }
  assert.deepEqual(api.requests, [decision, decision])
})

test('the log names the flow and the source, never the code', async (t) => {
  const api = fakeApi(t)
  await approveInPersonRequest(DISPLAYED_CODE, NON_PHOTO)

  assert.equal(api.lines[0], '[approval] Approving in-person request (flow=non-photo, source=api)')
  assert.match(api.lines[1], /^\[approval\] The test API recorded the approval in \d+ms$/)
  assert.equal(api.lines.length, 2)
  assertNamesNoHolder(api.lines.join('\n'))
})

test('a code that is not a confirmation code is refused before any request', async (t) => {
  const api = fakeApi(t)
  await assert.rejects(approveInPersonRequest('ABCD', PHOTO), /Invalid confirmation code/)
  assert.equal(api.requests.length, 0)
})

test('a host without the decision route fails the approval by name', async (t) => {
  fakeApi(t, () => new Response(null, { status: 403 }))
  const error = await approveInPersonRequest(DISPLAYED_CODE, PHOTO).catch((caught) => caught)

  assert.match(error.message, /^In-person approval failed after \d+ms \(flow=photo, source=api\): POST /)
  assert.match(error.message, /verifications\/<usercode>\/decision \(COUNTER APPROVE\) → 403/)
  assert.match(error.message, /this build does not have the route/)
  assertNamesNoHolder(error.message)
  assert.ok(error.cause instanceof IasTestApiError)
  assert.equal(error.cause.kind, 'route-absent')
})

test('a code the API does not know fails the approval, with the reason kept for the caller', async (t) => {
  fakeApi(t, () => new Response(null, { status: 400 }))
  const error = await approveInPersonRequest(DISPLAYED_CODE, PHOTO).catch((caught) => caught)

  assert.match(error.message, /source=api\).*→ 400 \(empty body\): the usercode is unknown/)
  assertNamesNoHolder(error.message)
  assert.equal(error.cause.kind, 'unknown-usercode')
})
