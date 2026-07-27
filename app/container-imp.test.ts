import { DispatchAction, PersistentStorage, TOKENS } from '@bifold/core'
import { RemoteLogger, RemoteLoggerOptions } from '@bifold/remote-logs'
import { AppContainer } from './container-imp'
import { BCLocalStorageKeys } from './src/store'

// LOAD_STATE-level regression test for the reportUUID -> installId migration (issue #4325):
// pins the real TOKENS.LOAD_STATE wiring, which migrateBCSCState()/InstallIdSystemCheck's own
// unit tests structurally cannot observe.
// PersistentStorage is spied on (not module-mocked) so this file and container-imp.ts resolve to the same class object.

jest.mock('react-native-config', () => ({
  Config: { BUILD_TARGET: 'bcsc', OCA_URL: '' },
  BUILD_TARGET: 'bcsc',
  OCA_URL: '',
}))

// loadLoginAttempt() (awaited by LOAD_STATE) needs react-native-keychain; a falsy getGenericPassword means "no stored credentials".
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
  // Snapshots synchronously here (like the real storeValueForKey's JSON.stringify) rather than
  // recording the live object reference - otherwise a later mutation (e.g. the scrub) would
  // silently rewrite what this test sees, regardless of the actual write ordering.
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
    // photoPath seeds a transient field the scrub nulls out, so the assertion below actually pins write-after-scrub ordering.
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

    // Write-back happens after the transient-field scrub (see container-imp.ts), so the persisted blob must be migrated *and* scrubbed.
    expect(storeCalls).toHaveLength(1)
    const [{ key: writtenKey, value: writtenBlob }] = storeCalls as [{ key: string; value: Record<string, unknown> }]
    expect(writtenKey).toBe(BCLocalStorageKeys.BCSC)
    expect(writtenBlob.installId).toBe('x')
    expect(writtenBlob).not.toHaveProperty('reportUUID')
    // photoPath is absent, not merely undefined, because JSON.stringify (replicated in storeCalls above) drops undefined-valued keys.
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
