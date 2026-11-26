import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, it, mock } from 'node:test'
import { run } from './cli.ts'
import type { Io } from './spec.ts'

const HOST = 'iddev.gov.bc.ca'
const URL = `https://${HOST}/test/idv/v1/accounts/mobile-app/NCNF-ZNTB/expiry`
const EXPIRY = '2099-12-01T00:00:00-08:00'
const TOKEN = 'sentinel-token-value'

const emptyConfigHome = (): string => mkdtempSync(join(tmpdir(), 'bcsc-test-'))

const invoke = async (argv: string[], env: NodeJS.ProcessEnv = { BCSC_TEST_TOKEN: TOKEN }) => {
  let stdout = ''
  let stderr = ''
  const io: Io = { stdout: (t) => (stdout += t), stderr: (t) => (stderr += t), isTTY: false }
  const code = await run(['mobile-app', 'set-expiry', 'NCNF-ZNTB', ...argv, '--hostname', HOST], { io, env })
  return { code, stdout, stderr }
}

const mockFetch = (respond: () => Response | Promise<Response>) =>
  mock.method(globalThis, 'fetch', async (_url: string, _init: RequestInit) => respond())

const sentRequest = (fetchMock: ReturnType<typeof mockFetch>, index: number) =>
  fetchMock.mock.calls[index].arguments as unknown as [string, RequestInit]

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => mock.restoreAll())

