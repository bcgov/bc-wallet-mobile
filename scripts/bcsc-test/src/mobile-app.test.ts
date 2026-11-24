import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, it, mock } from 'node:test'
import { run } from './cli.ts'
import { writeCachedToken, writeHosts } from './config.ts'
import type { Io } from './spec.ts'

const HOST = 'iddev.gov.bc.ca'
const URL = `https://${HOST}/test/idv/v1/accounts/mobile-app/NCNF-ZNTB/expiry`
const STATUS_URL = `https://${HOST}/test/idv/v1/accounts/mobile-app/NCNF-ZNTB/status`
const EXPIRY = '2099-12-01T00:00:00-08:00'
const TOKEN = 'sentinel-token-value'

const emptyConfigHome = (): string => mkdtempSync(join(tmpdir(), 'bcsc-test-'))

const invokeCommand =
  (command: string) =>
  async (argv: string[], env: NodeJS.ProcessEnv = { BCSC_TEST_TOKEN: TOKEN }) => {
    let stdout = ''
    let stderr = ''
    const io: Io = { stdout: (t) => (stdout += t), stderr: (t) => (stderr += t), isTTY: false }
    const code = await run(['mobile-app', command, 'NCNF-ZNTB', ...argv, '--hostname', HOST], { io, env })
    return { code, stdout, stderr }
  }

const invoke = invokeCommand('set-expiry')
const invokeStatus = invokeCommand('set-status')

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

