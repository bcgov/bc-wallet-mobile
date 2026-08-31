import { InstallIdSystemCheck } from './services/system-checks/InstallIdSystemCheck'
import {
  BCDispatchAction,
  BCLocalStorageKeys,
  initialState,
  migrateBCSCState,
  reducer,
  VerificationStatus,
} from './store'

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

import { PersistentStorage } from '@bifold/core'

const mockedStoreValueForKey = PersistentStorage.storeValueForKey as jest.Mock

describe('reducer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

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

  it('KEY_ROTATION_ATTEMPTED sets and persists lastKeyRotationAttemptAt', () => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, lastKeyRotationAttemptAt: undefined } }
    const result = reducer(state, {
      type: BCDispatchAction.KEY_ROTATION_ATTEMPTED,
      payload: ['2026-01-01T00:00:00.000Z'],
    })

    expect(result.bcsc.lastKeyRotationAttemptAt).toBe('2026-01-01T00:00:00.000Z')
    // Losing this persistence call means the throttle timestamp resets every launch, which
    // re-fires generate/PUT/rollback-delete on every launch during a persistent outage —
    // exactly the churn the 7-day backoff exists to prevent.
    expect(mockedStoreValueForKey).toHaveBeenCalledWith(
      BCLocalStorageKeys.BCSC,
      expect.objectContaining({ lastKeyRotationAttemptAt: '2026-01-01T00:00:00.000Z' })
    )
  })

  it('RECORD_APP_LAUNCH_VERSION sets and persists lastSeenAppVersion/lastSeenAppBuildNumber', () => {
    const state = {
      ...initialState,
      bcsc: { ...initialState.bcsc, lastSeenAppVersion: undefined, lastSeenAppBuildNumber: undefined },
    }
    const result = reducer(state, {
      type: BCDispatchAction.RECORD_APP_LAUNCH_VERSION,
      payload: [{ version: '4.1.0', buildNumber: '1234' }],
    })

    expect(result.bcsc.lastSeenAppVersion).toBe('4.1.0')
    expect(result.bcsc.lastSeenAppBuildNumber).toBe('1234')
    expect(mockedStoreValueForKey).toHaveBeenCalledWith(
      BCLocalStorageKeys.BCSC,
      expect.objectContaining({ lastSeenAppVersion: '4.1.0', lastSeenAppBuildNumber: '1234' })
    )
  })

  it.each([
    ['true (skipped)', true],
    ['false (opted in, unfinished)', false],
    ['undefined (reset)', undefined],
  ])('SET_VERIFICATION_SKIPPED stores and persists %s', (_label, value) => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, verificationSkipped: undefined } }
    const result = reducer(state, { type: BCDispatchAction.SET_VERIFICATION_SKIPPED, payload: [value] })

    expect(result.bcsc.verificationSkipped).toBe(value)
    expect(mockedStoreValueForKey).toHaveBeenCalledWith(
      BCLocalStorageKeys.BCSC,
      expect.objectContaining({ verificationSkipped: value })
    )
  })

  it('UPDATE_SECURE_VERIFIED only touches secure state, leaving verificationSkipped to its own action', () => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, verificationSkipped: false } }
    const result = reducer(state, { type: BCDispatchAction.UPDATE_SECURE_VERIFIED, payload: [true] })

    expect(result.bcscSecure.verified).toBe(true)
    expect(result.bcscSecure.verifiedStatus).toBe(VerificationStatus.VERIFIED)
    expect(result.bcsc.verificationSkipped).toBe(false)
    expect(mockedStoreValueForKey).not.toHaveBeenCalledWith(BCLocalStorageKeys.BCSC, expect.anything())
  })

  it('CLEAR_BCSC resets verificationSkipped to undefined', () => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, verificationSkipped: false } }
    const result = reducer(state, { type: BCDispatchAction.CLEAR_BCSC })

    expect(result.bcsc.verificationSkipped).toBeUndefined()
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

  it('stamps verificationSkipped:true on an onboarded blob that predates the field', () => {
    const result = migrateBCSCState({ hasAccount: true })

    expect(result).toEqual({ bcsc: { hasAccount: true, verificationSkipped: false }, migrated: true })
  })

  it.each([true, false])('leaves an existing verificationSkipped (%s) untouched', (verificationSkipped) => {
    const result = migrateBCSCState({ hasAccount: true, verificationSkipped })

    expect(result).toEqual({ bcsc: { hasAccount: true, verificationSkipped }, migrated: false })
  })

  it('does not stamp verificationSkipped when there is no account yet (fresh install)', () => {
    const result = migrateBCSCState({ hasAccount: false })

    expect(result).toEqual({ bcsc: { hasAccount: false }, migrated: false })
  })

  it('applies both the reportUUID and verificationSkipped migrations together', () => {
    const result = migrateBCSCState({ hasAccount: true, reportUUID: 'x' })

    expect(result).toEqual({
      bcsc: { hasAccount: true, installId: 'x', verificationSkipped: false },
      migrated: true,
    })
    expect(result.bcsc).not.toHaveProperty('reportUUID')
  })

  it('composes with InstallIdSystemCheck so a migrated legacy id passes runCheck', () => {
    // Unit-level composition only - does not exercise the actual launch path. See
    // app/container-imp.test.ts for the real "existing install keeps its id" proof.
    const { bcsc } = migrateBCSCState({ reportUUID: 'x' })
    const check = new InstallIdSystemCheck(bcsc.installId, jest.fn())

    expect(check.runCheck()).toBe(true)
  })
})
