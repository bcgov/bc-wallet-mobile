import { DispatchAction, LocalStorageKeys, PersistentStorage, TOKENS } from '@bifold/core'
import { RemoteLogger, RemoteLoggerOptions } from '@bifold/remote-logs'
import { Config } from 'react-native-config'
import { AppContainer } from './container-imp'
import { BCSCBanner } from './src/bcsc-theme/types/banners'
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

  it('drops a persisted update-available banner on load but keeps other banners', async () => {
    const serviceNotice = {
      id: BCSCBanner.IAS_SERVER_NOTIFICATION,
      title: 'Notice',
      type: 'warning',
      dismissible: false,
    }
    mockStoredValues[BCLocalStorageKeys.BCSC] = {
      appVersion: '1.0.0',
      installId: 'already-migrated',
      bannerMessages: [
        { id: BCSCBanner.APP_UPDATE_AVAILABLE, title: 'Update available', type: 'info', dismissible: true },
        serviceNotice,
      ],
    }

    const { registrations } = buildContainer()
    const loadState = registrations.get(TOKENS.LOAD_STATE) as (dispatch: jest.Mock) => Promise<void>
    const dispatch = jest.fn()

    await loadState(dispatch)

    const state = dispatch.mock.calls[0][0].payload[0]
    expect(state.bcsc.bannerMessages).toEqual([serviceNotice])
    expect(storeValueForKeySpy).not.toHaveBeenCalled()
  })

  describe('retired 4.0.x expiry banner', () => {
    const serviceNotice = {
      id: BCSCBanner.IAS_SERVER_NOTIFICATION,
      title: 'Notice',
      type: 'warning',
      dismissible: false,
    }
    const retiredBanner = {
      id: 'CardExpiringSoonBanner',
      title: 'Expires in 9 days',
      description: 'Renew your account before it expires',
      type: 'warning',
      dismissible: false,
    }

    const load = async () => {
      const { registrations } = buildContainer()
      const loadState = registrations.get(TOKENS.LOAD_STATE) as (dispatch: jest.Mock) => Promise<void>
      const dispatch = jest.fn()
      await loadState(dispatch)
      return dispatch
    }

    it('drops it on load, persists the cleaned blob once, and stays gone after a restart', async () => {
      mockStoredValues[BCLocalStorageKeys.BCSC] = {
        appVersion: '1.0.0',
        installId: 'already-migrated',
        bannerMessages: [retiredBanner, serviceNotice],
      }

      const firstDispatch = await load()

      expect(firstDispatch.mock.calls[0][0].payload[0].bcsc.bannerMessages).toEqual([serviceNotice])
      expect(storeCalls).toHaveLength(1)
      const [{ key, value }] = storeCalls as [{ key: string; value: { bannerMessages: unknown[] } }]
      expect(key).toBe(BCLocalStorageKeys.BCSC)
      expect(value.bannerMessages).toEqual([serviceNotice])

      // Restart: a fresh container loads the blob that was just saved
      mockStoredValues[BCLocalStorageKeys.BCSC] = value
      storeCalls = []
      storeValueForKeySpy.mockClear()

      const secondDispatch = await load()

      expect(secondDispatch.mock.calls[0][0].payload[0].bcsc.bannerMessages).toEqual([serviceNotice])
      expect(storeValueForKeySpy).not.toHaveBeenCalled()
    })

    it('still loads cleaned state when the write-back fails, and retries the cleanup next launch', async () => {
      mockStoredValues[BCLocalStorageKeys.BCSC] = {
        appVersion: '1.0.0',
        installId: 'already-migrated',
        bannerMessages: [retiredBanner, serviceNotice],
      }
      storeValueForKeySpy.mockRejectedValue(new Error('disk full'))

      const firstDispatch = await load()

      expect(firstDispatch).toHaveBeenCalledTimes(1)
      expect(firstDispatch.mock.calls[0][0].payload[0].bcsc.bannerMessages).toEqual([serviceNotice])
      expect(storeValueForKeySpy).toHaveBeenCalledTimes(1)

      // The stored blob is unchanged, so the next launch cleans and tries to write again
      const secondDispatch = await load()

      expect(secondDispatch.mock.calls[0][0].payload[0].bcsc.bannerMessages).toEqual([serviceNotice])
      expect(storeValueForKeySpy).toHaveBeenCalledTimes(2)
    })
  })

  it('keeps the empty bannerMessages default when the persisted state has none', async () => {
    mockStoredValues[BCLocalStorageKeys.BCSC] = { appVersion: '1.0.0', installId: 'already-migrated' }

    const { registrations } = buildContainer()
    const loadState = registrations.get(TOKENS.LOAD_STATE) as (dispatch: jest.Mock) => Promise<void>
    const dispatch = jest.fn()

    await loadState(dispatch)

    const state = dispatch.mock.calls[0][0].payload[0]
    expect(state.bcsc.bannerMessages).toEqual([])
  })
})

