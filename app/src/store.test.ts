import type { BCSCBannerMessage } from './bcsc-theme/components/AppBanner'
// Not imported via AppBanner: that would load the theme, which this suite's @bifold/core mock cannot support
import { BCSCBanner } from './bcsc-theme/types/banners'
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

  it('UPDATE_SECURE_SECURITY_METHOD stores the method on secure state without persisting it', () => {
    const result = reducer(initialState, {
      type: BCDispatchAction.UPDATE_SECURE_SECURITY_METHOD,
      payload: ['device_authentication'],
    })

    expect(result.bcscSecure.securityMethod).toBe('device_authentication')
    expect(mockedStoreValueForKey).not.toHaveBeenCalledWith(BCLocalStorageKeys.BCSC, expect.anything())
  })

  describe('UPDATE_SECURE_RESIDENTIAL_ADDRESS_DRAFT', () => {
    const draft = { streetAddress: '123 Main St', streetAddress2: '', city: '', province: null, postalCode: '' }
    // The address step follows the name step, so a verification in memory always carries userMetadata
    const verifying = {
      ...initialState,
      bcscSecure: { ...initialState.bcscSecure, userMetadata: { name: { first: 'John', last: 'Doe' } } },
    }

    it('keeps the draft on secure state without persisting anything', () => {
      const result = reducer(verifying, {
        type: BCDispatchAction.UPDATE_SECURE_RESIDENTIAL_ADDRESS_DRAFT,
        payload: [draft],
      })

      expect(result.bcscSecure.residentialAddressDraft).toEqual(draft)
      expect(mockedStoreValueForKey).not.toHaveBeenCalled()
    })

    it('discards the draft when dispatched without one', () => {
      const state = { ...verifying, bcscSecure: { ...verifying.bcscSecure, residentialAddressDraft: draft } }
      const result = reducer(state, {
        type: BCDispatchAction.UPDATE_SECURE_RESIDENTIAL_ADDRESS_DRAFT,
        payload: [undefined],
      })

      expect(result.bcscSecure.residentialAddressDraft).toBeUndefined()
    })

    it('is dropped with the rest of the secure state on lock or logout', () => {
      const state = { ...verifying, bcscSecure: { ...verifying.bcscSecure, residentialAddressDraft: draft } }
      const result = reducer(state, { type: BCDispatchAction.CLEAR_SECURE_STATE })

      expect(result.bcscSecure.residentialAddressDraft).toBeUndefined()
    })

    it('refuses a draft written after the secure state was cleared, so a lock or reset cannot bring it back', () => {
      // The address screen writes its draft as it unmounts, and a lock or a verification reset unmounts
      // it by clearing the secure state first, so the write arrives on the cleared state
      const cleared = reducer(verifying, { type: BCDispatchAction.CLEAR_SECURE_STATE })
      const result = reducer(cleared, {
        type: BCDispatchAction.UPDATE_SECURE_RESIDENTIAL_ADDRESS_DRAFT,
        payload: [draft],
      })

      expect(result.bcscSecure.residentialAddressDraft).toBeUndefined()
    })
  })

  it('CLEAR_BCSC resets verificationSkipped to undefined', () => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, verificationSkipped: false } }
    const result = reducer(state, { type: BCDispatchAction.CLEAR_BCSC })

    expect(result.bcsc.verificationSkipped).toBeUndefined()
  })

  it.each([
    ['true (started)', true],
    ['false (finished)', false],
    ['undefined (reset)', undefined],
  ])('SET_VERIFICATION_STARTED stores and persists %s', (_label, value) => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, verificationStarted: undefined } }
    const result = reducer(state, { type: BCDispatchAction.SET_VERIFICATION_STARTED, payload: [value] })

    expect(result.bcsc.verificationStarted).toBe(value)
    expect(mockedStoreValueForKey).toHaveBeenCalledWith(
      BCLocalStorageKeys.BCSC,
      expect.objectContaining({ verificationStarted: value })
    )
  })

  it('SET_VERIFICATION_STARTED leaves the answer to the verify prompt alone', () => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, verificationSkipped: true } }
    const result = reducer(state, { type: BCDispatchAction.SET_VERIFICATION_STARTED, payload: [true] })

    expect(result.bcsc.verificationSkipped).toBe(true)
  })

  it('CLEAR_BCSC resets verificationStarted to undefined', () => {
    const state = { ...initialState, bcsc: { ...initialState.bcsc, verificationStarted: true } }
    const result = reducer(state, { type: BCDispatchAction.CLEAR_BCSC })

    expect(result.bcsc.verificationStarted).toBeUndefined()
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

  it('stamps verificationSkipped:true (and so not started) on an onboarded blob that predates both fields', () => {
    const result = migrateBCSCState({ hasAccount: true })

    expect(result).toEqual({
      bcsc: { hasAccount: true, verificationSkipped: true, verificationStarted: false },
      migrated: true,
    })
  })

  it.each([true, false])('leaves an existing verificationSkipped (%s) untouched', (verificationSkipped) => {
    const result = migrateBCSCState({ hasAccount: true, verificationSkipped, verificationStarted: false })

    expect(result).toEqual({
      bcsc: { hasAccount: true, verificationSkipped, verificationStarted: false },
      migrated: false,
    })
  })

  it.each([
    // Continue on the prompt or Start on the Home card: launches already resumed these users
    ['started', false, true],
    ['not started', true, false],
  ])(
    'carries a blob that predates verificationStarted over as %s when verificationSkipped is %s',
    (_label, verificationSkipped, verificationStarted) => {
      const result = migrateBCSCState({ hasAccount: true, verificationSkipped })

      expect(result).toEqual({ bcsc: { hasAccount: true, verificationSkipped, verificationStarted }, migrated: true })
    }
  )

  it('leaves an existing verificationStarted untouched', () => {
    // Skipped the prompt, then started from Home: the skip answer must not reset the start
    const result = migrateBCSCState({ hasAccount: true, verificationSkipped: true, verificationStarted: true })

    expect(result).toEqual({
      bcsc: { hasAccount: true, verificationSkipped: true, verificationStarted: true },
      migrated: false,
    })
  })

  it('does not stamp either verification flag when there is no account yet (fresh install)', () => {
    const result = migrateBCSCState({ hasAccount: false })

    expect(result).toEqual({ bcsc: { hasAccount: false }, migrated: false })
  })

  it('applies the reportUUID and verification-flag migrations together', () => {
    const result = migrateBCSCState({ hasAccount: true, reportUUID: 'x' })

    expect(result).toEqual({
      bcsc: { hasAccount: true, installId: 'x', verificationSkipped: true, verificationStarted: false },
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

  describe('bannerMessages', () => {
    const deviceLimit = { id: BCSCBanner.DEVICE_LIMIT_EXCEEDED, title: 'Limit', type: 'error' } as BCSCBannerMessage
    const serviceNotice = {
      id: BCSCBanner.IAS_SERVER_NOTIFICATION,
      title: 'Notice',
      type: 'warning',
    } as BCSCBannerMessage
    const retired4xBanner = {
      id: 'CardExpiringSoonBanner',
      title: 'Expires in 9 days',
      description: 'Renew your account before it expires',
      type: 'warning',
      dismissible: false,
    } as unknown as BCSCBannerMessage
    const futureBanner = { id: 'SomeFutureBanner', title: 'Future', type: 'info' } as unknown as BCSCBannerMessage

    it('drops banners whose id is not a current BCSCBanner, keeping the rest in order', () => {
      const result = migrateBCSCState({ bannerMessages: [deviceLimit, retired4xBanner, futureBanner, serviceNotice] })

      expect(result).toEqual({ bcsc: { bannerMessages: [deviceLimit, serviceNotice] }, migrated: true })
    })

    it('is idempotent: running again on the cleaned result changes nothing', () => {
      const first = migrateBCSCState({ bannerMessages: [deviceLimit, retired4xBanner, serviceNotice] })
      const second = migrateBCSCState(first.bcsc)

      expect(second).toEqual({ bcsc: { bannerMessages: [deviceLimit, serviceNotice] }, migrated: false })
    })

    it.each(Object.values(BCSCBanner))('keeps a current %s banner', (id) => {
      const banner = { id, title: 'Title', type: 'info' } as BCSCBannerMessage

      expect(migrateBCSCState({ bannerMessages: [banner] })).toEqual({
        bcsc: { bannerMessages: [banner] },
        migrated: false,
      })
    })

    it.each([[{ bannerMessages: [] }], [{}]])('has nothing to clean in %j', (persisted) => {
      expect(migrateBCSCState(persisted)).toEqual({ bcsc: persisted, migrated: false })
    })
  })
})