describe('mobile-app set-expiry', () => {
  it('posts the expiry with the caller-supplied token and reports the stored date', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ expiryDate: EXPIRY }))
    const { code, stdout, stderr } = await invoke([EXPIRY])
    assert.equal(code, 0, stderr)
    assert.equal(fetchMock.mock.callCount(), 1)
    const [url, init] = sentRequest(fetchMock, 0)
    assert.equal(url, URL)
    assert.equal(init.method, 'POST')
    assert.equal((init.headers as Record<string, string>).Authorization, `Bearer ${TOKEN}`)
    assert.equal(init.body, JSON.stringify({ expiryDate: EXPIRY }))
    assert.match(stdout, new RegExp(`Set the expiry of NCNF-ZNTB on ${HOST} to ${EXPIRY}`))
  })

  it('accepts a past date and a Z offset, sending them verbatim', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ expiryDate: '2020-01-01T00:00:00Z' }))
    const { code } = await invoke(['2020-01-01T00:00:00Z'])
    assert.equal(code, 0)
    assert.equal(sentRequest(fetchMock, 0)[1].body, JSON.stringify({ expiryDate: '2020-01-01T00:00:00Z' }))
  })

  it('accepts a response that writes the same instant with an equivalent offset', async () => {
    mockFetch(() => jsonResponse({ expiryDate: '2020-01-01T00:00:00+00:00' }))
    const { code, stdout } = await invoke(['2020-01-01T00:00:00Z'])
    assert.equal(code, 0)
    assert.match(stdout, /to 2020-01-01T00:00:00\+00:00\./)
  })

  it('accepts a response that names the same instant at a different offset', async () => {
    mockFetch(() => jsonResponse({ expiryDate: '2099-12-01T08:00:00Z' }))
    const { code, stdout } = await invoke([EXPIRY])
    assert.equal(code, 0)
    assert.match(stdout, /to 2099-12-01T08:00:00Z\./)
  })

  it('accepts a response that names a positive-offset request as the same instant in UTC', async () => {
    mockFetch(() => jsonResponse({ expiryDate: '2099-11-30T18:30:00Z' }))
    const { code } = await invoke(['2099-12-01T00:00:00+05:30'])
    assert.equal(code, 0)
  })

  it('reports an unknown outcome when the response has the same wall clock at a different offset', async () => {
    mockFetch(() => jsonResponse({ expiryDate: '2099-12-01T00:00:00Z' }))
    const { code, stdout, stderr } = await invoke([EXPIRY])
    assert.equal(code, 1)
    assert.equal(stdout, '')
    assert.match(stderr, /IAS answered unexpectedly\. The outcome is unknown/)
  })

  describe('rejects dates the CLI will not send', () => {
    const invalid = [
      ['no offset', '2026-12-01T00:00:00'],
      ['date only', '2026-12-01'],
      ['no seconds', '2026-12-01T00:00-08:00'],
      ['fractional seconds', '2026-12-01T00:00:00.500-08:00'],
      ['offset without a colon', '2026-12-01T00:00:00-0800'],
      ['year 0000', '0000-12-01T00:00:00Z'],
      ['month 13', '2026-13-01T00:00:00Z'],
      ['30 February', '2026-02-30T00:00:00Z'],
      ['hour 24', '2026-12-01T24:00:00Z'],
      ['offset beyond 18 hours', '2026-12-01T00:00:00+19:00'],
      ['offset minutes of 60', '2026-12-01T00:00:00+01:60'],
      ['text', 'tomorrow'],
    ]
    for (const [name, value] of invalid) {
      it(name, async () => {
        const fetchMock = mockFetch(() => jsonResponse({}))
        const { code, stdout, stderr } = await invoke([value])
        assert.equal(code, 1)
        assert.equal(fetchMock.mock.callCount(), 0)
        assert.equal(stdout, '')
        assert.ok(stderr.includes(EXPIRY), stderr)
      })
    }

    it('rejects a bad date under --dry-run too', async () => {
      const fetchMock = mockFetch(() => jsonResponse({}))
      const { code, stdout, stderr } = await invoke(['2026-12-01T00:00:00', '--dry-run'])
      assert.equal(code, 1)
      assert.equal(fetchMock.mock.callCount(), 0)
      assert.equal(stdout, '')
      assert.ok(stderr.includes(EXPIRY), stderr)
    })
  })

  describe('accepts dates at the edges of the format', () => {
    const valid = [
      ['a positive offset', '2099-12-01T00:00:00+05:30'],
      ['the maximum positive offset', '2099-12-01T00:00:00+18:00'],
      ['the maximum negative offset', '2099-12-01T00:00:00-18:00'],
      ['a leap day', '2028-02-29T00:00:00Z'],
    ]
    for (const [name, value] of valid) {
      it(name, async () => {
        const fetchMock = mockFetch(() => jsonResponse({}))
        const { code, stdout, stderr } = await invoke([value, '--dry-run'])
        assert.equal(code, 0, stderr)
        assert.equal(fetchMock.mock.callCount(), 0)
        assert.ok(stdout.includes(JSON.stringify({ expiryDate: value }, null, 2)), stdout)
      })
    }
  })

  it('--dry-run prints the request with the token redacted and sends nothing', async () => {
    const fetchMock = mockFetch(() => {
      throw new Error('must not be called')
    })
    const { code, stdout, stderr } = await invoke([EXPIRY, '--dry-run'])
    assert.equal(code, 0, stderr)
    assert.equal(fetchMock.mock.callCount(), 0)
    assert.ok(stdout.startsWith(`POST ${URL}\n`), stdout)
    assert.match(stdout, /Authorization: Bearer \[REDACTED\]/)
    assert.ok(stdout.includes(JSON.stringify({ expiryDate: EXPIRY }, null, 2)), stdout)
    assert.ok(!stdout.includes(TOKEN) && !stderr.includes(TOKEN))
  })

  it('--dry-run needs no token or login', async () => {
    const fetchMock = mockFetch(() => jsonResponse({}))
    const { code } = await invoke([EXPIRY, '--dry-run'], { XDG_CONFIG_HOME: emptyConfigHome() })
    assert.equal(code, 0)
    assert.equal(fetchMock.mock.callCount(), 0)
  })

  it('--help explains that past dates force the expired state, one way', async () => {
    let stdout = ''
    const io: Io = { stdout: (t) => (stdout += t), stderr: () => {}, isTTY: false }
    const code = await run(['mobile-app', 'set-expiry', '--help'], { io, env: {} })
    assert.equal(code, 0)
    assert.match(stdout, /Past dates are allowed and are how you force the\s+expired state/)
    assert.match(stdout, /nothing in the test API reverses that/)
    assert.match(stdout, /--hostname/)
  })

  describe('failures', () => {
    it('explains a 400 as an Activated-only precondition', async () => {
      mockFetch(() => new Response(null, { status: 400 }))
      const { code, stderr } = await invoke([EXPIRY])
      assert.equal(code, 1)
      assert.match(stderr, /Activated/)
    })

    it('names the host on a 404', async () => {
      mockFetch(() => new Response(null, { status: 404 }))
      const { code, stderr } = await invoke([EXPIRY])
      assert.equal(code, 1)
      assert.ok(stderr.includes(`on ${HOST}`), stderr)
      assert.match(stderr, /--hostname/)
    })

    it('does not retry a 500 and says the expiry may be saved', async () => {
      const fetchMock = mockFetch(() => new Response(null, { status: 500 }))
      const { code, stderr } = await invoke([EXPIRY])
      assert.notEqual(code, 0)
      assert.equal(fetchMock.mock.callCount(), 1)
      assert.match(stderr, /may have saved the expiry/)
    })

    const unexpected = [
      ['a body with no expiryDate', () => jsonResponse({})],
      ['a malformed expiryDate', () => jsonResponse({ expiryDate: 'soon' })],
      ['a different instant', () => jsonResponse({ expiryDate: '2026-12-02T00:00:00-08:00' })],
      ['an empty 204', () => new Response(null, { status: 204 })],
    ] as const
    for (const [name, respond] of unexpected) {
      it(`reports an unknown outcome for ${name}`, async () => {
        mockFetch(respond)
        const { code, stdout, stderr } = await invoke([EXPIRY])
        assert.equal(code, 1)
        assert.equal(stdout, '')
        assert.match(stderr, /IAS answered unexpectedly\. The outcome is unknown/)
      })
    }
  })
})