describe('AppContainer TOKENS.LOAD_STATE (mediator preferences vs MEDIATOR_URL)', () => {
  const previous = 'https://mediator.example/invite?oob=previous'
  const current = 'https://mediator.example/invite?oob=current'
  const custom = 'https://mediator-dev.example/invite?oob=custom'

  let storeValueForKeySpy: jest.SpyInstance
  let storeCalls: { key: unknown; value: unknown }[]

  const loadPreferences = async () => {
    const { registrations } = buildContainer()
    const loadState = registrations.get(TOKENS.LOAD_STATE) as (dispatch: jest.Mock) => Promise<void>
    const dispatch = jest.fn()

    await loadState(dispatch)
    // The write-back is not awaited by LOAD_STATE; let its chain settle before asserting on it
    await new Promise((resolve) => setImmediate(resolve))

    return dispatch.mock.calls[0][0].payload[0].preferences
  }

  beforeEach(() => {
    mockStoredValues = {}
    storeCalls = []
    Config.MEDIATOR_URL = current
    jest
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
    delete Config.MEDIATOR_URL
    jest.restoreAllMocks()
  })

  it('adopts MEDIATOR_URL over a persisted selection when no URL was recorded, and records both', async () => {
    mockStoredValues[LocalStorageKeys.Preferences] = { selectedMediator: previous, availableMediators: [previous] }

    const preferences = await loadPreferences()

    expect(preferences.selectedMediator).toBe(current)
    expect(preferences.availableMediators).toEqual([current])
    expect(storeCalls).toEqual([
      { key: LocalStorageKeys.Preferences, value: expect.objectContaining({ selectedMediator: current }) },
      { key: BCLocalStorageKeys.MediatorUrl, value: current },
    ])
  })

  it('keeps a mediator picked in developer mode while MEDIATOR_URL is unchanged', async () => {
    mockStoredValues[BCLocalStorageKeys.MediatorUrl] = current
    mockStoredValues[LocalStorageKeys.Preferences] = { selectedMediator: custom, availableMediators: [current, custom] }

    const preferences = await loadPreferences()

    expect(preferences.selectedMediator).toBe(custom)
    expect(preferences.availableMediators).toEqual([current, custom])
    expect(storeValueForKeySpy).not.toHaveBeenCalled()
  })

  it('moves a user on the previous default to a changed MEDIATOR_URL', async () => {
    mockStoredValues[BCLocalStorageKeys.MediatorUrl] = previous
    mockStoredValues[LocalStorageKeys.Preferences] = {
      selectedMediator: previous,
      availableMediators: [previous, custom],
    }

    const preferences = await loadPreferences()

    expect(preferences.selectedMediator).toBe(current)
    expect(preferences.availableMediators).toEqual([current, custom])
    expect(storeCalls.map(({ key }) => key)).toEqual([LocalStorageKeys.Preferences, BCLocalStorageKeys.MediatorUrl])
  })

  it('leaves the recorded URL alone when the preferences cannot be written', async () => {
    mockStoredValues[BCLocalStorageKeys.MediatorUrl] = previous
    mockStoredValues[LocalStorageKeys.Preferences] = { selectedMediator: previous, availableMediators: [previous] }
    storeValueForKeySpy.mockImplementation((key: unknown) => {
      storeCalls.push({ key, value: undefined })
      return key === LocalStorageKeys.Preferences ? Promise.reject(new Error('disk full')) : Promise.resolve(undefined)
    })

    await loadPreferences()

    expect(storeCalls.map(({ key }) => key)).toEqual([LocalStorageKeys.Preferences])
  })
})
