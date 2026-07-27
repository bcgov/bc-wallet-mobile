import { DispatchAction, PersistentStorage, TOKENS } from '@bifold/core'
import { RemoteLogger, RemoteLoggerOptions } from '@bifold/remote-logs'
import { AppContainer } from './container-imp'
import { BCLocalStorageKeys } from './src/store'

// LOAD_STATE-level regression test for the reportUUID -> installId migration (issue #4325).
//
// This exercises the actual TOKENS.LOAD_STATE closure registered by AppContainer.init() rather
// than the extracted migrateBCSCState()/InstallIdSystemCheck units in isolation, because neither
// of those unit tests can observe a break in the *wiring* between them (e.g. the migrated blob
// never being assigned back to the local `bcsc` variable before it's folded into STATE_DISPATCH).
//
// Everything AppContainer.init() registers other than TOKENS.LOAD_STATE is irrelevant here; the
// child container is a minimal spy (not a real tsyringe container) purely so `.init()` can run
// through its ~30 registerInstance calls without throwing and hand back the one closure we need.
//
// PersistentStorage is spied on (not module-mocked) so both container-imp.ts's own reference and
// this file's reference are guaranteed to be the exact same class object.

jest.mock('react-native-config', () => ({
  Config: { BUILD_TARGET: 'bcsc', OCA_URL: '' },
  BUILD_TARGET: 'bcsc',
  OCA_URL: '',
}))

// TOKENS.LOAD_STATE also awaits bifold-core's loadLoginAttempt(), which reaches into
// react-native-keychain (a native module unavailable in the test environment). This is
// unrelated to the migration under test; getGenericPassword resolving falsy is the library's
// documented "no stored credentials found" case, so loadLoginAttempt resolves to undefined.
jest.mock('react-native-keychain', () => ({
  default: { getGenericPassword: jest.fn().mockResolvedValue(false) },
  getGenericPassword: jest.fn().mockResolvedValue(false),
}))

let mockStoredValues: Record<string, unknown>

const buildContainer = () => {
  const registrations = new Map<unknown, unknown>()
  const fakeChildContainer = {
    registerInstance: jest.fn((token: unknown, value: unknown) => registrations.set(token, value)),
  }
  const fakeBifoldContainer = { container: { createChildContainer: () => fakeChildContainer } } as never

  const logger = new RemoteLogger({} as RemoteLoggerOptions) // class is mocked globally in jestSetup.js
  new AppContainer(fakeBifoldContainer, ((k: string) => k) as never, jest.fn(), jest.fn(), logger).init()

  return { registrations }
}

describe('AppContainer TOKENS.LOAD_STATE (reportUUID -> installId migration wiring)', () => {
  let getValueForKeySpy: jest.SpyInstance
  let storeValueForKeySpy: jest.SpyInstance
  // The real PersistentStorage.storeValueForKey does `JSON.stringify(value)` synchronously at
  // call time (see @bifold/core's storage.js), so a caller that later mutates the same object
  // reference cannot retroactively change what was actually persisted. A bare
  // `mockResolvedValue(undefined)` doesn't replicate that - jest's `.mock.calls` records the
  // *live reference*, so any later mutation to the object (e.g. a scrub running after a
  // mis-ordered write) would silently "fix" the recorded call, and this test would pass even
  // when the write-after-scrub ordering it exists to pin was broken. Snapshotting synchronously
  // here, exactly like the real implementation, closes that hole.
  let storeCalls: { key: unknown; value: unknown }[]

  beforeEach(() => {
    mockStoredValues = {}
    storeCalls = []
    getValueForKeySpy = jest
      .spyOn(PersistentStorage.prototype, 'getValueForKey')
      .mockImplementation((key: string) => Promise.resolve(mockStoredValues[key] as never))
    storeValueForKeySpy = jest
      .spyOn(PersistentStorage, 'storeValueForKey')
      .mockImplementation((key: unknown, value: unknown) => {
        storeCalls.push({ key, value: JSON.parse(JSON.stringify(value)) })
        return Promise.resolve(undefined)
      })
  })

  afterEach(() => {
    getValueForKeySpy.mockRestore()
    storeValueForKeySpy.mockRestore()
  })

  it('migrates a legacy-persisted reportUUID into installId on the STATE_DISPATCH payload, persisting the scrubbed blob', async () => {
    // photoPath seeds a transient field the LOAD_STATE closure always nulls out. Its presence
    // here is what makes the write-back assertion below actually pin the write-after-scrub
    // ordering rather than just the migration itself.
    mockStoredValues[BCLocalStorageKeys.BCSC] = {
      appVersion: '1.0.0',
      reportUUID: 'x',
      photoPath: 'file://leftover.jpg',
    }

    const { registrations } = buildContainer()
    const loadState = registrations.get(TOKENS.LOAD_STATE) as (dispatch: jest.Mock) => Promise<void>
    const dispatch = jest.fn()

    await loadState(dispatch)

    expect(dispatch).toHaveBeenCalledTimes(1)
    const dispatched = dispatch.mock.calls[0][0]
    expect(dispatched.type).toBe(DispatchAction.STATE_DISPATCH)

    const state = dispatched.payload[0]
    expect(state.bcsc.installId).toBe('x')
    expect(state.bcsc).not.toHaveProperty('reportUUID')

    // Write-back happens AFTER the transient-field scrub (see container-imp.ts), so the persisted
    // blob must be the migrated *and* scrubbed shape - not a stale snapshot of what was just read
    // from storage (which still had a leftover photoPath). BCLocalStorageKeys.BCSC is only ever
    // read back through this same scrub, so persisting a pre-scrub blob would just be dead data.
    expect(storeCalls).toHaveLength(1)
    const [{ key: writtenKey, value: writtenBlob }] = storeCalls as [{ key: string; value: Record<string, unknown> }]
    expect(writtenKey).toBe(BCLocalStorageKeys.BCSC)
    expect(writtenBlob.installId).toBe('x')
    expect(writtenBlob).not.toHaveProperty('reportUUID')
    // photoPath is entirely absent (not merely undefined) because JSON.stringify - which the real
    // storeValueForKey uses, and which storeCalls replicates above - drops undefined-valued keys.
    expect(writtenBlob).not.toHaveProperty('photoPath')
  })

  it('leaves installId undefined for a fresh install with nothing persisted', async () => {
    const { registrations } = buildContainer()
    const loadState = registrations.get(TOKENS.LOAD_STATE) as (dispatch: jest.Mock) => Promise<void>
    const dispatch = jest.fn()

    await loadState(dispatch)

    const state = dispatch.mock.calls[0][0].payload[0]
    expect(state.bcsc.installId).toBeUndefined()
    expect(storeValueForKeySpy).not.toHaveBeenCalled()
  })

  it('does not re-write storage when installId is already migrated (idempotent)', async () => {
    mockStoredValues[BCLocalStorageKeys.BCSC] = { appVersion: '1.0.0', installId: 'already-migrated' }

    const { registrations } = buildContainer()
    const loadState = registrations.get(TOKENS.LOAD_STATE) as (dispatch: jest.Mock) => Promise<void>
    const dispatch = jest.fn()

    await loadState(dispatch)

    const state = dispatch.mock.calls[0][0].payload[0]
    expect(state.bcsc.installId).toBe('already-migrated')
    expect(storeValueForKeySpy).not.toHaveBeenCalled()
  })
})
