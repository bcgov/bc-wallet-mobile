import { FIXTURES } from './fixtures'
import { CrashInjected, createTestEnv } from './test-env'

describe.each(FIXTURES)('$name', (fixture) => {
  it('migrates to LATEST and matches the expected store', async () => {
    const env = createTestEnv(fixture.input)
    expect(await env.storage.open()).toEqual(fixture.expectedResult)
    expect(env.dump()).toEqual(fixture.expected)
  })

  it('puts every key in the backend its slice declares', async () => {
    const env = createTestEnv(fixture.input)
    await env.storage.open()
    expect(env.misplacedKeys()).toEqual([])
  })

  it('gives the same result when interrupted after any write', async () => {
    const writes = await createTestEnv(fixture.input).countWrites()
    for (let n = 0; n < writes; n++) {
      const env = createTestEnv(fixture.input, { crashAfterWrite: n })
      await expect(env.storage.open()).rejects.toThrow(CrashInjected)
      env.restart()
      expect(await env.storage.open()).toEqual(fixture.expectedResult)
      expect(env.dump()).toEqual(fixture.expected)
    }
  })

  it('is stable when opened again', async () => {
    const env = createTestEnv(fixture.input)
    await env.storage.open()
    env.restart()
    expect(await env.storage.open()).toEqual(fixture.expectedResult)
    expect(env.dump()).toEqual(fixture.expected)
  })
})

describe('wipe', () => {
  it.each(FIXTURES.filter((f) => f.expectedResult.status === 'ok'))(
    '$name: gives a fresh install when interrupted after any write',
    async (fixture) => {
      const fresh = FIXTURES[0].expected
      const probe = createTestEnv(fixture.input)
      await probe.storage.open()
      const before = probe.writes()
      await probe.storage.wipe()
      const wipeWrites = probe.writes() - before

      // From 1: a crash on the first write means the wipe flag was never set, so the wipe never started
      for (let n = 1; n < wipeWrites; n++) {
        const env = createTestEnv(fixture.input)
        await env.storage.open()
        env.restart()
        // Crash n writes into the wipe
        const crashing = createTestEnv(fixture.input, { crashAfterWrite: env.writes() + n })
        await crashing.storage.open()
        await expect(crashing.storage.wipe()).rejects.toThrow(CrashInjected)
        crashing.restart()
        expect(await crashing.storage.open()).toEqual({ status: 'ok' })
        expect(crashing.dump()).toEqual(fresh)
      }
    }
  )
})

describe('an unreadable native record on a 4.1 device', () => {
  const account = {
    id: 'account-1',
    issuer: 'https://idsit.gov.bc.ca/device/',
    clientID: 'client-1',
    securityMethod: 'app_pin_no_device_authn',
  }
  const input = {
    native: { account: { status: 'ok', value: account }, tokens: { status: 'unreadable', reason: 'decrypt' } },
  } as Parameters<typeof createTestEnv>[0]

  it('finishes m0001 and stops at m0002, importing nothing as empty', async () => {
    const env = createTestEnv(input)

    expect(await env.storage.open()).toEqual({ status: 'migration-failed', step: 'move-native-data', attempts: 1 })
    expect(env.dump().plain['meta/version']).toBe(1)
    expect(env.dump().encrypted['account/profile']).toBeUndefined()
    expect(env.dump().keychain['account/tokens']).toBeUndefined()
    expect(env.dump().native).toEqual(input?.native)
  })

  it('counts each attempt, so Retry tries again', async () => {
    const env = createTestEnv(input)
    await env.storage.open()
    env.restart()

    expect(await env.storage.open()).toEqual({ status: 'migration-failed', step: 'move-native-data', attempts: 2 })
  })
})
