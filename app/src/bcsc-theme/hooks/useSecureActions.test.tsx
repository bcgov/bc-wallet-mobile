import { storage } from '@/bcsc-theme/storage'
import { getBCSCState, selectAccountRecord } from '@/bcsc-theme/storage/hooks'
import type { BCSCStore, SliceName } from '@/bcsc-theme/storage/slices'
import {
  BCSCStoreSeed,
  nativeAccount,
  nativeCredential,
  reportSessionWritesAs,
  seedAccount,
  seedBCSCStore,
  seedBCSCStoreFromBCState,
  seedTokens,
} from '@/bcsc-theme/storage/testing'
import * as fileInfo from '@/bcsc-theme/utils/file-info'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import {
  cancelVerificationReminders,
  scheduleVerificationReminders,
} from '@/services/notifications/verificationReminders'
import { BCDispatchAction, initialState } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { Platform } from 'react-native'
import { AccountSecurityMethod, BCSCCardProcess, BCSCCardType, EvidenceMetadata } from 'react-native-bcsc-core'
import { KeyRecoveryStatus, performKeyRecovery, reRegisterNewestKey } from '../utils/key-recovery'
import { confirmRegistrationClientId } from '../utils/registration-token'
import { isTokenExpired } from '../utils/token-expiry'
import * as useBCSCApiClientModule from './useBCSCApiClient'
import { useSecureActions } from './useSecureActions'

jest.mock('@bifold/core')
jest.mock('../utils/key-recovery', () => ({
  KeyRecoveryStatus: jest.requireActual('../utils/key-recovery').KeyRecoveryStatus,
  performKeyRecovery: jest.fn(),
  reRegisterNewestKey: jest.fn(),
}))
jest.mock('../utils/registration-token', () => ({
  ...jest.requireActual('../utils/registration-token'),
  confirmRegistrationClientId: jest.fn(),
}))
jest.mock('../utils/token-expiry', () => ({
  isTokenExpired: jest.fn(),
}))
jest.mock('react-native-bcsc-core', () => ({
  AccountSecurityMethod: {
    PinNoDeviceAuth: 'app_pin_no_device_authn',
    PinWithDeviceAuth: 'app_pin_has_device_authn',
    DeviceAuth: 'device_authentication',
  },
  // Delegate to the central manual mock so values can't drift from the real enums.
  BCSCCardProcess: jest.requireActual('../../../__mocks__/react-native-bcsc-core').BCSCCardProcess,
  BCSCCardType: jest.requireActual('../../../__mocks__/react-native-bcsc-core').BCSCCardType,
  BCSCAccountType: jest.requireActual('../../../__mocks__/react-native-bcsc-core').BCSCAccountType,
  // Delegate to the central manual mock so the predicate can't drift from the real implementation.
  isBcscNativeError: jest.requireActual('../../../__mocks__/react-native-bcsc-core').isBcscNativeError,
}))
jest.mock('./useBCSCApiClient')
jest.mock('@/services/notifications/verificationReminders', () => ({
  scheduleVerificationReminders: jest.fn(),
  cancelVerificationReminders: jest.fn(),
}))

// LocaleStringFormat must resolve to a real locale so Date.toLocaleString doesn't throw; other keys
// pass through so we can assert on them directly.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'BCSC.LocaleStringFormat' ? 'en-CA' : key),
  }),
}))

const mockDispatch = jest.fn()
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}

const makeEvidence = (overrides: Partial<EvidenceMetadata> = {}): EvidenceMetadata => ({
  metadata: [],
  ...overrides,
})

// What hydrate left in the store, read through the real view (not Jest's stand-in) the app reads
const { overlayBCSCState } = jest.requireActual<typeof import('@/bcsc-theme/storage/state-view')>(
  '@/bcsc-theme/storage/state-view'
)
const captureAfterUnlock = async (field: string) => captureHydrateField(field)
const captureHydrateField = (field: string) =>
  (overlayBCSCState(initialState, storage.store.getState()).bcscSecure as unknown as Record<string, unknown>)[field]

// Swaps a store action for a mock that still runs the real one, for call and order assertions
const spyOnStoreAction = <S extends SliceName>(slice: S, action: keyof BCSCStore[S]) => {
  const real = getBCSCState()[slice][action] as (...args: any[]) => Promise<void>
  const spy = jest.fn(real)
  seedBCSCStore({ [slice]: { [action]: spy } } as BCSCStoreSeed)
  return spy
}

const nativeError = (code: string) => Object.assign(new Error(`native ${code}`), { code })

