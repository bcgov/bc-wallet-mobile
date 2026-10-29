import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import {
  cancelVerificationReminders,
  scheduleVerificationReminders,
} from '@/services/notifications/verificationReminders'
import { BCDispatchAction, VerificationStatus } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { Platform } from 'react-native'
import {
  AccountSecurityMethod,
  BCSCCardProcess,
  BCSCCardType,
  deleteAuthorizationRequest,
  deleteCredential,
  deleteEvidence,
  EvidenceMetadata,
  getAccount,
  getAccountFlags,
  getAuthorizationRequest,
  getCredential,
  getEvidence,
  getSavedServices,
  getToken,
  setAccount,
  setAccountFlags,
  setAuthorizationRequest,
  setCredential,
  setEvidence,
  setToken,
  TokenType,
} from 'react-native-bcsc-core'
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
  TokenType: { Refresh: 0, Registration: 2, Access: 1 },
  // Delegate to the central manual mock so values can't drift from the real enums.
  BCSCCardProcess: jest.requireActual('../../../__mocks__/react-native-bcsc-core').BCSCCardProcess,
  BCSCCardType: jest.requireActual('../../../__mocks__/react-native-bcsc-core').BCSCCardType,
  BCSCAccountType: jest.requireActual('../../../__mocks__/react-native-bcsc-core').BCSCAccountType,
  setEvidence: jest.fn(),
  setAccount: jest.fn(),
  setAccountFlags: jest.fn(),
  setAuthorizationRequest: jest.fn(),
  setCredential: jest.fn().mockResolvedValue(undefined),
  setToken: jest.fn(),
  // Delegate to the central manual mock so the predicate can't drift from the real implementation.
  isBcscNativeError: jest.requireActual('../../../__mocks__/react-native-bcsc-core').isBcscNativeError,
  getAccount: jest.fn(),
  getAccountFlags: jest.fn(),
  getAuthorizationRequest: jest.fn(),
  getCredential: jest.fn(),
  getEvidence: jest.fn(),
  getSavedServices: jest.fn(),
  getToken: jest.fn(),
  deleteAuthorizationRequest: jest.fn().mockResolvedValue(true),
  deleteAccountFlags: jest.fn().mockResolvedValue(true),
  deleteEvidence: jest.fn().mockResolvedValue(true),
  deleteSavedServices: jest.fn().mockResolvedValue(true),
  deleteCredential: jest.fn().mockResolvedValue(undefined),
  deleteToken: jest.fn().mockResolvedValue(true),
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

/** Reads a field off the payload of the last dispatched HYDRATE_SECURE_STATE action. */
const captureHydrateField = (field: string) => {
  const hydrateCall = mockDispatch.mock.calls.find(([action]) => action.type === BCDispatchAction.HYDRATE_SECURE_STATE)
  return hydrateCall?.[0]?.payload?.[0]?.[field]
}