describe('mobile-app set-status', () => {
  const emptyOk = () => new Response(null, { status: 200 })

  it('posts the reason with the caller-supplied token and reports that the status was switched', async () => {
    const fetchMock = mockFetch(emptyOk)
    const { code, stdout, stderr } = await invokeStatus(['--reason', 'E2E1'])
    assert.equal(code, 0, stderr)
    assert.equal(fetchMock.mock.callCount(), 1)
    const [url, init] = sentRequest(fetchMock, 0)
    assert.equal(url, STATUS_URL)
    assert.equal(init.method, 'POST')
    assert.equal((init.headers as Record<string, string>).Authorization, `Bearer ${TOKEN}`)
    assert.equal(init.body, JSON.stringify({ reason: 'E2E1' }))
    assert.match(stdout, new RegExp(`Changed the status of NCNF-ZNTB on ${HOST}`))
    assert.match(stdout, /Activated mobile app is now Suspended, and a Suspended one is now Activated/)
    assert.match(stdout, /again to reverse it/)
  })

  it('sends a padded reason trimmed', async () => {
    const fetchMock = mockFetch(emptyOk)
    const { code } = await invokeStatus(['--reason', ' E2E1 '])
    assert.equal(code, 0)
    assert.equal(sentRequest(fetchMock, 0)[1].body, JSON.stringify({ reason: 'E2E1' }))
  })

  it('uses the host named by --hostname', async () => {
    const fetchMock = mockFetch(emptyOk)
    let stdout = ''
    const io: Io = { stdout: (t) => (stdout += t), stderr: () => {}, isTTY: false }
    const code = await run(
      ['mobile-app', 'set-status', 'NCNF-ZNTB', '--reason', 'E2E1', '--hostname', 'idsit.gov.bc.ca'],
      {
        io,
        env: { BCSC_TEST_TOKEN: TOKEN },
      }
    )
    assert.equal(code, 0)
    assert.equal(
      sentRequest(fetchMock, 0)[0],
      'https://idsit.gov.bc.ca/test/idv/v1/accounts/mobile-app/NCNF-ZNTB/status'
    )
    assert.match(stdout, /on idsit\.gov\.bc\.ca/)
  })

  it('uses the saved login when no token is supplied', async () => {
    const env = { XDG_CONFIG_HOME: emptyConfigHome() }
    writeHosts(env, { hosts: { [HOST]: { activeClient: 'tester', clients: { tester: { source: 'keychain' } } } } })
    writeCachedToken(env, HOST, 'tester', {
      accessToken: 'saved-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    })
    const fetchMock = mockFetch(emptyOk)
    const { code, stderr } = await invokeStatus(['--reason', 'E2E1'], env)
    assert.equal(code, 0, stderr)
    assert.equal((sentRequest(fetchMock, 0)[1].headers as Record<string, string>).Authorization, 'Bearer saved-token')
  })

  it('asks for a login, and sends nothing, when there is no token', async () => {
    const fetchMock = mockFetch(emptyOk)
    const { code, stderr } = await invokeStatus(['--reason', 'E2E1'], { XDG_CONFIG_HOME: emptyConfigHome() })
    assert.notEqual(code, 0)
    assert.equal(fetchMock.mock.callCount(), 0)
    assert.match(stderr, /Not logged in/)
  })

  describe('rejects reasons the CLI will not send', () => {
    const invalid = [
      ['a space', 'Flaky test'],
      ['punctuation', 'INC-123'],
      ['an underscore', 'E2E_1'],
      ['a non-ASCII letter', 'Café1'],
      ['26 characters', 'A'.repeat(26)],
    ]
    for (const [name, value] of invalid) {
      it(name, async () => {
        const fetchMock = mockFetch(emptyOk)
        const { code, stdout, stderr } = await invokeStatus(['--reason', value])
        assert.equal(code, 1)
        assert.equal(fetchMock.mock.callCount(), 0)
        assert.equal(stdout, '')
        assert.match(stderr, /E2E1/)
        assert.match(stderr, /Nothing was sent/)
      })
    }

    it('rejects a bad reason under --dry-run too', async () => {
      const fetchMock = mockFetch(emptyOk)
      const { code, stdout, stderr } = await invokeStatus(['--reason', 'INC-123', '--dry-run'])
      assert.equal(code, 1)
      assert.equal(fetchMock.mock.callCount(), 0)
      assert.equal(stdout, '')
      assert.match(stderr, /E2E1/)
    })

    it('requires --reason', async () => {
      const fetchMock = mockFetch(emptyOk)
      const { code, stdout, stderr } = await invokeStatus([])
      assert.equal(code, 1)
      assert.equal(fetchMock.mock.callCount(), 0)
      assert.equal(stdout, '')
      assert.match(stderr, /--reason is required\./)
    })

    it('treats a blank --reason as missing', async () => {
      const fetchMock = mockFetch(emptyOk)
      const { code, stderr } = await invokeStatus(['--reason', ''])
      assert.equal(code, 1)
      assert.equal(fetchMock.mock.callCount(), 0)
      assert.match(stderr, /--reason is required\./)
    })
  })

  describe('accepts reasons at the edges of the rule', () => {
    for (const [name, value] of [
      ['1 character', 'A'],
      ['25 characters', 'a1'.repeat(12) + 'Z'],
    ]) {
      it(name, async () => {
        const fetchMock = mockFetch(emptyOk)
        const { code, stdout, stderr } = await invokeStatus(['--reason', value, '--dry-run'])
        assert.equal(code, 0, stderr)
        assert.equal(fetchMock.mock.callCount(), 0)
        assert.ok(stdout.includes(JSON.stringify({ reason: value }, null, 2)), stdout)
      })
    }
  })

  it('--dry-run prints the request with the token redacted and sends nothing', async () => {
    const fetchMock = mockFetch(() => {
      throw new Error('must not be called')
    })
    const { code, stdout, stderr } = await invokeStatus(['--reason', 'E2E1', '--dry-run'])
    assert.equal(code, 0, stderr)
    assert.equal(fetchMock.mock.callCount(), 0)
    assert.ok(stdout.startsWith(`POST ${STATUS_URL}\n`), stdout)
    assert.match(stdout, /Authorization: Bearer \[REDACTED\]/)
    assert.ok(stdout.includes(JSON.stringify({ reason: 'E2E1' }, null, 2)), stdout)
    assert.doesNotMatch(stdout, /Changed the status/)
    assert.ok(!stdout.includes(TOKEN) && !stderr.includes(TOKEN))
  })

  it('--dry-run needs no token or login', async () => {
    const fetchMock = mockFetch(emptyOk)
    const { code } = await invokeStatus(['--reason', 'E2E1', '--dry-run'], { XDG_CONFIG_HOME: emptyConfigHome() })
    assert.equal(code, 0)
    assert.equal(fetchMock.mock.callCount(), 0)
  })

  it('--help says what the change does to the device and lists --hostname', async () => {
    let stdout = ''
    const io: Io = { stdout: (t) => (stdout += t), stderr: () => {}, isTTY: false }
    const code = await run(['mobile-app', 'set-status', '--help'], { io, env: {} })
    assert.equal(code, 0)
    assert.match(stdout, /An Activated mobile app becomes\s+Suspended and a Suspended one becomes Activated/)
    assert.match(stdout, /reverses\s+it/)
    assert.match(stdout, /Problem with Account/)
    assert.match(stdout, /card\s+tap/)
    assert.match(stdout, /not a reliable check/)
    assert.match(stdout, /--hostname/)
  })

  describe('failures', () => {
    it('explains a 400 as an Activated-or-Suspended precondition', async () => {
      mockFetch(() => new Response(null, { status: 400 }))
      const { code, stderr } = await invokeStatus(['--reason', 'E2E1'])
      assert.equal(code, 1)
      assert.match(stderr, /Activated or Suspended/)
    })

    it('names the host on a 404', async () => {
      mockFetch(() => new Response(null, { status: 404 }))
      const { code, stderr } = await invokeStatus(['--reason', 'E2E1'])
      assert.equal(code, 1)
      assert.ok(stderr.includes(`on ${HOST}`), stderr)
      assert.match(stderr, /--hostname/)
    })

    for (const status of [500, 502, 503, 504, 507, 524]) {
      it(`does not retry a ${status} and says to check before running it again`, async () => {
        const fetchMock = mockFetch(() => new Response(null, { status }))
        const { code, stdout, stderr } = await invokeStatus(['--reason', 'E2E1'])
        assert.equal(code, 1)
        assert.equal(fetchMock.mock.callCount(), 1)
        assert.equal(stdout, '')
        assert.match(stderr, /may or may not have changed the status/)
        assert.match(stderr, /a second run switches it back/)
        assert.doesNotMatch(stderr, /Retry/)
      })
    }

    it('keeps the not-implemented message for a 501', async () => {
      mockFetch(() => new Response(null, { status: 501 }))
      const { code, stderr } = await invokeStatus(['--reason', 'E2E1'])
      assert.equal(code, 1)
      assert.match(stderr, /does not implement this operation/)
      assert.doesNotMatch(stderr, /may or may not/)
    })

    const redirected = () => {
      const response = new Response(null, { status: 200 })
      Object.defineProperty(response, 'redirected', { value: true })
      return response
    }
    const unreadable = () =>
      new Response(new ReadableStream({ start: (controller) => controller.error(new Error('stream failed')) }), {
        status: 200,
      })
    const unexpected = [
      ['an empty 204', () => new Response(null, { status: 204 })],
      ['a 200 that followed a redirect', redirected],
      ['a 200 with a body', () => new Response('{"status":"SUSPENDED"}', { status: 200 })],
      ['a 200 whose body cannot be read', unreadable],
    ] as const
    for (const [name, respond] of unexpected) {
      it(`reports an unknown outcome for ${name}`, async () => {
        mockFetch(respond)
        const { code, stdout, stderr } = await invokeStatus(['--reason', 'E2E1'])
        assert.equal(code, 1)
        assert.equal(stdout, '')
        assert.match(stderr, /IAS answered unexpectedly\. The outcome is unknown; check the device/)
        assert.match(stderr, /a second run switches the status back/)
        assert.doesNotMatch(stderr, /check the registration/)
      })
    }
  })
})