describe('useSecureActions', () => {
  beforeEach(() => {
    reportSessionWritesAs(mockDispatch)
    jest.clearAllMocks()
    jest.mocked(Bifold.useStore).mockReturnValue([
      {
        bcsc: {},
        bcscSecure: {
          isHydrated: true,
          additionalEvidenceData: [],
        },
      } as any,
      mockDispatch,
    ])
    seedBCSCStoreFromBCState({
      bcsc: {},
      bcscSecure: {
        isHydrated: true,
        additionalEvidenceData: [],
      },
    } as any as never)
    // The verify-prompt answer is saved to the app slice of the BCSC store; reported to mockDispatch in the old
    // actions' shape so the ordering assertions below still cover it
    seedBCSCStore({
      app: {
        update: jest.fn(async (patch: Record<string, unknown>) => {
          for (const [field, value] of Object.entries(patch)) {
            if (field === 'verificationStarted') {
              mockDispatch({ type: BCDispatchAction.SET_VERIFICATION_STARTED, payload: [value] })
            }
            if (field === 'verificationSkipped') {
              mockDispatch({ type: BCDispatchAction.SET_VERIFICATION_SKIPPED, payload: [value] })
            }
          }
        }),
      },
    })
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
    jest.mocked(useBCSCApiClientModule.useBCSCApiClientState).mockReturnValue({
      client: {} as any,
      isClientReady: false,
      error: undefined,
    } as any)
    jest.mocked(isTokenExpired).mockReturnValue(false)
  })

  // #3419: persistence failures surface the distinct native error code instead of a STORAGE_WRITE_ERROR catch-all.
  describe('native error mapping', () => {
    it('maps a native token-save rejection to TOKEN_SAVE_FAILED', async () => {
      seedBCSCStore({ account: { setTokens: jest.fn().mockRejectedValueOnce(nativeError('E_TOKEN_SAVE_ERROR')) } })
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.updateTokens({ refreshToken: 'abc' })).rejects.toMatchObject({
        appEvent: AppEventCode.TOKEN_SAVE_FAILED,
      })
    })

    it('groups an Android account-flags write rejection under NATIVE_STORAGE_WRITE_FAILED', async () => {
      seedBCSCStore({
        verification: { updateFlags: jest.fn().mockRejectedValueOnce(nativeError('E_SET_ACCOUNT_FLAGS_ERROR')) },
      })
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.updateAccountFlags({ isEmailVerified: true })).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_WRITE_FAILED,
      })
    })

    it('maps an authorization-request write rejection to NATIVE_STORAGE_WRITE_FAILED', async () => {
      seedBCSCStore({
        verification: { updateRequest: jest.fn().mockRejectedValueOnce(nativeError('E_SET_AUTH_REQUEST_ERROR')) },
      })
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.updateVerificationOptions([])).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_WRITE_FAILED,
      })
    })

    it('maps an evidence write rejection to NATIVE_STORAGE_WRITE_FAILED', async () => {
      seedBCSCStore({
        verification: { setEvidence: jest.fn().mockRejectedValueOnce(nativeError('E_SET_EVIDENCE_ERROR')) },
      })
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.addEvidenceType({ evidence_type: 'drivers_licence' } as any)).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_WRITE_FAILED,
      })
    })

    it('maps a delete rejection during clearAuthorizationRequest to NATIVE_STORAGE_DELETE_FAILED', async () => {
      seedBCSCStore({
        verification: { clearRequest: jest.fn().mockRejectedValueOnce(nativeError('E_DELETE_AUTH_REQUEST_ERROR')) },
      })
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.clearAuthorizationRequest()).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_DELETE_FAILED,
      })
    })

    it('maps a delete rejection during deleteSecureData to NATIVE_STORAGE_DELETE_FAILED', async () => {
      seedBCSCStore({
        verification: { clearRequest: jest.fn().mockRejectedValueOnce(nativeError('E_DELETE_AUTH_REQUEST_ERROR')) },
      })
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.deleteSecureData()).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_DELETE_FAILED,
      })
    })

    it('maps a delete rejection during deleteVerificationData to NATIVE_STORAGE_DELETE_FAILED', async () => {
      seedBCSCStore({
        verification: { clearEvidence: jest.fn().mockRejectedValueOnce(nativeError('E_DELETE_EVIDENCE_ERROR')) },
      })
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.deleteVerificationData()).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_DELETE_FAILED,
      })
    })
  })

  describe('updateResidentialAddressDraft', () => {
    it('drops a draft written once the session has no submitted address (the screen unmounting after a lock)', () => {
      const { result } = renderHook(() => useSecureActions())

      act(() => {
        result.current.updateResidentialAddressDraft({
          streetAddress: '1 Late St',
          streetAddress2: '',
          city: '',
          province: null,
          postalCode: '',
        })
      })

      expect(storage.store.getState().session.residentialAddressDraft).toBeUndefined()
    })

    it('keeps the draft in the store only, writing nothing to native storage', () => {
      const draft = { streetAddress: '123 Main St', streetAddress2: '', city: '', province: null, postalCode: '' }
      // A draft edits the submitted address, so there has to be one
      seedBCSCStore({ session: { userMetadata: { name: { first: 'A', last: 'B' } } as never } })
      const { result } = renderHook(() => useSecureActions())

      act(() => {
        result.current.updateResidentialAddressDraft(draft)
      })

      expect(storage.store.getState().session.residentialAddressDraft).toEqual(draft)
      expect(getBCSCState().verification.request).toBeUndefined()
      expect(getBCSCState().verification.flags).toBeUndefined()
    })
  })

  describe('removeIncompleteEvidence', () => {
    it('should return empty array when given empty evidence', async () => {
      const { result } = renderHook(() => useSecureActions())

      let cleaned: EvidenceMetadata[] = []
      await act(async () => {
        cleaned = await result.current.removeIncompleteEvidence([])
      })

      expect(cleaned).toEqual([])
      expect(mockDispatch).not.toHaveBeenCalled()
      expect(getBCSCState().verification.evidence).toBeUndefined()
    })

    it('should keep evidence that has both photos and documentNumber', async () => {
      const { result } = renderHook(() => useSecureActions())

      const completeEvidence = makeEvidence({
        evidenceType: { evidence_type: 'drivers_licence', image_sides: [{}, {}] } as any,
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
        documentNumber: 'DL123',
      })

      let cleaned: EvidenceMetadata[] = []
      await act(async () => {
        cleaned = await result.current.removeIncompleteEvidence([completeEvidence])
      })

      expect(cleaned).toEqual([completeEvidence])
      // Nothing was removed, so we should skip the persist/dispatch
      expect(getBCSCState().verification.evidence).toBeUndefined()
      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('should keep single-sided evidence (e.g. passport) with one photo and documentNumber', async () => {
      const { result } = renderHook(() => useSecureActions())

      const completePassport = makeEvidence({
        evidenceType: { evidence_type: 'canadian_passport', image_sides: [{}] } as any,
        metadata: [{ uri: 'front.jpg' } as any],
        documentNumber: 'P123',
      })

      let cleaned: EvidenceMetadata[] = []
      await act(async () => {
        cleaned = await result.current.removeIncompleteEvidence([completePassport])
      })

      expect(cleaned).toEqual([completePassport])
      expect(getBCSCState().verification.evidence).toBeUndefined()
      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('should remove two-sided evidence missing a side', async () => {
      const { result } = renderHook(() => useSecureActions())

      const noPhotos = makeEvidence({
        evidenceType: { evidence_type: 'drivers_licence', image_sides: [{}, {}] } as any,
        metadata: [{ uri: 'front.jpg' } as any],
        documentNumber: 'DL123',
      })

      let cleaned: EvidenceMetadata[] = []
      await act(async () => {
        cleaned = await result.current.removeIncompleteEvidence([noPhotos])
      })

      expect(cleaned).toEqual([])
      expect(getBCSCState().verification.evidence).toEqual([])
    })

    it('should remove evidence with no documentNumber', async () => {
      const { result } = renderHook(() => useSecureActions())

      const noDocNumber = makeEvidence({
        evidenceType: { evidence_type: 'passport', image_sides: [{}, {}] } as any,
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
      })

      let cleaned: EvidenceMetadata[] = []
      await act(async () => {
        cleaned = await result.current.removeIncompleteEvidence([noDocNumber])
      })

      expect(cleaned).toEqual([])
      expect(getBCSCState().verification.evidence).toEqual([])
    })

    it('should keep complete entries and remove incomplete ones', async () => {
      const { result } = renderHook(() => useSecureActions())

      const complete = makeEvidence({
        evidenceType: { evidence_type: 'drivers_licence', image_sides: [{}, {}] } as any,
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
        documentNumber: 'DL456',
      })
      const incomplete = makeEvidence({
        evidenceType: { evidence_type: 'passport', image_sides: [{}, {}] } as any,
        metadata: [{ uri: 'page.jpg' } as any, { uri: 'page2.jpg' } as any],
        // no documentNumber
      })

      let cleaned: EvidenceMetadata[] = []
      await act(async () => {
        cleaned = await result.current.removeIncompleteEvidence([complete, incomplete])
      })

      expect(cleaned).toEqual([complete])
      expect(getBCSCState().verification.evidence).toEqual([complete])
    })

    it('should dispatch updated evidence to store when incomplete entries are removed', async () => {
      const { result } = renderHook(() => useSecureActions())

      const complete = makeEvidence({
        evidenceType: { evidence_type: 'drivers_licence', image_sides: [{}, {}] } as any,
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
        documentNumber: 'DL789',
      })
      const incomplete = makeEvidence({
        evidenceType: { evidence_type: 'other_two_sided', image_sides: [{}, {}] } as any,
        metadata: [{ uri: 'page.jpg' } as any],
        documentNumber: 'P123',
      })

      await act(async () => {
        await result.current.removeIncompleteEvidence([complete, incomplete])
      })

      expect(storage.store.getState().verification.evidence).toEqual([complete])
    })
  })

  describe('truncateEvidence', () => {
    const first = makeEvidence({
      evidenceType: { evidence_type: 'passport', image_sides: [{}] } as any,
      metadata: [{ uri: 'p.jpg' } as any],
      documentNumber: 'P1',
    })
    const second = makeEvidence({
      evidenceType: { evidence_type: 'drivers_licence', image_sides: [{}, {}] } as any,
      metadata: [{ uri: 'f.jpg' } as any, { uri: 'b.jpg' } as any],
      documentNumber: 'DL1',
    })

    it('keeps the first N entries, drops the rest, and persists (release the 2nd ID, keep the 1st)', async () => {
      const { result } = renderHook(() => useSecureActions())

      let kept: EvidenceMetadata[] = []
      await act(async () => {
        kept = await result.current.truncateEvidence([first, second], 1)
      })

      expect(kept).toEqual([first])
      expect(storage.store.getState().verification.evidence).toEqual([first])
    })

    it('is a no-op when the count already covers every entry', async () => {
      const { result } = renderHook(() => useSecureActions())

      let kept: EvidenceMetadata[] = []
      await act(async () => {
        kept = await result.current.truncateEvidence([first], 1)
      })

      expect(kept).toEqual([first])
      expect(mockDispatch).not.toHaveBeenCalled()
      expect(getBCSCState().verification.evidence).toBeUndefined()
    })

    it('drops everything when truncating to 0 (back to the first list)', async () => {
      const { result } = renderHook(() => useSecureActions())

      let kept: EvidenceMetadata[] = []
      await act(async () => {
        kept = await result.current.truncateEvidence([first, second], 0)
      })

      expect(kept).toEqual([])
      expect(getBCSCState().verification.evidence).toEqual([])
    })
  })

  describe('removeAbandonedEvidence', () => {
    it('should return empty array when given empty evidence', async () => {
      const { result } = renderHook(() => useSecureActions())

      let cleaned: EvidenceMetadata[] = []
      await act(async () => {
        cleaned = await result.current.removeAbandonedEvidence([])
      })

      expect(cleaned).toEqual([])
      expect(mockDispatch).not.toHaveBeenCalled()
      expect(getBCSCState().verification.evidence).toBeUndefined()
    })

    it('should preserve in-progress evidence (all photos captured, document number pending)', async () => {
      const { result } = renderHook(() => useSecureActions())

      // User captured all sides but hasn't entered the document number yet — they were on
      // EvidenceIDCollection. This must survive hydration so they can resume there.
      const inProgress = makeEvidence({
        evidenceType: { evidence_type: 'drivers_licence', image_sides: [{}, {}] } as any,
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
        // no documentNumber
      })

      let cleaned: EvidenceMetadata[] = []
      await act(async () => {
        cleaned = await result.current.removeAbandonedEvidence([inProgress])
      })

      expect(cleaned).toEqual([inProgress])
      // Nothing removed → no persist/dispatch
      expect(getBCSCState().verification.evidence).toBeUndefined()
      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('should remove an abandoned selection with no photos captured', async () => {
      const { result } = renderHook(() => useSecureActions())

      const abandoned = makeEvidence({
        evidenceType: { evidence_type: 'passport', image_sides: [{}] } as any,
        metadata: [],
      })

      let cleaned: EvidenceMetadata[] = []
      await act(async () => {
        cleaned = await result.current.removeAbandonedEvidence([abandoned])
      })

      expect(cleaned).toEqual([])
      expect(getBCSCState().verification.evidence).toEqual([])
    })

    it('should keep complete and in-progress entries while removing abandoned ones', async () => {
      const { result } = renderHook(() => useSecureActions())

      const complete = makeEvidence({
        evidenceType: { evidence_type: 'drivers_licence', image_sides: [{}, {}] } as any,
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
        documentNumber: 'DL456',
      })
      const inProgress = makeEvidence({
        evidenceType: { evidence_type: 'passport', image_sides: [{}] } as any,
        metadata: [{ uri: 'page.jpg' } as any],
        // no documentNumber — resumable
      })
      const abandoned = makeEvidence({
        evidenceType: { evidence_type: 'other_two_sided', image_sides: [{}, {}] } as any,
        metadata: [],
      })

      let cleaned: EvidenceMetadata[] = []
      await act(async () => {
        cleaned = await result.current.removeAbandonedEvidence([complete, inProgress, abandoned])
      })

      expect(cleaned).toEqual([complete, inProgress])
      expect(getBCSCState().verification.evidence).toEqual([complete, inProgress])
    })
  })

  describe('hydrateSecureState account recovery', () => {
    const baseAccount = {
      id: 'account-1',
      issuer: '',
      clientID: '',
      securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
      displayName: 'Test User',
    }

    it('recovers issuer/clientID from authorization request and updates account, keeping its security method', async () => {
      seedAccount(nativeAccount(baseAccount))
      seedBCSCStore({
        verification: { request: { issuer: 'https://idsit.gov.bc.ca', clientID: 'recovered-client-id' } },
      })

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(selectAccountRecord(getBCSCState())).toMatchObject({
        id: 'account-1',
        issuer: 'https://idsit.gov.bc.ca',
        clientID: 'recovered-client-id',
        securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
      })
    })

    it('hydrates securityMethod from the account record', async () => {
      seedAccount(
        nativeAccount({
          ...baseAccount,
          issuer: 'https://idsit.gov.bc.ca',
          clientID: 'existing-client-id',
          securityMethod: AccountSecurityMethod.DeviceAuth,
        })
      )

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(await captureAfterUnlock('securityMethod')).toBe(AccountSecurityMethod.DeviceAuth)
    })

    it('does not update the account when it already has issuer and clientID', async () => {
      seedAccount(nativeAccount({ ...baseAccount, issuer: 'https://idsit.gov.bc.ca', clientID: 'existing-client-id' }))
      seedBCSCStore({ verification: { request: { issuer: 'https://other.example.com', clientID: 'other-client-id' } } })
      const profileBefore = getBCSCState().account.profile

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(getBCSCState().account.profile).toEqual(profileBefore)
    })

    it('does not update the account when authorization request lacks issuer/clientID', async () => {
      seedAccount(nativeAccount(baseAccount))
      // no issuer or clientID
      seedBCSCStore({ verification: { request: { deviceCode: 'abc' } } })
      const profileBefore = getBCSCState().account.profile

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(getBCSCState().account.profile).toEqual(profileBefore)
    })

    it('does not update the account when there is no authorization request', async () => {
      seedAccount(nativeAccount(baseAccount))
      const profileBefore = getBCSCState().account.profile

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(getBCSCState().account.profile).toEqual(profileBefore)
    })

    it('backfills only the missing field (clientID) from authorization request', async () => {
      seedAccount(nativeAccount({ ...baseAccount, issuer: 'https://idsit.gov.bc.ca', clientID: '' }))
      seedBCSCStore({
        verification: {
          request: { issuer: 'https://ignored-because-account-has-one.example.com', clientID: 'recovered-client-id' },
        },
      })

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(getBCSCState().account.profile).toMatchObject({
        issuer: 'https://idsit.gov.bc.ca',
        clientId: 'recovered-client-id',
      })
    })

    const captureSessionRecoveryRequired = () => captureAfterUnlock('sessionRecoveryRequired')

    it('does not flag sessionRecoveryRequired for an unverified account with no tokens (can restart verification)', async () => {
      // No tokens at all: the 0-byte tokens-file signature
      seedAccount(nativeAccount(baseAccount))

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(await captureSessionRecoveryRequired()).toBe(false)
    })

    it('does not flag sessionRecoveryRequired when a registration token still exists (in-progress verification)', async () => {
      seedAccount(nativeAccount(baseAccount))
      seedTokens({ registrationAccessToken: 'reg-token' })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(await captureSessionRecoveryRequired()).toBe(false)
    })

    it.each([
      ['no record', null, { verified: false, credentialDeactivated: false }],
      ['an Authorization record', { bcscEvent: 'Authorization' }, { verified: true, credentialDeactivated: false }],
      ['a Cancel record', { bcscEvent: 'Cancel' }, { verified: false, credentialDeactivated: true }],
      ['an Expire record', { bcscEvent: 'Expire' }, { verified: false, credentialDeactivated: true }],
    ])('hydrates the verification facts from %s', async (_label, record, facts) => {
      seedAccount(nativeAccount(baseAccount))
      seedBCSCStore({ account: { credential: record ? nativeCredential(record as never) : undefined } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydrateField('verified')).toBe(facts.verified)
      expect(captureHydrateField('credentialDeactivated')).toBe(facts.credentialDeactivated)
      expect(captureHydrateField('inVerifyFlow')).toBe(false)
    })

    it('flags sessionRecoveryRequired when a verified user has a registration token but no refresh token', async () => {
      seedAccount(nativeAccount(baseAccount))
      // Verified: a credential exists (no cancel/expire event → VERIFIED)
      seedBCSCStore({ account: { credential: nativeCredential() } })
      // Registration token present (e.g. recovered from the V3 providers file), refresh token gone
      seedTokens({ registrationAccessToken: 'reg-token' })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(await captureSessionRecoveryRequired()).toBe(true)
    })

    it('does not flag sessionRecoveryRequired when no account exists (fresh install)', async () => {
      seedAccount(null)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(await captureSessionRecoveryRequired()).toBe(false)
    })
  })

  describe('hydrateSecureState key recovery (#4166)', () => {
    const account = {
      id: 'account-1',
      issuer: 'https://idsit.gov.bc.ca',
      clientID: 'client-1',
      displayName: 'Test User',
    }
    const mockGetTokensForRefreshToken = jest.fn()

    beforeEach(() => {
      seedAccount(nativeAccount(account))
      seedTokens({ refreshToken: 'stale-refresh-token', registrationAccessToken: 'stored-reg-token' })

      mockGetTokensForRefreshToken.mockReset()
      jest.mocked(useBCSCApiClientModule.useBCSCApiClientState).mockReturnValue({
        client: { getTokensForRefreshToken: mockGetTokensForRefreshToken } as any,
        isClientReady: true,
        error: undefined,
      } as any)
    })

    it('retries the refresh once and persists a rotated reg token when recovery succeeds', async () => {
      mockGetTokensForRefreshToken
        .mockRejectedValueOnce(new Error('401'))
        .mockResolvedValueOnce({ refresh_token: 'new-refresh', access_token: 'new-access' })
      jest
        .mocked(performKeyRecovery)
        .mockResolvedValue({ status: KeyRecoveryStatus.Recovered, newRegistrationAccessToken: 'rotated-token' })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(performKeyRecovery).toHaveBeenCalledWith(
        expect.anything(),
        'client-1',
        'stored-reg-token',
        expect.anything()
      )
      expect(reRegisterNewestKey).not.toHaveBeenCalled()
      expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(2)
      expect(getBCSCState().account.tokens).toMatchObject({
        refreshToken: 'new-refresh',
        registrationAccessToken: 'rotated-token',
      })
    })

    it('falls back to reRegisterNewestKey on no_match, persists its rotated token, and retries the refresh', async () => {
      mockGetTokensForRefreshToken
        .mockRejectedValueOnce(new Error('401'))
        .mockResolvedValueOnce({ refresh_token: 'new-refresh-2', access_token: 'new-access-2' })
      jest.mocked(performKeyRecovery).mockResolvedValue({ status: KeyRecoveryStatus.NoMatch })
      jest
        .mocked(reRegisterNewestKey)
        .mockResolvedValue({ success: true, newRegistrationAccessToken: 'put-rotated-token' })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(reRegisterNewestKey).toHaveBeenCalledWith(
        expect.anything(),
        'client-1',
        'stored-reg-token',
        expect.anything()
      )
      expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(2)
      expect(getBCSCState().account.tokens?.registrationAccessToken).toBe('put-rotated-token')
    })

    it('leaves tokens stale (no retry) when recovery fails outright', async () => {
      mockGetTokensForRefreshToken.mockRejectedValue(new Error('401'))
      jest.mocked(performKeyRecovery).mockResolvedValue({ status: KeyRecoveryStatus.Failed })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(reRegisterNewestKey).not.toHaveBeenCalled()
      expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(1)
      expect(getBCSCState().account.tokens).toMatchObject({
        refreshToken: 'stale-refresh-token',
        registrationAccessToken: 'stored-reg-token',
      })
    })

    it('skips key recovery and re-registration when the refresh fails on the device clock, and still unlocks', async () => {
      mockGetTokensForRefreshToken.mockRejectedValue(AppError.fromErrorDefinition(ErrorRegistry.CLOCK_SKEW_ERROR))

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(performKeyRecovery).not.toHaveBeenCalled()
      expect(reRegisterNewestKey).not.toHaveBeenCalled()
      expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(1)
      expect(getBCSCState().account.tokens?.refreshToken).toBe('stale-refresh-token')
      expect(captureHydrateField('isHydrated')).toBe(true)
    })
  })

  describe('hydrateSecureState expired refresh token (#4654)', () => {
    const account = {
      id: 'account-1',
      issuer: 'https://idsit.gov.bc.ca',
      clientID: 'client-1',
      securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
      displayName: 'Test User',
    }
    const mockGetTokensForRefreshToken = jest.fn()

    beforeEach(() => {
      seedAccount(nativeAccount(account))
      seedTokens({ refreshToken: 'stale-refresh-token', registrationAccessToken: 'stored-reg-token' })

      mockGetTokensForRefreshToken.mockReset()
      jest.mocked(useBCSCApiClientModule.useBCSCApiClientState).mockReturnValue({
        client: { getTokensForRefreshToken: mockGetTokensForRefreshToken } as any,
        isClientReady: true,
        error: undefined,
      } as any)
    })

    it('skips the network call and key recovery, and keeps the expired token, when the stored token is expired', async () => {
      jest.mocked(isTokenExpired).mockReturnValue(true)
      const setTokens = spyOnStoreAction('account', 'setTokens')

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(performKeyRecovery).not.toHaveBeenCalled()
      expect(reRegisterNewestKey).not.toHaveBeenCalled()
      expect(captureHydrateField('refreshToken')).toBe('stale-refresh-token')
      // The stale token is still re-persisted, matching today's failure path (renewal deletes it)
      expect(setTokens).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'stale-refresh-token', registrationAccessToken: 'stored-reg-token' })
      )
    })

    it('stores the new token when the stored token is valid and refresh succeeds', async () => {
      jest.mocked(isTokenExpired).mockReturnValue(false)
      mockGetTokensForRefreshToken.mockResolvedValue({ refresh_token: 'new-refresh', access_token: 'new-access' })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).toHaveBeenCalledWith('stale-refresh-token')
      expect(captureHydrateField('refreshToken')).toBe('new-refresh')
    })

    it('stops key-recovery retries and keeps the original token when the server rejects a locally-valid token as invalid_token', async () => {
      jest.mocked(isTokenExpired).mockReturnValue(false)
      mockGetTokensForRefreshToken.mockRejectedValue(AppError.fromErrorDefinition(ErrorRegistry.INVALID_TOKEN))

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(1)
      expect(performKeyRecovery).not.toHaveBeenCalled()
      expect(reRegisterNewestKey).not.toHaveBeenCalled()
      expect(captureHydrateField('refreshToken')).toBe('stale-refresh-token')
    })

    it('treats a missing refresh token as not expired and stores no token (session recovery case)', async () => {
      // isTokenExpired is mocked true to prove isRefreshTokenExpired checks for a token first:
      // without that check, a missing token (session recovery) logs a spurious expired-token warning.
      seedTokens({ refreshToken: undefined })
      seedBCSCStore({ account: { credential: nativeCredential() } }) // verified
      jest.mocked(isTokenExpired).mockReturnValue(true)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(isTokenExpired).not.toHaveBeenCalled()
      expect(mockLogger.warn).not.toHaveBeenCalledWith(expect.stringContaining('event=refresh_token_expired'))
      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(captureHydrateField('refreshToken')).toBeUndefined()
      expect(await captureAfterUnlock('sessionRecoveryRequired')).toBe(true)
    })
  })

  const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const makeRegistrationToken = (payload: object) => `${b64url({ alg: 'RS256' })}.${b64url(payload)}.sig`

  describe('hydrateSecureState client ID backfill from the registration token (#4868)', () => {
    const emptyClientAccount = {
      id: 'account-1',
      issuer: 'https://idsit.gov.bc.ca',
      clientID: '',
      displayName: 'Test User',
      securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
    }

    const hydrate = async () => {
      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })
    }

    beforeEach(() => {
      seedAccount(nativeAccount(emptyClientAccount))
    })

    it('takes the client ID from the token aud instead of the authorization request', async () => {
      seedTokens({ registrationAccessToken: makeRegistrationToken({ aud: 'A' }) })
      seedBCSCStore({ verification: { request: { clientID: 'V3', issuer: 'https://v3' } } })

      await hydrate()

      expect(selectAccountRecord(getBCSCState())).toMatchObject({
        issuer: 'https://idsit.gov.bc.ca',
        clientID: 'A',
        securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
      })
    })

    it('backfills from the token when there is no authorization request', async () => {
      seedTokens({ registrationAccessToken: makeRegistrationToken({ aud: ['A'] }) })

      await hydrate()

      expect(getBCSCState().account.profile?.clientId).toBe('A')
    })

    it('falls back to the authorization request when there is no registration token', async () => {
      seedBCSCStore({ verification: { request: { clientID: 'V3', issuer: 'https://v3' } } })

      await hydrate()

      expect(getBCSCState().account.profile?.clientId).toBe('V3')
    })

    it.each([
      ['missing aud', { iss: 'x' }],
      ['multi-value aud', { aud: ['A', 'B'] }],
      ['non-string aud', { aud: 5 }],
    ])(
      'does not backfill when the token has a %s, even if the authorization request has a client ID',
      async (_l, claims) => {
        seedTokens({ registrationAccessToken: makeRegistrationToken(claims) })
        seedBCSCStore({ verification: { request: { clientID: 'V3', issuer: 'https://v3' } } })

        await hydrate()

        expect(getBCSCState().account.profile?.clientId).toBe('')
      }
    )

    it('does not backfill when the token is not a JWT', async () => {
      seedTokens({ registrationAccessToken: 'not-a-jwt' })
      seedBCSCStore({ verification: { request: { clientID: 'V3', issuer: 'https://v3' } } })

      await hydrate()

      expect(getBCSCState().account.profile?.clientId).toBe('')
    })
  })

  describe('hydrateSecureState client ID drift repair (#4868)', () => {
    const originalPlatform = Platform.OS
    // Realistic client IDs, so the no-leak check below can't pass just because the IDs are short.
    const OLD_ID = 'b5a1c3d2-7e44-4f0a-9d21-3c8a6f1e5b70'
    const NEW_ID = '0f8e2d41-93ab-4c6e-b7d5-a1c4e9f2036b'
    const REG_TOKEN = makeRegistrationToken({ aud: NEW_ID, iss: 'idp' })
    const account = {
      id: 'account-1',
      issuer: 'https://idsit.gov.bc.ca',
      clientID: OLD_ID,
      displayName: 'Test User',
      securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
    }
    const mockGetTokensForRefreshToken = jest.fn()
    // Mirrors the real /device/token failure: the client sets the axios message to IAS's error_description, and
    // AppError.technicalMessage surfaces it while AppError.message stays the generic "Unknown error code".
    const refreshError = (httpStatus?: number, code?: string, errorDescription?: string) => {
      if (errorDescription === undefined) {
        return Object.assign(new Error(`refresh failed ${httpStatus ?? code ?? ''}`), {
          code,
          context: { http_status: httpStatus },
        })
      }

      const cause = Object.assign(new Error(errorDescription), { isAxiosError: true, name: 'AxiosError' })
      return new AppError('Server Error: Unknown error code (unauthorized)', ErrorRegistry.UNKNOWN_SERVER_ERROR, {
        cause,
        context: { http_status: httpStatus },
      })
    }
    const unknownClientError = () => refreshError(401, undefined, `Could not find client: ${OLD_ID}`)

    const mockStoredTokens = (tokens: { refresh?: string; registration?: string } = {}) => {
      const { refresh = 'stale-refresh-token', registration = REG_TOKEN } = tokens
      seedTokens({ refreshToken: refresh || undefined, registrationAccessToken: registration || undefined })
    }

    const storedClientId = () => getBCSCState().account.profile?.clientId

    const hydrate = async () => {
      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })
    }

    // Every logger call at every level, serialized with its extra arguments. The pre-existing end-of-hydrate
    // `Hydrated secure data` debug dump prints the whole secure state and is out of scope here, so it is skipped.
    const allLoggedText = () =>
      [mockLogger.info, mockLogger.warn, mockLogger.error, mockLogger.debug]
        .flatMap((fn) => fn.mock.calls)
        .filter(([message]) => !String(message).startsWith('Hydrated secure data'))
        .map((args) => JSON.stringify(args, (_key, value) => (value instanceof Error ? value.message : value)))
        .join('\n')

    beforeEach(() => {
      Platform.OS = 'android'
      seedAccount(nativeAccount(account))
      jest.mocked(confirmRegistrationClientId).mockReset()
      jest.mocked(performKeyRecovery).mockReset()
      mockStoredTokens()

      mockGetTokensForRefreshToken.mockReset()
      jest.mocked(useBCSCApiClientModule.useBCSCApiClientState).mockReturnValue({
        client: { getTokensForRefreshToken: mockGetTokensForRefreshToken } as any,
        isClientReady: true,
        error: undefined,
      } as any)
    })

    afterEach(() => {
      Platform.OS = originalPlatform
    })

    describe('gate', () => {
      it('does nothing when the refresh succeeds with the stored client ID', async () => {
        mockGetTokensForRefreshToken.mockResolvedValue({ refresh_token: 'new-refresh', access_token: 'new-access' })

        await hydrate()

        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
        expect(storedClientId()).toBe(OLD_ID)
      })

      it('switches to the token client ID when the refresh fails and the server confirms, then retries the refresh', async () => {
        mockGetTokensForRefreshToken
          .mockRejectedValueOnce(unknownClientError())
          .mockResolvedValueOnce({ refresh_token: 'new-refresh', access_token: 'new-access' })
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'confirmed' })

        await hydrate()

        expect(confirmRegistrationClientId).toHaveBeenCalledWith(expect.anything(), NEW_ID, REG_TOKEN)
        expect(selectAccountRecord(getBCSCState())).toEqual({
          ...nativeAccount(account),
          clientID: NEW_ID,
        })
        expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(2)
        expect(performKeyRecovery).not.toHaveBeenCalled()
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('token refresh succeeded after client id repair')
        )
        expect(captureHydrateField('refreshToken')).toBe('new-refresh')
      })

      it('runs key recovery with the token client ID when the retry after the repair still fails', async () => {
        mockGetTokensForRefreshToken.mockRejectedValue(unknownClientError())
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'confirmed' })
        jest.mocked(performKeyRecovery).mockResolvedValue({ status: KeyRecoveryStatus.Failed })

        await hydrate()

        expect(performKeyRecovery).toHaveBeenCalledWith(expect.anything(), NEW_ID, REG_TOKEN, expect.anything())
      })

      it('keeps the stored client ID for key recovery when the server does not confirm', async () => {
        mockGetTokensForRefreshToken.mockRejectedValue(unknownClientError())
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'request_failed', httpStatus: 403 })
        jest.mocked(performKeyRecovery).mockResolvedValue({ status: KeyRecoveryStatus.Failed })

        await hydrate()

        expect(storedClientId()).toBe(OLD_ID)
        expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(1)
        expect(performKeyRecovery).toHaveBeenCalledWith(expect.anything(), OLD_ID, REG_TOKEN, expect.anything())
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('reason=request_failed http_status=403'))
      })

      it.each([
        ['a network error', refreshError()],
        ['a timeout', refreshError(undefined, 'ECONNABORTED')],
        ['a 500', refreshError(500)],
        ['a 503', refreshError(503)],
        ['a 403', refreshError(403)],
      ])('does not confirm when the refresh fails with %s', async (_label, error) => {
        mockGetTokensForRefreshToken.mockRejectedValue(error)
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'confirmed' })
        jest.mocked(performKeyRecovery).mockResolvedValue({ status: KeyRecoveryStatus.Failed })

        await hydrate()

        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
        expect(storedClientId()).toBe(OLD_ID)
        expect(performKeyRecovery).toHaveBeenCalledWith(expect.anything(), OLD_ID, REG_TOKEN, expect.anything())
      })

      it.each([
        ['an unknown client', `Could not find client: ${OLD_ID}`],
        ['a client that does not own the refresh token', 'Client does not own the presented refresh token'],
      ])('confirms and switches when the 401 says %s', async (_label, errorDescription) => {
        mockGetTokensForRefreshToken
          .mockRejectedValueOnce(refreshError(401, undefined, errorDescription))
          .mockResolvedValueOnce({ refresh_token: 'new-refresh', access_token: 'new-access' })
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'confirmed' })

        await hydrate()

        expect(confirmRegistrationClientId).toHaveBeenCalledWith(expect.anything(), NEW_ID, REG_TOKEN)
        expect(storedClientId()).toBe(NEW_ID)
        expect(performKeyRecovery).not.toHaveBeenCalled()
      })

      it.each([
        ['a bad signature', 'Signature did not validate for presented JWT authentication.'],
        // Expired because it was sent long after it was signed; the API client does not report that as a clock error
        ['a stale assertion', 'Assertion Token is expired: Tue Jan 01 00:00:00 GMT 2030'],
        ['no server message', ''],
      ])('does not switch the client ID when the 401 is %s', async (_label, errorDescription) => {
        mockGetTokensForRefreshToken.mockRejectedValue(
          errorDescription ? refreshError(401, undefined, errorDescription) : refreshError(401)
        )
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'confirmed' })
        jest.mocked(performKeyRecovery).mockResolvedValue({ status: KeyRecoveryStatus.Failed })

        await hydrate()

        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
        expect(storedClientId()).toBe(OLD_ID)
        expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(1)
        expect(performKeyRecovery).toHaveBeenCalledWith(expect.anything(), OLD_ID, REG_TOKEN, expect.anything())
      })

      it.each([
        ['an expired assertion', 'Assertion Token is expired: Tue Jan 01 00:00:00 GMT 2030'],
        ['a future-dated assertion', 'Assertion Token was issued in the future: Tue Jan 01 00:00:00 GMT 2030'],
      ])('neither switches the client ID nor recovers keys when the 401 is %s', async (_label, errorDescription) => {
        // The API client reports these as CLOCK_SKEW_ERROR, keeping the status and the server reason
        const cause = Object.assign(new Error(errorDescription), { isAxiosError: true, name: 'AxiosError' })
        mockGetTokensForRefreshToken.mockRejectedValue(
          AppError.fromErrorDefinition(ErrorRegistry.CLOCK_SKEW_ERROR, { cause, context: { http_status: 401 } })
        )

        await hydrate()

        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
        expect(storedClientId()).toBe(OLD_ID)
        expect(performKeyRecovery).not.toHaveBeenCalled()
      })

      it('does not confirm when the server rejected the refresh token as invalid_token', async () => {
        mockGetTokensForRefreshToken.mockRejectedValue(AppError.fromErrorDefinition(ErrorRegistry.INVALID_TOKEN))

        await hydrate()

        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
        expect(performKeyRecovery).not.toHaveBeenCalled()
      })

      it('does not confirm when there is no refresh token', async () => {
        mockStoredTokens({ refresh: '' })

        await hydrate()

        expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
        expect(storedClientId()).toBe(OLD_ID)
      })

      it('does not confirm when the refresh token is expired', async () => {
        jest.mocked(isTokenExpired).mockReturnValue(true)

        await hydrate()

        expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
      })

      it('does not confirm when the stored client ID already matches the token', async () => {
        seedAccount(nativeAccount({ ...account, clientID: NEW_ID }))
        mockGetTokensForRefreshToken.mockRejectedValue(unknownClientError())
        jest.mocked(performKeyRecovery).mockResolvedValue({ status: KeyRecoveryStatus.Failed })

        await hydrate()

        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
        expect(performKeyRecovery).toHaveBeenCalledWith(expect.anything(), NEW_ID, REG_TOKEN, expect.anything())
      })

      it('does not confirm when the token client ID is unreadable', async () => {
        mockStoredTokens({ registration: makeRegistrationToken({ iss: 'idp' }) })
        mockGetTokensForRefreshToken.mockRejectedValue(unknownClientError())
        jest.mocked(performKeyRecovery).mockResolvedValue({ status: KeyRecoveryStatus.Failed })

        await hydrate()

        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
      })

      it('does not confirm on iOS', async () => {
        Platform.OS = 'ios'
        mockGetTokensForRefreshToken.mockRejectedValue(unknownClientError())
        jest.mocked(performKeyRecovery).mockResolvedValue({ status: KeyRecoveryStatus.Failed })

        await hydrate()

        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
        expect(storedClientId()).toBe(OLD_ID)
      })

      it('skips the refresh, and so the repair, when the API client is not ready', async () => {
        jest.mocked(useBCSCApiClientModule.useBCSCApiClientState).mockReturnValue({
          client: { getTokensForRefreshToken: mockGetTokensForRefreshToken } as any,
          isClientReady: false,
          error: undefined,
        } as any)

        await hydrate()

        expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
      })
    })

    describe('outcomes', () => {
      beforeEach(() => {
        mockGetTokensForRefreshToken
          .mockRejectedValueOnce(unknownClientError())
          .mockResolvedValue({ refresh_token: 'new-refresh', access_token: 'new-access' })
        jest.mocked(performKeyRecovery).mockResolvedValue({ status: KeyRecoveryStatus.Failed })
      })

      it('persists a rotated token before switching the client ID when confirmed', async () => {
        jest
          .mocked(confirmRegistrationClientId)
          .mockResolvedValue({ status: 'confirmed', newRegistrationAccessToken: 'rotated' })
        const setTokens = spyOnStoreAction('account', 'setTokens')
        const updateProfile = spyOnStoreAction('account', 'updateProfile')

        await hydrate()

        expect(setTokens).toHaveBeenCalledWith({ registrationAccessToken: 'rotated' })
        const rotatedWrite = setTokens.mock.calls.findIndex(([tokens]) => tokens.registrationAccessToken === 'rotated')
        expect(setTokens.mock.invocationCallOrder[rotatedWrite]).toBeLessThan(updateProfile.mock.invocationCallOrder[0])
        expect(storedClientId()).toBe(NEW_ID)
        expect(captureHydrateField('registrationAccessToken')).toBe('rotated')
      })

      it('persists a rotated token but leaves the client ID alone on a mismatch', async () => {
        jest
          .mocked(confirmRegistrationClientId)
          .mockResolvedValue({ status: 'client_id_mismatch', newRegistrationAccessToken: 'rotated' })
        const setTokens = spyOnStoreAction('account', 'setTokens')

        await hydrate()

        expect(setTokens).toHaveBeenCalledWith({ registrationAccessToken: 'rotated' })
        expect(storedClientId()).toBe(OLD_ID)
        expect(performKeyRecovery).toHaveBeenCalledWith(expect.anything(), OLD_ID, 'rotated', expect.anything())
      })

      it('does not switch the client ID when the rotated token cannot be persisted', async () => {
        jest
          .mocked(confirmRegistrationClientId)
          .mockResolvedValue({ status: 'confirmed', newRegistrationAccessToken: 'rotated' })
        const { setTokens } = getBCSCState().account
        seedBCSCStore({
          account: {
            setTokens: jest.fn(async (tokens) => {
              if (tokens.registrationAccessToken === 'rotated') {
                throw nativeError('E_TOKEN_SAVE_ERROR')
              }
              return setTokens(tokens)
            }),
          },
        })

        await hydrate()

        expect(storedClientId()).toBe(OLD_ID)
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('reason=persist_failed'))
        expect(captureHydrateField('registrationAccessToken')).toBe('rotated')
      })

      it('writes nothing and still completes hydration when the confirmation times out', async () => {
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'request_failed' })
        const setTokens = spyOnStoreAction('account', 'setTokens')

        await hydrate()

        expect(storedClientId()).toBe(OLD_ID)
        // The only registration token write is the end-of-hydrate write-back of the original token.
        const registrationWrites = setTokens.mock.calls
          .map(([tokens]) => tokens.registrationAccessToken)
          .filter((token) => token !== undefined)
        expect(registrationWrites).toEqual([REG_TOKEN])
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('reason=request_failed http_status=none'))
        expect(storage.store.getState().session.isHydrated).toBe(true)
      })

      it('never logs client IDs or tokens', async () => {
        jest
          .mocked(confirmRegistrationClientId)
          .mockResolvedValue({ status: 'confirmed', newRegistrationAccessToken: 'rotated-secret' })

        await hydrate()

        const logged = allLoggedText()
        expect(logged).toContain('client_id_drift_repaired')
        expect(logged).not.toContain('rotated-secret')
        expect(logged).not.toContain(REG_TOKEN)
        expect(logged).not.toContain(OLD_ID)
        expect(logged).not.toContain(NEW_ID)
      })

      it('skips the retry when the account update rejects and the stored client ID is still the old one', async () => {
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'confirmed' })
        seedBCSCStore({ account: { updateProfile: jest.fn().mockRejectedValue(new Error('write failed')) } })

        await hydrate()

        expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(1)
        expect(performKeyRecovery).toHaveBeenCalledWith(expect.anything(), OLD_ID, REG_TOKEN, expect.anything())
      })
    })
  })

  // A refresh token IAS still accepts, with no credential record: the finish step never ran or its write
  // failed. Hydration restores the record once the server has confirmed the device, instead of treating it
  // as unverified.
  describe('hydrateSecureState credential restore', () => {
    const account = {
      id: 'account-1',
      issuer: 'https://idsit.gov.bc.ca',
      clientID: 'client-1',
      displayName: 'Test User',
    }
    const mockGetTokensForRefreshToken = jest.fn()

    beforeEach(() => {
      seedAccount(nativeAccount(account))
      seedTokens({ refreshToken: 'stored-refresh-token', registrationAccessToken: 'stored-reg-token' })
      jest.mocked(isTokenExpired).mockReturnValue(false)

      mockGetTokensForRefreshToken.mockReset()
      mockGetTokensForRefreshToken.mockResolvedValue({ refresh_token: 'new-refresh', access_token: 'new-access' })
      jest.mocked(useBCSCApiClientModule.useBCSCApiClientState).mockReturnValue({
        client: { getTokensForRefreshToken: mockGetTokensForRefreshToken } as any,
        isClientReady: true,
        error: undefined,
      } as any)
    })

    it('restores the record and hydrates as verified once IAS accepts the stored refresh token', async () => {
      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(getBCSCState().account.credential).toMatchObject({
        issuer: account.issuer,
        subject: account.clientID,
        bcscEvent: 'Authorization',
      })
      expect(captureHydrateField('verified')).toBe(true)
      expect(captureHydrateField('credentialDeactivated')).toBe(false)
      expect(captureHydrateField('inVerifyFlow')).toBe(false)
      expect(await captureAfterUnlock('sessionRecoveryRequired')).toBe(false)
    })

    it('leaves the device unverified when the refresh fails, since IAS has not confirmed it', async () => {
      mockGetTokensForRefreshToken.mockRejectedValue(new Error('network'))
      jest.mocked(performKeyRecovery).mockResolvedValue({ status: 'failed' } as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(getBCSCState().account.credential).toBeUndefined()
      expect(captureHydrateField('verified')).toBe(false)
      expect(captureHydrateField('credentialDeactivated')).toBe(false)
      expect(captureHydrateField('inVerifyFlow')).toBe(false)
    })

    it('leaves the device unverified while a started verification is being resumed, so the finish step completes setup', async () => {
      seedBCSCStore({ app: { verificationStarted: true } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).toHaveBeenCalled()
      expect(getBCSCState().account.credential).toBeUndefined()
      expect(captureHydrateField('verified')).toBe(false)
    })

    it('skips the restore for an expired refresh token, which only a renewal can fix', async () => {
      jest.mocked(isTokenExpired).mockReturnValue(true)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(getBCSCState().account.credential).toBeUndefined()
      expect(captureHydrateField('verified')).toBe(false)
    })

    it('does not write when a credential record already exists', async () => {
      seedBCSCStore({ account: { credential: nativeCredential() } })
      const setCredential = spyOnStoreAction('account', 'setCredential')

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(setCredential).not.toHaveBeenCalled()
      expect(getBCSCState().account.credential).toEqual(nativeCredential())
      expect(captureHydrateField('verified')).toBe(true)
    })

    it('does not write when there is no refresh token to confirm', async () => {
      seedTokens({ refreshToken: undefined, registrationAccessToken: undefined })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(getBCSCState().account.credential).toBeUndefined()
      expect(captureHydrateField('verified')).toBe(false)
    })

    it('completes hydration as unverified when the record cannot be written', async () => {
      seedBCSCStore({ account: { setCredential: jest.fn().mockRejectedValueOnce(new Error('write failed')) } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydrateField('verified')).toBe(false)
      expect(captureHydrateField('isHydrated')).toBe(true)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to restore'), expect.any(Error))
    })
  })

  // #4645: a keychain write failure while hydrating used to abort an already-successful unlock.
  describe('hydrateSecureState token write-back failure (#4645)', () => {
    const keychainError = () => nativeError('E_TOKEN_SAVE_FAILED')

    beforeEach(() => {
      seedAccount(nativeAccount({ id: 'a', issuer: 'https://i', clientID: 'c' }))
      seedTokens({ refreshToken: 'stored-refresh' })
    })

    it('completes hydration when the keychain rejects the token write', async () => {
      seedBCSCStore({ account: { setTokens: jest.fn().mockRejectedValue(keychainError()) } })
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await expect(result.current.hydrateSecureState()).resolves.toBeUndefined()
      })

      expect(storage.store.getState().session.isHydrated).toBe(true)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist tokens'),
        expect.anything()
      )
    })

    it('keeps refreshed and rotated tokens in the store when the write-back fails', async () => {
      const mockGetTokensForRefreshToken = jest
        .fn()
        .mockResolvedValue({ refresh_token: 'fresh-refresh', access_token: 'fresh-access' })
      jest.mocked(useBCSCApiClientModule.useBCSCApiClientState).mockReturnValue({
        client: { getTokensForRefreshToken: mockGetTokensForRefreshToken } as any,
        isClientReady: true,
        error: undefined,
      } as any)
      seedBCSCStore({ account: { setTokens: jest.fn().mockRejectedValue(keychainError()) } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(storage.store.getState().account.tokens).toMatchObject({
        refreshToken: 'fresh-refresh',
        accessToken: 'fresh-access',
      })
    })
  })

  // A failed unlock must leave nothing behind, so tapping Unlock again behaves like a first attempt.
  describe('handleSuccessfulAuth retry after a hydration failure', () => {
    const mockGetTokensForRefreshToken = jest.fn()
    // Hydrate reads no native records now, so its first step (the refresh token's expiry check) fails instead,
    // before any network call or write
    const failHydrationOnce = () => {
      jest.mocked(isTokenExpired).mockImplementationOnce(() => {
        throw new Error('hydration failed')
      })
    }

    beforeEach(() => {
      seedAccount(nativeAccount({ id: 'a', issuer: 'https://i', clientID: 'c' }))
      seedTokens({ refreshToken: 'stored-refresh' })

      mockGetTokensForRefreshToken.mockReset()
      mockGetTokensForRefreshToken.mockResolvedValue({ refresh_token: 'fresh-refresh', access_token: 'fresh-access' })
      jest.mocked(useBCSCApiClientModule.useBCSCApiClientState).mockReturnValue({
        client: { getTokensForRefreshToken: mockGetTokensForRefreshToken } as any,
        isClientReady: true,
        error: undefined,
      } as any)
    })

    it('leaves the store, keychain and server untouched when hydration fails', async () => {
      failHydrationOnce()
      const setTokens = spyOnStoreAction('account', 'setTokens')
      const profileBefore = getBCSCState().account.profile
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await expect(result.current.handleSuccessfulAuth('wallet-key')).rejects.toMatchObject({
          appEvent: AppEventCode.UNMAPPED_NATIVE_ERROR,
        })
      })

      // No wallet key and not authenticated: the user stays fully locked
      expect(storage.store.getState().session.walletKey).toBeUndefined()
      expect(storage.store.getState().session.didAuthenticate).toBe(false)
      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(setTokens).not.toHaveBeenCalled()
      expect(getBCSCState().account.profile).toEqual(profileBefore)
    })

    it('unlocks normally when the user retries after a failed hydration', async () => {
      failHydrationOnce()
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await expect(result.current.handleSuccessfulAuth('wallet-key')).rejects.toBeDefined()
      })
      await act(async () => {
        await expect(result.current.handleSuccessfulAuth('wallet-key')).resolves.toBeUndefined()
      })

      // The retry completes the full unlock: hydrated, the wallet key set, authenticated
      expect(storage.store.getState().session).toMatchObject({ isHydrated: true, didAuthenticate: true })
      expect(storage.store.getState().session.walletKey).toBeDefined()
      expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(1)
      expect(mockGetTokensForRefreshToken).toHaveBeenCalledWith('stored-refresh')
      expect(captureHydrateField('isHydrated')).toBe(true)
      expect(captureHydrateField('refreshToken')).toBe('fresh-refresh')
    })
  })

  describe('updateVerified', () => {
    const account = { id: 'account-1', issuer: 'https://idsit.gov.bc.ca', clientID: 'client-1' }

    beforeEach(() => {
      seedAccount(nativeAccount(account))
    })

    it('persists the credential record first, then ends the started verification and latches SET_VERIFICATION_SKIPPED=true', async () => {
      seedBCSCStore({ verification: { cardProcess: BCSCCardProcess.BCSCPhoto } })
      const setCredential = spyOnStoreAction('account', 'setCredential')
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateVerified(true)
      })

      expect(setCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          issuer: account.issuer,
          subject: account.clientID,
          bcscEvent: 'Authorization',
          cardType: BCSCCardType.PhotoCard,
        })
      )
      // The record is what the next unlock reads, so it is on disk before the session says verified
      expect(setCredential.mock.invocationCallOrder[0]).toBeLessThan(mockDispatch.mock.invocationCallOrder[0])
      // Verified is the record being there
      expect(storage.store.getState().account.credential).toMatchObject({
        bcscEvent: 'Authorization',
        cardType: BCSCCardType.PhotoCard,
      })
      // Nothing is left to resume on launch: an expired card later is renewed from Home
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.SET_VERIFICATION_STARTED,
        payload: [false],
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.SET_VERIFICATION_SKIPPED,
        payload: [true],
      })
    })

    it('cancels pending verification reminders when marking verified', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateVerified(true)
      })

      expect(cancelVerificationReminders).toHaveBeenCalledTimes(1)
    })

    it('throws and leaves the store alone when the credential record cannot be written', async () => {
      seedBCSCStore({ account: { setCredential: jest.fn().mockRejectedValueOnce(new Error('write failed')) } })
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.updateVerified(true)).rejects.toThrow('write failed')

      expect(cancelVerificationReminders).not.toHaveBeenCalled()
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_SECURE_VERIFIED })
      )
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.SET_VERIFICATION_STARTED })
      )
    })

    it('throws and leaves the store alone when there is no account to attach the record to', async () => {
      seedAccount(null)
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.updateVerified(true)).rejects.toThrow('no account found')

      expect(getBCSCState().account.credential).toBeUndefined()
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_SECURE_VERIFIED })
      )
    })

    it('removes the record and leaves both verification flags alone when marking unverified', async () => {
      seedBCSCStore({ account: { credential: nativeCredential() } })
      const setCredential = spyOnStoreAction('account', 'setCredential')
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateVerified(false)
      })

      expect(setCredential).toHaveBeenCalledWith(undefined)
      expect(cancelVerificationReminders).not.toHaveBeenCalled()
      expect(storage.store.getState().account.credential).toBeUndefined()
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.SET_VERIFICATION_SKIPPED })
      )
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.SET_VERIFICATION_STARTED })
      )
    })
  })

  describe('continueVerificationProcess', () => {
    it('marks verification started and the user in the verify flow', () => {
      const { result } = renderHook(() => useSecureActions())

      act(() => {
        result.current.continueVerificationProcess()
      })

      // Started makes every later launch resume the flow; the verify flag shows it now
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.SET_VERIFICATION_STARTED,
        payload: [true],
      })
      expect(storage.store.getState().session.inVerifyFlow).toEqual(true)
    })

    it('leaves the answer to the verify prompt alone', () => {
      const { result } = renderHook(() => useSecureActions())

      act(() => {
        result.current.continueVerificationProcess()
      })

      // Entering from Home (a card, a renewal) is not answering the onboarding prompt
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.SET_VERIFICATION_SKIPPED })
      )
    })
  })

  describe('updateUserInfo', () => {
    const storedRequest = () => getBCSCState().verification.request
    const storedFlags = () => getBCSCState().verification.flags

    it('dispatches and persists birthdate as a unix timestamp', async () => {
      const { result } = renderHook(() => useSecureActions())
      const birthdate = new Date('1990-01-15T00:00:00Z')

      await act(async () => {
        await result.current.updateUserInfo({ birthdate })
      })

      expect(storedRequest()?.birthdate).toBe(Math.floor(birthdate.getTime() / 1000))
    })

    it('dispatches and persists serial as csn on authorization request', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ serial: '123456789' })
      })

      expect(storedRequest()?.csn).toBe('123456789')
    })

    it('persists verifiedEmail to authorization request when email and isEmailVerified are both truthy', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: true })
      })

      expect(storedRequest()?.verifiedEmail).toBe('user@example.com')
    })

    it('does NOT persist verifiedEmail when email is provided but isEmailVerified is false (auto-lock bug)', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: false })
      })

      expect(storedRequest()?.verifiedEmail).toBeUndefined()
    })

    it('does NOT persist verifiedEmail when isEmailVerified is omitted', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com' })
      })

      expect(storedRequest()?.verifiedEmail).toBeUndefined()
    })

    it('persists emailAddress to accountFlags whenever email is provided, even if unverified', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: false })
      })

      expect(storedFlags()).toMatchObject({ emailAddress: 'user@example.com', isEmailVerified: false })
    })

    it('persists isEmailVerified=true to accountFlags when verification completes', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: true })
      })

      expect(storedFlags()).toMatchObject({ emailAddress: 'user@example.com', isEmailVerified: true })
    })

    it('keeps email and isEmailVerified in the stored flags', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: false })
      })

      expect(storage.store.getState().verification.flags).toEqual({
        emailAddress: 'user@example.com',
        isEmailVerified: false,
      })
    })

    it('merges with existing authorization request data when persisting', async () => {
      seedBCSCStore({ verification: { request: { deviceCode: 'existing-device-code', userCode: 'EXISTING' } } })

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ serial: '987654321' })
      })

      expect(storedRequest()).toMatchObject({
        deviceCode: 'existing-device-code',
        userCode: 'EXISTING',
        csn: '987654321',
      })
    })

    it('merges with existing account flags when persisting email fields', async () => {
      seedBCSCStore({
        verification: { flags: { userSkippedEmailVerification: false, userSubmittedVerificationVideo: true } },
      })

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: true })
      })

      expect(storedFlags()).toMatchObject({
        userSkippedEmailVerification: false,
        userSubmittedVerificationVideo: true,
        emailAddress: 'user@example.com',
        isEmailVerified: true,
      })
    })

    it('does not write account flags when no email-related fields are provided', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ serial: '123456789' })
      })

      expect(storedFlags()).toBeUndefined()
    })

    it('does not write the authorization request when called with no fields', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({})
      })

      expect(storedRequest()).toBeUndefined()
      expect(storedFlags()).toBeUndefined()
    })
  })

  describe('hydrateSecureState email derivation', () => {
    const captureHydratedSecureData = () => overlayBCSCState(initialState, storage.store.getState()).bcscSecure

    it('derives isEmailVerified=true when accountFlags.isEmailVerified is true', async () => {
      seedBCSCStore({ verification: { flags: { isEmailVerified: true } } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedSecureData()?.isEmailVerified).toBe(true)
    })

    it('derives isEmailVerified=true from legacy verifiedEmail when accountFlags is missing the flag (v3 migration)', async () => {
      seedBCSCStore({ verification: { flags: {}, request: { verifiedEmail: 'legacy@example.com' } } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedSecureData()?.isEmailVerified).toBe(true)
    })

    it('derives isEmailVerified=false when neither accountFlags nor verifiedEmail indicate verification (post-fix)', async () => {
      seedBCSCStore({ verification: { flags: { isEmailVerified: false, emailAddress: 'user@example.com' } } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      const hydrated = captureHydratedSecureData()
      expect(hydrated?.isEmailVerified).toBe(false)
      expect(hydrated?.emailAddress).toBe('user@example.com')
    })

    it('derives isEmailVerified=false when nothing is set at all', async () => {
      seedBCSCStore({ verification: { flags: {} } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedSecureData()?.isEmailVerified).toBeFalsy()
    })

    it('prefers accountFlags.emailAddress over authRequest.verifiedEmail for display', async () => {
      seedBCSCStore({
        verification: {
          flags: { isEmailVerified: true, emailAddress: 'unmasked@example.com' },
          request: { verifiedEmail: 'u****d@example.com' },
        },
      })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedSecureData()?.emailAddress).toBe('unmasked@example.com')
    })

    it('falls back to authRequest.verifiedEmail for emailAddress when accountFlags has none', async () => {
      seedBCSCStore({ verification: { flags: {}, request: { verifiedEmail: 'legacy@example.com' } } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedSecureData()?.emailAddress).toBe('legacy@example.com')
    })
  })

  describe('hydrateSecureState cardProcess', () => {
    const completeEvidence = [
      { evidenceType: { evidence_type: 'passport', image_sides: [{}] }, documentNumber: '123', metadata: [{}] },
    ] as unknown as EvidenceMetadata[]

    const captureHydratedCardProcess = () => captureHydrateField('cardProcess')

    it('infers NonBCSC for a migrated install with evidence but no recorded cardProcess', async () => {
      seedBCSCStore({ verification: { evidence: completeEvidence, request: {} } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedCardProcess()).toBe(BCSCCardProcess.NonBCSC)
    })

    it('still infers NonBCSC when a failed combo-card scan left a stale serial (no deviceCode)', async () => {
      // handleScanComboCard persists csn before attempting authorization, so a Non-BCSC session
      // can carry a serial from that failed attempt (see resume-step-route.test.ts:51-58).
      seedBCSCStore({ verification: { evidence: completeEvidence, request: { csn: '123456789' } } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedCardProcess()).toBe(BCSCCardProcess.NonBCSC)
    })

    it('does not infer NonBCSC once a deviceCode shows the card was actually authorized', async () => {
      seedBCSCStore({ verification: { evidence: completeEvidence, request: { csn: '123456789', deviceCode: 'dc' } } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedCardProcess()).toBeUndefined()
    })

    it('leaves cardProcess undefined when there is no evidence to infer from', async () => {
      seedBCSCStore({ verification: { evidence: [], request: {} } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedCardProcess()).toBeUndefined()
    })

    it('preserves an explicitly recorded cardProcess', async () => {
      seedBCSCStore({ verification: { evidence: [], request: { cardProcess: BCSCCardProcess.BCSCPhoto } } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedCardProcess()).toBe(BCSCCardProcess.BCSCPhoto)
    })
  })

  describe('hydrateSecureState name scrubbing', () => {
    const captureHydratedName = () => storage.store.getState().session.userMetadata?.name

    it('strips decoder-corrupted comma-dollar characters from middleNames', async () => {
      seedBCSCStore({ verification: { request: { firstName: 'anna', lastName: 'berg', middleNames: 'berg,$anna' } } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedName()).toEqual({ first: 'anna', last: 'berg', middle: 'berganna' })
    })

    it('strips other special characters from first/last name', async () => {
      seedBCSCStore({ verification: { request: { firstName: 'J!ohn#', lastName: 'Sm@ith', middleNames: undefined } } })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedName()).toEqual({ first: 'John', last: 'Smith', middle: undefined })
    })

    it('leaves already-clean names unchanged', async () => {
      seedBCSCStore({
        verification: { request: { firstName: 'Jane', lastName: "O'Brien-Smith", middleNames: 'Marie' } },
      })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedName()).toEqual({ first: 'Jane', last: "O'Brien-Smith", middle: 'Marie' })
    })
  })

  describe('updateDeviceCodes', () => {
    it('persists the expiry and schedules reminders when an expiry is provided', async () => {
      const expiresAt = new Date('2026-06-08T12:00:00Z')
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateDeviceCodes({ deviceCode: 'dc', userCode: 'uc', deviceCodeExpiresAt: expiresAt })
      })

      expect(getBCSCState().verification.request).toMatchObject({
        expiry: Math.floor(expiresAt.getTime() / 1000),
        deviceCode: 'dc',
        userCode: 'uc',
      })
      expect(scheduleVerificationReminders).toHaveBeenCalledWith(
        expiresAt,
        { title: 'BCSC.VerificationReminder.Title', body: 'BCSC.VerificationReminder.Body' },
        mockLogger
      )
    })

    it('does not schedule reminders when no expiry is provided', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateDeviceCodes({ deviceCode: 'dc' })
      })

      expect(scheduleVerificationReminders).not.toHaveBeenCalled()
    })
  })

  describe('clearAuthorizationRequest', () => {
    it('deletes the authorization request from storage', async () => {
      seedBCSCStore({ verification: { request: { deviceCode: 'dc' }, cardProcess: BCSCCardProcess.BCSCPhoto } })
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.clearAuthorizationRequest()
      })

      expect(getBCSCState().verification.request).toBeUndefined()
      expect(getBCSCState().verification.cardProcess).toBeUndefined()
    })
  })

  describe('deleteVerificationData', () => {
    it('deletes the ID photos saved for the evidence', async () => {
      const removeFile = jest.spyOn(fileInfo, 'removeFileSafely').mockResolvedValue(undefined)
      seedBCSCStore({
        verification: {
          evidence: [
            { evidenceType: { evidence_type: 'passport' }, metadata: [{ file_path: '/docs/front.jpg' }] },
          ] as never,
        },
      })
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.deleteVerificationData()
      })

      expect(removeFile).toHaveBeenCalledWith('/docs/front.jpg', mockLogger)
      removeFile.mockRestore()
    })

    it('deletes the authorization request and cancels reminders', async () => {
      seedBCSCStore({ verification: { request: { deviceCode: 'dc' } } })
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.deleteVerificationData()
      })

      expect(getBCSCState().verification.request).toBeUndefined()
      expect(cancelVerificationReminders).toHaveBeenCalledWith(mockLogger)
    })
  })

  describe('deleteSecureData', () => {
    it('deletes the ID photos saved for the evidence, then the evidence', async () => {
      const removeFile = jest.spyOn(fileInfo, 'removeFileSafely').mockResolvedValue(undefined)
      seedBCSCStore({
        verification: {
          evidence: [
            {
              evidenceType: { evidence_type: 'passport' },
              metadata: [{ file_path: '/docs/front.jpg' }, { file_path: '/docs/back.jpg' }],
            },
          ] as never,
        },
      })
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.deleteSecureData()
      })

      expect(removeFile).toHaveBeenCalledWith('/docs/front.jpg', mockLogger)
      expect(removeFile).toHaveBeenCalledWith('/docs/back.jpg', mockLogger)
      expect(getBCSCState().verification.evidence).toBeUndefined()
      removeFile.mockRestore()
    })

    it('cancels reminders when secure data is removed', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.deleteSecureData()
      })

      expect(cancelVerificationReminders).toHaveBeenCalledWith(mockLogger)
    })
  })
})
