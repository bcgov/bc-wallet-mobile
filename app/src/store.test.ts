import { InstallIdSystemCheck } from './services/system-checks/InstallIdSystemCheck'
import { BCDispatchAction, initialState, migrateBCSCState, reducer } from './store'

jest.mock('react-native-config', () => ({
  BUILD_TARGET: 'bcsc',
  DEFAULT_ENVIRONMENT: '',
}))

jest.mock('react-native-device-info', () => ({
  getApplicationName: jest.fn(() => 'BCServicesCard'),
  getVersion: jest.fn(() => '4.0.0'),
  getBuildNumber: jest.fn(() => '100'),
  getSystemName: jest.fn(() => 'iOS'),
  getSystemVersion: jest.fn(() => '17.4'),
  getDeviceId: jest.fn(() => 'iPhone15,2'),
}))

jest.mock('react-native-bcsc-core', () => ({}))
jest.mock('react-native-uuid', () => ({ v4: jest.fn(() => 'test-uuid') }))
jest.mock('@bifold/core', () => ({
  defaultState: { preferences: {}, tours: {}, onboarding: {}, loginAttempt: {}, migration: {} },
  mergeReducers: jest.fn((_base: any, custom: any) => custom),
  reducer: jest.fn(),
  PersistentStorage: { storeValueForKey: jest.fn() },
}))

describe('reducer', () => {
  it('UPDATE_APP_VERSION sets appVersion and appBuildNumber', () => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, appVersion: '', appBuildNumber: '' } }
    const result = reducer(state, { type: BCDispatchAction.UPDATE_APP_VERSION })

    expect(result.bcsc.appVersion).toBe('4.0.0')
    expect(result.bcsc.appBuildNumber).toBe('100')
  })

  it('CLEAR_BCSC preserves installId while resetting other bcsc fields', () => {
    const state = {
      ...initialState,
      bcsc: { ...initialState.bcsc, installId: 'existing-install-id', selectedNickname: 'Alice' },
    }
    const result = reducer(state, { type: BCDispatchAction.CLEAR_BCSC })

    expect(result.bcsc.installId).toBe('existing-install-id')
    expect(result.bcsc.selectedNickname).toBeUndefined()
  })

  it('CLEAR_BCSC keeps state.installId even when the payload carries a conflicting installId', () => {
    const state = {
      ...initialState,
      bcsc: { ...initialState.bcsc, installId: 'existing-install-id' },
    }
    const result = reducer(state, {
      type: BCDispatchAction.CLEAR_BCSC,
      payload: [{ installId: 'payload-supplied-id' }],
    })

    expect(result.bcsc.installId).toBe('existing-install-id')
  })

  it('CLEAR_BCSC falls back to a payload-supplied installId when state has none', () => {
    const state = {
      ...initialState,
      bcsc: { ...initialState.bcsc, installId: undefined },
    }
    const result = reducer(state, {
      type: BCDispatchAction.CLEAR_BCSC,
      payload: [{ installId: 'payload-supplied-id' }],
    })

    expect(result.bcsc.installId).toBe('payload-supplied-id')
  })

  it('SET_INSTALL_ID stores the dispatched payload value', () => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, installId: undefined } }
    const result = reducer(state, { type: BCDispatchAction.SET_INSTALL_ID, payload: ['new-install-id'] })

    expect(result.bcsc.installId).toBe('new-install-id')
  })
})

describe('migrateBCSCState', () => {
  it('maps a legacy reportUUID-only blob to installId', () => {
    const result = migrateBCSCState({ reportUUID: 'x' })

    expect(result).toEqual({ bcsc: { installId: 'x' }, migrated: true })
    expect(result.bcsc).not.toHaveProperty('reportUUID')
  })

  it('prefers an existing installId over a legacy reportUUID, and still strips the legacy field', () => {
    const result = migrateBCSCState({ installId: 'y', reportUUID: 'x' })

    expect(result).toEqual({ bcsc: { installId: 'y' }, migrated: true })
    expect(result.bcsc).not.toHaveProperty('reportUUID')
  })

  it('is a no-op when installId is already set and there is no legacy field (idempotent re-run)', () => {
    const result = migrateBCSCState({ installId: 'y' })

    expect(result).toEqual({ bcsc: { installId: 'y' }, migrated: false })
  })

  it('is a no-op for a blob with neither field (idempotent re-run)', () => {
    const result = migrateBCSCState({})

    expect(result).toEqual({ bcsc: {}, migrated: false })
  })

  it('composes with InstallIdSystemCheck so a migrated legacy id passes runCheck', () => {
    // Unit-level composition only - does not exercise the actual launch path. See
    // app/container-imp.test.ts for the real "existing install keeps its id" proof.
    const { bcsc } = migrateBCSCState({ reportUUID: 'x' })
    const check = new InstallIdSystemCheck(bcsc.installId, jest.fn())

    expect(check.runCheck()).toBe(true)
  })
})