describe('useSecureActions', () => {
  beforeEach(() => {
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
    const nativeError = (code: string) => Object.assign(new Error(`native ${code}`), { code })

    it('maps a native token-save rejection to TOKEN_SAVE_FAILED', async () => {
      jest.mocked(setToken).mockRejectedValueOnce(nativeError('E_TOKEN_SAVE_ERROR'))
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.updateTokens({ refreshToken: 'abc' })).rejects.toMatchObject({
        appEvent: AppEventCode.TOKEN_SAVE_FAILED,
      })
    })

    it('groups an Android account-flags write rejection under NATIVE_STORAGE_WRITE_FAILED', async () => {
      jest.mocked(getAccountFlags).mockResolvedValueOnce({} as any)
      jest.mocked(setAccountFlags).mockRejectedValueOnce(nativeError('E_SET_ACCOUNT_FLAGS_ERROR'))
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.updateAccountFlags({ isEmailVerified: true })).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_WRITE_FAILED,
      })
    })

    it('maps an authorization-request write rejection to NATIVE_STORAGE_WRITE_FAILED', async () => {
      jest.mocked(getAuthorizationRequest).mockResolvedValueOnce(undefined as any)
      jest.mocked(setAuthorizationRequest).mockRejectedValueOnce(nativeError('E_SET_AUTH_REQUEST_ERROR'))
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.updateVerificationOptions([])).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_WRITE_FAILED,
      })
    })

    it('maps an evidence write rejection to NATIVE_STORAGE_WRITE_FAILED', async () => {
      jest.mocked(setEvidence).mockRejectedValueOnce(nativeError('E_SET_EVIDENCE_ERROR'))
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.addEvidenceType({ evidence_type: 'drivers_licence' } as any)).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_WRITE_FAILED,
      })
    })

    it('maps a native read rejection during hydration to NATIVE_STORAGE_READ_FAILED', async () => {
      jest.mocked(getAccount).mockRejectedValueOnce(nativeError('E_GET_ACCOUNT_ERROR'))
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.hydrateSecureState()).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_READ_FAILED,
      })
    })

    it('maps a delete rejection during clearAuthorizationRequest to NATIVE_STORAGE_DELETE_FAILED', async () => {
      jest.mocked(deleteAuthorizationRequest).mockRejectedValueOnce(nativeError('E_DELETE_AUTH_REQUEST_ERROR'))
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.clearAuthorizationRequest()).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_DELETE_FAILED,
      })
    })

    it('maps a delete rejection during deleteSecureData to NATIVE_STORAGE_DELETE_FAILED', async () => {
      jest.mocked(deleteAuthorizationRequest).mockRejectedValueOnce(nativeError('E_DELETE_AUTH_REQUEST_ERROR'))
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.deleteSecureData()).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_DELETE_FAILED,
      })
    })

    it('maps a delete rejection during deleteVerificationData to NATIVE_STORAGE_DELETE_FAILED', async () => {
      jest.mocked(deleteEvidence).mockRejectedValueOnce(nativeError('E_DELETE_EVIDENCE_ERROR'))
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.deleteVerificationData()).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_DELETE_FAILED,
      })
    })
  })

  describe('updateResidentialAddressDraft', () => {
    it('keeps the draft in the store only, writing nothing to native storage', () => {
      const draft = { streetAddress: '123 Main St', streetAddress2: '', city: '', province: null, postalCode: '' }
      const { result } = renderHook(() => useSecureActions())

      act(() => {
        result.current.updateResidentialAddressDraft(draft)
      })

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_RESIDENTIAL_ADDRESS_DRAFT,
        payload: [draft],
      })
      expect(setAuthorizationRequest).not.toHaveBeenCalled()
      expect(setAccountFlags).not.toHaveBeenCalled()
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
      expect(setEvidence).not.toHaveBeenCalled()
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
      expect(setEvidence).not.toHaveBeenCalled()
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
      expect(setEvidence).not.toHaveBeenCalled()
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
      expect(setEvidence).toHaveBeenCalledWith([])
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
      expect(setEvidence).toHaveBeenCalledWith([])
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
      expect(setEvidence).toHaveBeenCalledWith([complete])
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

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_EVIDENCE_METADATA,
        payload: [[complete]],
      })
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
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_EVIDENCE_METADATA,
        payload: [[first]],
      })
      expect(setEvidence).toHaveBeenCalledWith([first])
    })

    it('is a no-op when the count already covers every entry', async () => {
      const { result } = renderHook(() => useSecureActions())

      let kept: EvidenceMetadata[] = []
      await act(async () => {
        kept = await result.current.truncateEvidence([first], 1)
      })

      expect(kept).toEqual([first])
      expect(mockDispatch).not.toHaveBeenCalled()
      expect(setEvidence).not.toHaveBeenCalled()
    })

    it('drops everything when truncating to 0 (back to the first list)', async () => {
      const { result } = renderHook(() => useSecureActions())

      let kept: EvidenceMetadata[] = []
      await act(async () => {
        kept = await result.current.truncateEvidence([first, second], 0)
      })

      expect(kept).toEqual([])
      expect(setEvidence).toHaveBeenCalledWith([])
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
      expect(setEvidence).not.toHaveBeenCalled()
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
      expect(setEvidence).not.toHaveBeenCalled()
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
      expect(setEvidence).toHaveBeenCalledWith([])
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
      expect(setEvidence).toHaveBeenCalledWith([complete, inProgress])
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

    beforeEach(() => {
      jest.mocked(getToken).mockResolvedValue(null as any)
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
    })

    it('recovers issuer/clientID from authorization request and updates account, keeping its security method', async () => {
      jest.mocked(getAccount).mockResolvedValue(baseAccount as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({
        issuer: 'https://idsit.gov.bc.ca',
        clientID: 'recovered-client-id',
      } as any)

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(setAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'account-1',
          issuer: 'https://idsit.gov.bc.ca',
          clientID: 'recovered-client-id',
          securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
        })
      )
    })

    it('hydrates securityMethod from the account record', async () => {
      jest.mocked(getAccount).mockResolvedValue({
        ...baseAccount,
        issuer: 'https://idsit.gov.bc.ca',
        clientID: 'existing-client-id',
        securityMethod: AccountSecurityMethod.DeviceAuth,
      } as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null)

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydrateField('securityMethod')).toBe(AccountSecurityMethod.DeviceAuth)
    })

    it('does not call setAccount when account already has issuer and clientID', async () => {
      jest.mocked(getAccount).mockResolvedValue({
        ...baseAccount,
        issuer: 'https://idsit.gov.bc.ca',
        clientID: 'existing-client-id',
      } as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({
        issuer: 'https://other.example.com',
        clientID: 'other-client-id',
      } as any)

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(setAccount).not.toHaveBeenCalled()
    })

    it('does not call setAccount when authorization request lacks issuer/clientID', async () => {
      jest.mocked(getAccount).mockResolvedValue(baseAccount as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({
        // no issuer or clientID
        deviceCode: 'abc',
      } as any)

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(setAccount).not.toHaveBeenCalled()
    })

    it('does not call setAccount when authorization request is null', async () => {
      jest.mocked(getAccount).mockResolvedValue(baseAccount as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null)

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(setAccount).not.toHaveBeenCalled()
    })

    it('backfills only the missing field (clientID) from authorization request', async () => {
      jest.mocked(getAccount).mockResolvedValue({
        ...baseAccount,
        issuer: 'https://idsit.gov.bc.ca',
        clientID: '',
      } as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({
        issuer: 'https://ignored-because-account-has-one.example.com',
        clientID: 'recovered-client-id',
      } as any)

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(setAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          issuer: 'https://idsit.gov.bc.ca',
          clientID: 'recovered-client-id',
        })
      )
    })

    const captureSessionRecoveryRequired = () => {
      const hydrateCall = mockDispatch.mock.calls.find(
        ([action]) => action.type === BCDispatchAction.HYDRATE_SECURE_STATE
      )
      return hydrateCall?.[0]?.payload?.[0]?.sessionRecoveryRequired
    }

    it('does not flag sessionRecoveryRequired for an unverified account with no tokens (can restart verification)', async () => {
      // beforeEach mocks getToken -> null for all token types (the 0-byte tokens-file signature)
      jest.mocked(getAccount).mockResolvedValue(baseAccount as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureSessionRecoveryRequired()).toBe(false)
    })

    it('does not flag sessionRecoveryRequired when a registration token still exists (in-progress verification)', async () => {
      jest.mocked(getAccount).mockResolvedValue(baseAccount as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)
      jest
        .mocked(getToken)
        .mockImplementation(async (type: any) =>
          type === TokenType.Registration ? ({ token: 'reg-token', type } as any) : null
        )

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureSessionRecoveryRequired()).toBe(false)
    })

    it('flags sessionRecoveryRequired when a verified user has a registration token but no refresh token', async () => {
      jest.mocked(getAccount).mockResolvedValue(baseAccount as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)
      // Verified: a credential exists (no cancel/expire event → VERIFIED)
      jest.mocked(getCredential).mockResolvedValue({} as any)
      // Registration token present (e.g. recovered from the V3 providers file), refresh token gone
      jest
        .mocked(getToken)
        .mockImplementation(async (type: any) =>
          type === TokenType.Registration ? ({ token: 'reg-token', type } as any) : null
        )

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureSessionRecoveryRequired()).toBe(true)
    })

    it('does not flag sessionRecoveryRequired when no account exists (fresh install)', async () => {
      jest.mocked(getAccount).mockResolvedValue(null as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureSessionRecoveryRequired()).toBe(false)
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
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
      jest.mocked(getAccount).mockResolvedValue(account as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)
      jest.mocked(getToken).mockImplementation(async (type: any) => {
        if (type === TokenType.Refresh) {
          return { id: 'r', type, token: 'stale-refresh-token', created: 0 } as any
        }
        if (type === TokenType.Registration) {
          return { id: 'g', type, token: 'stored-reg-token', created: 0 } as any
        }
        return null
      })

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
      expect(setToken).toHaveBeenCalledWith(TokenType.Refresh, 'new-refresh')
      expect(setToken).toHaveBeenCalledWith(TokenType.Registration, 'rotated-token')
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
      expect(setToken).toHaveBeenCalledWith(TokenType.Registration, 'put-rotated-token')
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
      expect(setToken).toHaveBeenCalledWith(TokenType.Refresh, 'stale-refresh-token')
      expect(setToken).toHaveBeenCalledWith(TokenType.Registration, 'stored-reg-token')
      expect(captureHydrateField('refreshTokenExpired')).toBe(false)
    })
  })

  describe('hydrateSecureState expired refresh token (#4654)', () => {
    const account = {
      id: 'account-1',
      issuer: 'https://idsit.gov.bc.ca',
      clientID: 'client-1',
      displayName: 'Test User',
    }
    const mockGetTokensForRefreshToken = jest.fn()

    beforeEach(() => {
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
      jest.mocked(getAccount).mockResolvedValue(account as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)
      jest.mocked(getToken).mockImplementation(async (type: any) => {
        if (type === TokenType.Refresh) {
          return { id: 'r', type, token: 'stale-refresh-token', created: 0 } as any
        }
        if (type === TokenType.Registration) {
          return { id: 'g', type, token: 'stored-reg-token', created: 0 } as any
        }
        return null
      })

      mockGetTokensForRefreshToken.mockReset()
      jest.mocked(useBCSCApiClientModule.useBCSCApiClientState).mockReturnValue({
        client: { getTokensForRefreshToken: mockGetTokensForRefreshToken } as any,
        isClientReady: true,
        error: undefined,
      } as any)
    })

    it('skips the network call and key recovery, and flags refreshTokenExpired, when the stored token is expired', async () => {
      jest.mocked(isTokenExpired).mockReturnValue(true)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(performKeyRecovery).not.toHaveBeenCalled()
      expect(reRegisterNewestKey).not.toHaveBeenCalled()
      expect(captureHydrateField('refreshTokenExpired')).toBe(true)
      // The stale token is still re-persisted, matching today's failure path (renewal deletes it)
      expect(setToken).toHaveBeenCalledWith(TokenType.Refresh, 'stale-refresh-token')
      expect(setToken).toHaveBeenCalledWith(TokenType.Registration, 'stored-reg-token')
    })

    it('flags refreshTokenExpired: false when the stored token is valid and refresh succeeds', async () => {
      jest.mocked(isTokenExpired).mockReturnValue(false)
      mockGetTokensForRefreshToken.mockResolvedValue({ refresh_token: 'new-refresh', access_token: 'new-access' })

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).toHaveBeenCalledWith('stale-refresh-token')
      expect(captureHydrateField('refreshTokenExpired')).toBe(false)
    })

    it('stops key-recovery retries and does not flag refreshTokenExpired when the server rejects a locally-valid token as invalid_token', async () => {
      jest.mocked(isTokenExpired).mockReturnValue(false)
      mockGetTokensForRefreshToken.mockRejectedValue(AppError.fromErrorDefinition(ErrorRegistry.INVALID_TOKEN))

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(1)
      expect(performKeyRecovery).not.toHaveBeenCalled()
      expect(reRegisterNewestKey).not.toHaveBeenCalled()
      expect(captureHydrateField('refreshTokenExpired')).toBe(false)
    })

    it('does not call isTokenExpired and flags refreshTokenExpired: false when there is no stored refresh token (session recovery case)', async () => {
      // No refresh token at all — e.g. a verified user whose tokens file is unreadable/corrupt
      // (session recovery, see the 'hydrateSecureState account recovery' describe). isTokenExpired
      // is mocked to true here specifically to prove the `Boolean(refreshToken) &&` short-circuit is
      // load-bearing: without it, a bare `isTokenExpired(refreshToken)` call with refreshToken
      // undefined would (per the real util's semantics) evaluate to expired and misroute this user.
      jest.mocked(getToken).mockImplementation(async (type: any) => {
        if (type === TokenType.Registration) {
          return { id: 'g', type, token: 'stored-reg-token', created: 0 } as any
        }
        return null
      })
      jest.mocked(getCredential).mockResolvedValue({} as any) // verified
      jest.mocked(isTokenExpired).mockReturnValue(true)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(isTokenExpired).not.toHaveBeenCalled()
      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(captureHydrateField('refreshTokenExpired')).toBe(false)
      expect(captureHydrateField('sessionRecoveryRequired')).toBe(true)
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

    const mockRegistrationToken = (token?: string) => {
      jest
        .mocked(getToken)
        .mockImplementation(async (type: any) =>
          type === TokenType.Registration && token ? ({ id: 'g', type, token, created: 0 } as any) : null
        )
    }

    const hydrate = async () => {
      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })
    }

    beforeEach(() => {
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
      jest.mocked(getAccount).mockResolvedValue(emptyClientAccount as any)
    })

    it('takes the client ID from the token aud instead of the authorization request', async () => {
      mockRegistrationToken(makeRegistrationToken({ aud: 'A' }))
      jest.mocked(getAuthorizationRequest).mockResolvedValue({ clientID: 'V3', issuer: 'https://v3' } as any)

      await hydrate()

      expect(setAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          issuer: 'https://idsit.gov.bc.ca',
          clientID: 'A',
          securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
        })
      )
    })

    it('backfills from the token when there is no authorization request', async () => {
      mockRegistrationToken(makeRegistrationToken({ aud: ['A'] }))
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null)

      await hydrate()

      expect(setAccount).toHaveBeenCalledWith(expect.objectContaining({ clientID: 'A' }))
    })

    it('falls back to the authorization request when there is no registration token', async () => {
      mockRegistrationToken(undefined)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({ clientID: 'V3', issuer: 'https://v3' } as any)

      await hydrate()

      expect(setAccount).toHaveBeenCalledWith(expect.objectContaining({ clientID: 'V3' }))
    })

    it.each([
      ['missing aud', { iss: 'x' }],
      ['multi-value aud', { aud: ['A', 'B'] }],
      ['non-string aud', { aud: 5 }],
    ])(
      'does not backfill when the token has a %s, even if the authorization request has a client ID',
      async (_l, claims) => {
        mockRegistrationToken(makeRegistrationToken(claims))
        jest.mocked(getAuthorizationRequest).mockResolvedValue({ clientID: 'V3', issuer: 'https://v3' } as any)

        await hydrate()

        expect(setAccount).not.toHaveBeenCalled()
      }
    )

    it('does not backfill when the token is not a JWT', async () => {
      mockRegistrationToken('not-a-jwt')
      jest.mocked(getAuthorizationRequest).mockResolvedValue({ clientID: 'V3', issuer: 'https://v3' } as any)

      await hydrate()

      expect(setAccount).not.toHaveBeenCalled()
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
      jest.mocked(getToken).mockImplementation(async (type: any) => {
        if (type === TokenType.Refresh && refresh) {
          return { id: 'r', type, token: refresh, created: 0 } as any
        }
        if (type === TokenType.Registration && registration) {
          return { id: 'g', type, token: registration, created: 0 } as any
        }
        return null
      })
    }

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
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
      jest.mocked(getAccount).mockResolvedValue(account as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)
      jest.mocked(setAccount).mockResolvedValue(undefined as never)
      jest.mocked(setToken).mockResolvedValue(true as never)
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
        expect(setAccount).not.toHaveBeenCalled()
      })

      it('switches to the token client ID when the refresh fails and the server confirms, then retries the refresh', async () => {
        mockGetTokensForRefreshToken
          .mockRejectedValueOnce(unknownClientError())
          .mockResolvedValueOnce({ refresh_token: 'new-refresh', access_token: 'new-access' })
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'confirmed' })

        await hydrate()

        expect(confirmRegistrationClientId).toHaveBeenCalledWith(expect.anything(), NEW_ID, REG_TOKEN)
        expect(setAccount).toHaveBeenCalledWith({
          ...account,
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

        expect(setAccount).not.toHaveBeenCalled()
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
        expect(setAccount).not.toHaveBeenCalled()
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
        expect(setAccount).toHaveBeenCalledWith(expect.objectContaining({ clientID: NEW_ID }))
        expect(performKeyRecovery).not.toHaveBeenCalled()
      })

      it.each([
        ['a bad signature', 'Signature did not validate for presented JWT authentication.'],
        ['an expired assertion', 'Assertion Token is expired: Tue Jan 01 00:00:00 GMT 2030'],
        ['a future-dated assertion', 'Assertion Token was issued in the future: Tue Jan 01 00:00:00 GMT 2030'],
        ['no server message', ''],
      ])('does not switch the client ID when the 401 is %s', async (_label, errorDescription) => {
        mockGetTokensForRefreshToken.mockRejectedValue(
          errorDescription ? refreshError(401, undefined, errorDescription) : refreshError(401)
        )
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'confirmed' })
        jest.mocked(performKeyRecovery).mockResolvedValue({ status: KeyRecoveryStatus.Failed })

        await hydrate()

        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
        expect(setAccount).not.toHaveBeenCalled()
        expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(1)
        expect(performKeyRecovery).toHaveBeenCalledWith(expect.anything(), OLD_ID, REG_TOKEN, expect.anything())
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
        expect(setAccount).not.toHaveBeenCalled()
      })

      it('does not confirm when the refresh token is expired', async () => {
        jest.mocked(isTokenExpired).mockReturnValue(true)

        await hydrate()

        expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
        expect(confirmRegistrationClientId).not.toHaveBeenCalled()
      })

      it('does not confirm when the stored client ID already matches the token', async () => {
        jest.mocked(getAccount).mockResolvedValue({ ...account, clientID: NEW_ID } as any)
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
        expect(setAccount).not.toHaveBeenCalled()
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

        await hydrate()

        expect(setToken).toHaveBeenCalledWith(TokenType.Registration, 'rotated')
        const rotatedWrite = jest
          .mocked(setToken)
          .mock.calls.findIndex(([type, token]) => type === TokenType.Registration && token === 'rotated')
        expect(jest.mocked(setToken).mock.invocationCallOrder[rotatedWrite]).toBeLessThan(
          jest.mocked(setAccount).mock.invocationCallOrder[0]
        )
        expect(captureHydrateField('registrationAccessToken')).toBe('rotated')
      })

      it('persists a rotated token but leaves the client ID alone on a mismatch', async () => {
        jest
          .mocked(confirmRegistrationClientId)
          .mockResolvedValue({ status: 'client_id_mismatch', newRegistrationAccessToken: 'rotated' })

        await hydrate()

        expect(setToken).toHaveBeenCalledWith(TokenType.Registration, 'rotated')
        expect(setAccount).not.toHaveBeenCalled()
        expect(performKeyRecovery).toHaveBeenCalledWith(expect.anything(), OLD_ID, 'rotated', expect.anything())
      })

      it('does not switch the client ID when the rotated token cannot be persisted', async () => {
        jest
          .mocked(confirmRegistrationClientId)
          .mockResolvedValue({ status: 'confirmed', newRegistrationAccessToken: 'rotated' })
        jest.mocked(setToken).mockImplementation(async (type: any, token: any) => {
          if (type === TokenType.Registration && token === 'rotated') {
            throw Object.assign(new Error('native'), { code: 'E_TOKEN_SAVE_ERROR' })
          }
          return true as never
        })

        await hydrate()

        expect(setAccount).not.toHaveBeenCalled()
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('reason=persist_failed'))
        expect(captureHydrateField('registrationAccessToken')).toBe('rotated')
      })

      it('writes nothing and still completes hydration when the confirmation times out', async () => {
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'request_failed' })

        await hydrate()

        expect(setAccount).not.toHaveBeenCalled()
        // The only registration token write is the end-of-hydrate write-back of the original token.
        const registrationWrites = jest.mocked(setToken).mock.calls.filter(([type]) => type === TokenType.Registration)
        expect(registrationWrites).toEqual([[TokenType.Registration, REG_TOKEN]])
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('reason=request_failed http_status=none'))
        expect(mockDispatch.mock.calls.some(([action]) => action.type === BCDispatchAction.HYDRATE_SECURE_STATE)).toBe(
          true
        )
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

      it('trusts the stored client ID and retries the refresh when setAccount rejects after saving', async () => {
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'confirmed' })
        jest.mocked(setAccount).mockRejectedValue(new Error('issuer file write failed'))
        jest
          .mocked(getAccount)
          .mockResolvedValueOnce(account as any)
          .mockResolvedValue({ ...account, clientID: NEW_ID } as any)

        await hydrate()

        expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(2)
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('token refresh succeeded after client id repair')
        )
        expect(mockDispatch.mock.calls.some(([action]) => action.type === BCDispatchAction.HYDRATE_SECURE_STATE)).toBe(
          true
        )
      })

      it('skips the retry when setAccount rejects and the stored client ID is still the old one', async () => {
        jest.mocked(confirmRegistrationClientId).mockResolvedValue({ status: 'confirmed' })
        jest.mocked(setAccount).mockRejectedValue(new Error('write failed'))

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
      jest.mocked(getAccount).mockResolvedValue(account as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
      jest.mocked(getToken).mockImplementation(async (type: any) => {
        if (type === TokenType.Refresh) {
          return { id: 'r', type, token: 'stored-refresh-token', created: 0 } as any
        }
        if (type === TokenType.Registration) {
          return { id: 'g', type, token: 'stored-reg-token', created: 0 } as any
        }
        return null
      })
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

      expect(setCredential).toHaveBeenCalledWith(
        expect.objectContaining({ issuer: account.issuer, subject: account.clientID, bcscEvent: 'Authorization' })
      )
      expect(captureHydrateField('verified')).toBe(true)
      expect(captureHydrateField('verifiedStatus')).toBe(VerificationStatus.VERIFIED)
      expect(captureHydrateField('sessionRecoveryRequired')).toBe(false)
    })

    it('leaves the device unverified when the refresh fails, since IAS has not confirmed it', async () => {
      mockGetTokensForRefreshToken.mockRejectedValue(new Error('network'))
      jest.mocked(performKeyRecovery).mockResolvedValue({ status: 'failed' } as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(setCredential).not.toHaveBeenCalled()
      expect(captureHydrateField('verified')).toBe(false)
      expect(captureHydrateField('verifiedStatus')).toBe(VerificationStatus.UNVERIFIED)
    })

    it('leaves the device unverified while a started verification is being resumed, so the finish step completes setup', async () => {
      jest
        .mocked(Bifold.useStore)
        .mockReturnValue([
          { bcsc: { verificationStarted: true }, bcscSecure: { isHydrated: true, additionalEvidenceData: [] } } as any,
          mockDispatch,
        ])

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).toHaveBeenCalled()
      expect(setCredential).not.toHaveBeenCalled()
      expect(captureHydrateField('verified')).toBe(false)
    })

    it('skips the restore for an expired refresh token, which only a renewal can fix', async () => {
      jest.mocked(isTokenExpired).mockReturnValue(true)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(setCredential).not.toHaveBeenCalled()
      expect(captureHydrateField('verified')).toBe(false)
    })

    it('does not write when a credential record already exists', async () => {
      jest.mocked(getCredential).mockResolvedValue({ bcscEvent: 'Authorization' } as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(setCredential).not.toHaveBeenCalled()
      expect(captureHydrateField('verified')).toBe(true)
    })

    it('does not write when there is no refresh token to confirm', async () => {
      jest.mocked(getToken).mockResolvedValue(null as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(setCredential).not.toHaveBeenCalled()
      expect(captureHydrateField('verified')).toBe(false)
    })

    it('completes hydration as unverified when the record cannot be written', async () => {
      jest.mocked(setCredential).mockRejectedValueOnce(new Error('write failed'))

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
    const keychainError = () => Object.assign(new Error('native E_TOKEN_SAVE_FAILED'), { code: 'E_TOKEN_SAVE_FAILED' })

    beforeEach(() => {
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
      jest.mocked(getAccount).mockResolvedValue({ id: 'a', issuer: 'https://i', clientID: 'c' } as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)
      jest
        .mocked(getToken)
        .mockImplementation(async (type: any) =>
          type === TokenType.Refresh ? ({ id: 'r', type, token: 'stored-refresh', created: 0 } as any) : null
        )
    })

    it('completes hydration when the keychain rejects the token write', async () => {
      jest.mocked(setToken).mockRejectedValue(keychainError())
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await expect(result.current.hydrateSecureState()).resolves.toBeUndefined()
      })

      expect(mockDispatch.mock.calls.some(([action]) => action.type === BCDispatchAction.HYDRATE_SECURE_STATE)).toBe(
        true
      )
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
      jest.mocked(setToken).mockRejectedValue(keychainError())

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      const hydrate = mockDispatch.mock.calls.find(([action]) => action.type === BCDispatchAction.HYDRATE_SECURE_STATE)
      expect(hydrate).toBeDefined()
      expect(hydrate![0].payload[0]).toMatchObject({
        refreshToken: 'fresh-refresh',
        accessToken: 'fresh-access',
      })
    })
  })

  // A failed unlock must leave nothing behind, so tapping Unlock again behaves like a first attempt.
  describe('handleSuccessfulAuth retry after a hydration failure', () => {
    const readError = () => Object.assign(new Error('native E_GET_ACCOUNT_ERROR'), { code: 'E_GET_ACCOUNT_ERROR' })
    const mockGetTokensForRefreshToken = jest.fn()

    beforeEach(() => {
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
      jest.mocked(getAccount).mockResolvedValue({ id: 'a', issuer: 'https://i', clientID: 'c' } as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)
      jest
        .mocked(getToken)
        .mockImplementation(async (type: any) =>
          type === TokenType.Refresh ? ({ id: 'r', type, token: 'stored-refresh', created: 0 } as any) : null
        )
      jest.mocked(setToken).mockResolvedValue(true)

      mockGetTokensForRefreshToken.mockReset()
      mockGetTokensForRefreshToken.mockResolvedValue({ refresh_token: 'fresh-refresh', access_token: 'fresh-access' })
      jest.mocked(useBCSCApiClientModule.useBCSCApiClientState).mockReturnValue({
        client: { getTokensForRefreshToken: mockGetTokensForRefreshToken } as any,
        isClientReady: true,
        error: undefined,
      } as any)
    })

    it('leaves the store, keychain and server untouched when a native read fails', async () => {
      jest.mocked(getAccount).mockRejectedValueOnce(readError())
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await expect(result.current.handleSuccessfulAuth('wallet-key')).rejects.toMatchObject({
          appEvent: AppEventCode.NATIVE_STORAGE_READ_FAILED,
        })
      })

      // No partial hydration, no wallet key, no SUCCESSFUL_AUTH: the user stays fully locked
      expect(mockDispatch).not.toHaveBeenCalled()
      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(setToken).not.toHaveBeenCalled()
      expect(setAccount).not.toHaveBeenCalled()
    })

    it('unlocks normally when the user retries after a failed hydration', async () => {
      jest.mocked(getAccount).mockRejectedValueOnce(readError())
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await expect(result.current.handleSuccessfulAuth('wallet-key')).rejects.toBeDefined()
      })
      await act(async () => {
        await expect(result.current.handleSuccessfulAuth('wallet-key')).resolves.toBeUndefined()
      })

      // The retry re-reads storage from scratch and completes the full unlock sequence, in order
      const actionTypes = mockDispatch.mock.calls.map(([action]) => action.type)
      const hydrateIndex = actionTypes.indexOf(BCDispatchAction.HYDRATE_SECURE_STATE)
      expect(hydrateIndex).toBeGreaterThan(-1)
      expect(actionTypes.slice(hydrateIndex)).toEqual([
        BCDispatchAction.HYDRATE_SECURE_STATE,
        BCDispatchAction.UPDATE_SECURE_WALLET_KEY,
        BCDispatchAction.SUCCESSFUL_AUTH,
      ])
      expect(getAccount).toHaveBeenCalledTimes(2)
      expect(mockGetTokensForRefreshToken).toHaveBeenCalledTimes(1)
      expect(mockGetTokensForRefreshToken).toHaveBeenCalledWith('stored-refresh')
      expect(captureHydrateField('isHydrated')).toBe(true)
      expect(captureHydrateField('refreshToken')).toBe('fresh-refresh')
    })
  })

  describe('updateVerified', () => {
    const account = { id: 'account-1', issuer: 'https://idsit.gov.bc.ca', clientID: 'client-1' }

    beforeEach(() => {
      jest.mocked(getAccount).mockResolvedValue(account as any)
    })

    it('persists the credential record first, then dispatches UPDATE_SECURE_VERIFIED, ends the started verification and latches SET_VERIFICATION_SKIPPED=true', async () => {
      jest.mocked(Bifold.useStore).mockReturnValue([
        {
          bcsc: {},
          bcscSecure: { isHydrated: true, additionalEvidenceData: [], cardProcess: BCSCCardProcess.BCSCPhoto },
        } as any,
        mockDispatch,
      ])
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
      expect(jest.mocked(setCredential).mock.invocationCallOrder[0]).toBeLessThan(
        mockDispatch.mock.invocationCallOrder[0]
      )
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFIED,
        payload: [true],
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

    it('throws and leaves the store alone when the credential record cannot be written', async () => {
      jest.mocked(setCredential).mockRejectedValueOnce(new Error('write failed'))
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.updateVerified(true)).rejects.toThrow('write failed')

      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_SECURE_VERIFIED })
      )
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.SET_VERIFICATION_STARTED })
      )
    })

    it('throws and leaves the store alone when there is no account to attach the record to', async () => {
      jest.mocked(getAccount).mockResolvedValue(null as any)
      const { result } = renderHook(() => useSecureActions())

      await expect(result.current.updateVerified(true)).rejects.toThrow('no account found')

      expect(setCredential).not.toHaveBeenCalled()
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_SECURE_VERIFIED })
      )
    })

    it('removes the record and leaves both verification flags alone when marking unverified', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateVerified(false)
      })

      expect(deleteCredential).toHaveBeenCalled()
      expect(setCredential).not.toHaveBeenCalled()
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFIED,
        payload: [false],
      })
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.SET_VERIFICATION_SKIPPED })
      )
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.SET_VERIFICATION_STARTED })
      )
    })
  })

  describe('continueVerificationProcess', () => {
    it('marks verification started and in progress', () => {
      const { result } = renderHook(() => useSecureActions())

      act(() => {
        result.current.continueVerificationProcess()
      })

      // Started makes every later launch resume the flow; IN_PROGRESS shows it now
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.SET_VERIFICATION_STARTED,
        payload: [true],
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFIED_STATUS,
        payload: [VerificationStatus.IN_PROGRESS],
      })
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
    beforeEach(() => {
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
    })

    it('dispatches and persists birthdate as a unix timestamp', async () => {
      const { result } = renderHook(() => useSecureActions())
      const birthdate = new Date('1990-01-15T00:00:00Z')

      await act(async () => {
        await result.current.updateUserInfo({ birthdate })
      })

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_BIRTHDATE,
        payload: [birthdate],
      })
      expect(setAuthorizationRequest).toHaveBeenCalledWith(
        expect.objectContaining({ birthdate: Math.floor(birthdate.getTime() / 1000) })
      )
    })

    it('dispatches and persists serial as csn on authorization request', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ serial: '123456789' })
      })

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_SERIAL,
        payload: ['123456789'],
      })
      expect(setAuthorizationRequest).toHaveBeenCalledWith(expect.objectContaining({ csn: '123456789' }))
    })

    it('persists verifiedEmail to authorization request when email and isEmailVerified are both truthy', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: true })
      })

      expect(setAuthorizationRequest).toHaveBeenCalledWith(
        expect.objectContaining({ verifiedEmail: 'user@example.com' })
      )
    })

    it('does NOT persist verifiedEmail when email is provided but isEmailVerified is false (auto-lock bug)', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: false })
      })

      expect(setAuthorizationRequest).not.toHaveBeenCalledWith(
        expect.objectContaining({ verifiedEmail: expect.anything() })
      )
    })

    it('does NOT persist verifiedEmail when isEmailVerified is omitted', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com' })
      })

      expect(setAuthorizationRequest).not.toHaveBeenCalledWith(
        expect.objectContaining({ verifiedEmail: expect.anything() })
      )
    })

    it('persists emailAddress to accountFlags whenever email is provided, even if unverified', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: false })
      })

      expect(setAccountFlags).toHaveBeenCalledWith(
        expect.objectContaining({ emailAddress: 'user@example.com', isEmailVerified: false })
      )
    })

    it('persists isEmailVerified=true to accountFlags when verification completes', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: true })
      })

      expect(setAccountFlags).toHaveBeenCalledWith(
        expect.objectContaining({ emailAddress: 'user@example.com', isEmailVerified: true })
      )
    })

    it('dispatches email and isEmailVerified to the in-memory store', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: false })
      })

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_EMAIL_ADDRESS,
        payload: ['user@example.com'],
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_IS_EMAIL_VERIFIED,
        payload: [false],
      })
    })

    it('merges with existing authorization request data when persisting', async () => {
      jest.mocked(getAuthorizationRequest).mockResolvedValue({
        deviceCode: 'existing-device-code',
        userCode: 'EXISTING',
      } as any)

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ serial: '987654321' })
      })

      expect(setAuthorizationRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceCode: 'existing-device-code',
          userCode: 'EXISTING',
          csn: '987654321',
        })
      )
    })

    it('merges with existing account flags when persisting email fields', async () => {
      jest.mocked(getAccountFlags).mockResolvedValue({
        userSkippedEmailVerification: false,
        userSubmittedVerificationVideo: true,
      } as any)

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ email: 'user@example.com', isEmailVerified: true })
      })

      expect(setAccountFlags).toHaveBeenCalledWith(
        expect.objectContaining({
          userSkippedEmailVerification: false,
          userSubmittedVerificationVideo: true,
          emailAddress: 'user@example.com',
          isEmailVerified: true,
        })
      )
    })

    it('does not call setAccountFlags when no email-related fields are provided', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({ serial: '123456789' })
      })

      expect(setAccountFlags).not.toHaveBeenCalled()
    })

    it('does not call setAuthorizationRequest when called with no fields', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.updateUserInfo({})
      })

      expect(setAuthorizationRequest).not.toHaveBeenCalled()
      expect(setAccountFlags).not.toHaveBeenCalled()
    })
  })

  describe('hydrateSecureState email derivation', () => {
    beforeEach(() => {
      jest.mocked(getAccount).mockResolvedValue(null as any)
      jest.mocked(getToken).mockResolvedValue(null as any)
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
    })

    const captureHydratedSecureData = () => {
      const hydrateCall = mockDispatch.mock.calls.find(
        ([action]) => action.type === BCDispatchAction.HYDRATE_SECURE_STATE
      )
      return hydrateCall?.[0]?.payload?.[0]
    }

    it('derives isEmailVerified=true when accountFlags.isEmailVerified is true', async () => {
      jest.mocked(getAccountFlags).mockResolvedValue({ isEmailVerified: true } as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedSecureData()?.isEmailVerified).toBe(true)
    })

    it('derives isEmailVerified=true from legacy verifiedEmail when accountFlags is missing the flag (v3 migration)', async () => {
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({ verifiedEmail: 'legacy@example.com' } as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedSecureData()?.isEmailVerified).toBe(true)
    })

    it('derives isEmailVerified=false when neither accountFlags nor verifiedEmail indicate verification (post-fix)', async () => {
      jest
        .mocked(getAccountFlags)
        .mockResolvedValue({ isEmailVerified: false, emailAddress: 'user@example.com' } as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      const hydrated = captureHydratedSecureData()
      expect(hydrated?.isEmailVerified).toBe(false)
      expect(hydrated?.emailAddress).toBe('user@example.com')
    })

    it('derives isEmailVerified=false when nothing is set at all', async () => {
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue(null as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedSecureData()?.isEmailVerified).toBeFalsy()
    })

    it('prefers accountFlags.emailAddress over authRequest.verifiedEmail for display', async () => {
      jest.mocked(getAccountFlags).mockResolvedValue({
        isEmailVerified: true,
        emailAddress: 'unmasked@example.com',
      } as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({ verifiedEmail: 'u****d@example.com' } as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedSecureData()?.emailAddress).toBe('unmasked@example.com')
    })

    it('falls back to authRequest.verifiedEmail for emailAddress when accountFlags has none', async () => {
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({ verifiedEmail: 'legacy@example.com' } as any)

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
    ]

    beforeEach(() => {
      jest.mocked(getAccount).mockResolvedValue(null as any)
      jest.mocked(getToken).mockResolvedValue(null as any)
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
    })

    const captureHydratedCardProcess = () => {
      const hydrateCall = mockDispatch.mock.calls.find(
        ([action]) => action.type === BCDispatchAction.HYDRATE_SECURE_STATE
      )
      return hydrateCall?.[0]?.payload?.[0]?.cardProcess
    }

    it('infers NonBCSC for a migrated install with evidence but no recorded cardProcess', async () => {
      jest.mocked(getEvidence).mockResolvedValue(completeEvidence as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({} as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedCardProcess()).toBe(BCSCCardProcess.NonBCSC)
    })

    it('still infers NonBCSC when a failed combo-card scan left a stale serial (no deviceCode)', async () => {
      // handleScanComboCard persists csn before attempting authorization, so a Non-BCSC session
      // can carry a serial from that failed attempt (see resume-step-route.test.ts:51-58).
      jest.mocked(getEvidence).mockResolvedValue(completeEvidence as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({ csn: '123456789' } as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedCardProcess()).toBe(BCSCCardProcess.NonBCSC)
    })

    it('does not infer NonBCSC once a deviceCode shows the card was actually authorized', async () => {
      jest.mocked(getEvidence).mockResolvedValue(completeEvidence as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({ csn: '123456789', deviceCode: 'dc' } as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedCardProcess()).toBeUndefined()
    })

    it('leaves cardProcess undefined when there is no evidence to infer from', async () => {
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({} as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedCardProcess()).toBeUndefined()
    })

    it('preserves an explicitly recorded cardProcess', async () => {
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({ cardProcess: BCSCCardProcess.BCSCPhoto } as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedCardProcess()).toBe(BCSCCardProcess.BCSCPhoto)
    })
  })

  describe('hydrateSecureState name scrubbing', () => {
    beforeEach(() => {
      jest.mocked(getAccount).mockResolvedValue(null as any)
      jest.mocked(getToken).mockResolvedValue(null as any)
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
    })

    const captureHydratedName = () => {
      const hydrateCall = mockDispatch.mock.calls.find(
        ([action]) => action.type === BCDispatchAction.HYDRATE_SECURE_STATE
      )
      return hydrateCall?.[0]?.payload?.[0]?.userMetadata?.name
    }

    it('strips decoder-corrupted comma-dollar characters from middleNames', async () => {
      jest.mocked(getAuthorizationRequest).mockResolvedValue({
        firstName: 'anna',
        lastName: 'berg',
        middleNames: 'berg,$anna',
      } as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedName()).toEqual({ first: 'anna', last: 'berg', middle: 'berganna' })
    })

    it('strips other special characters from first/last name', async () => {
      jest.mocked(getAuthorizationRequest).mockResolvedValue({
        firstName: 'J!ohn#',
        lastName: 'Sm@ith',
        middleNames: undefined,
      } as any)

      const { result } = renderHook(() => useSecureActions())
      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(captureHydratedName()).toEqual({ first: 'John', last: 'Smith', middle: undefined })
    })

    it('leaves already-clean names unchanged', async () => {
      jest.mocked(getAuthorizationRequest).mockResolvedValue({
        firstName: 'Jane',
        lastName: "O'Brien-Smith",
        middleNames: 'Marie',
      } as any)

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

      expect(setAuthorizationRequest).toHaveBeenCalledWith(
        expect.objectContaining({ expiry: Math.floor(expiresAt.getTime() / 1000), deviceCode: 'dc', userCode: 'uc' })
      )
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
    it('deletes the authorization request from native storage', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.clearAuthorizationRequest()
      })

      expect(deleteAuthorizationRequest).toHaveBeenCalled()
    })
  })

  describe('deleteVerificationData', () => {
    it('deletes the authorization request and cancels reminders', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.deleteVerificationData()
      })

      expect(deleteAuthorizationRequest).toHaveBeenCalled()
      expect(cancelVerificationReminders).toHaveBeenCalledWith(mockLogger)
    })
  })

  describe('deleteSecureData', () => {
    it('cancels reminders when secure data is removed', async () => {
      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.deleteSecureData()
      })

      expect(cancelVerificationReminders).toHaveBeenCalledWith(mockLogger)
    })
  })
})
