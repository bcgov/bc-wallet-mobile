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
    resolve: jest.fn((token: unknown) => registrations.get(token)),
  }
  const fakeBifoldContainer = { container: { createChildContainer: () => fakeChildContainer } } as never

  const logger = new RemoteLogger({} as RemoteLoggerOptions) // class is mocked globally in jestSetup.js
  const appContainer = new AppContainer(fakeBifoldContainer, ((k: string) => k) as never, jest.fn(), jest.fn(), logger)
  appContainer.init()

  return { registrations, appContainer }
}

describe('AppContainer TOKENS.LOAD_STATE (reportUUID -> installId migration wiring)', () => {
  let getValueForKeySpy: jest.SpyInstance
  let storeValueForKeySpy: jest.SpyInstance

  beforeEach(() => {
    mockStoredValues = {}
    getValueForKeySpy = jest
      .spyOn(PersistentStorage.prototype, 'getValueForKey')
      .mockImplementation((key: string) => Promise.resolve(mockStoredValues[key] as never))
    storeValueForKeySpy = jest.spyOn(PersistentStorage, 'storeValueForKey').mockResolvedValue(undefined)
  })

  afterEach(() => {
    getValueForKeySpy.mockRestore()
    storeValueForKeySpy.mockRestore()
  })

  it('migrates a legacy-persisted reportUUID into installId on the STATE_DISPATCH payload', async () => {
    mockStoredValues[BCLocalStorageKeys.BCSC] = { appVersion: '1.0.0', reportUUID: 'x' }

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

    // Best-effort write-back under the new field name.
    expect(storeValueForKeySpy).toHaveBeenCalledWith(
      BCLocalStorageKeys.BCSC,
      expect.objectContaining({ installId: 'x' })
    )
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
