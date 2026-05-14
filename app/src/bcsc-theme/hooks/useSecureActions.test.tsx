import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import {
  AccountSecurityMethod,
  EvidenceMetadata,
  getAccount,
  getAccountFlags,
  getAccountSecurityMethod,
  getAuthorizationRequest,
  getCredential,
  getEvidence,
  getSavedServices,
  getToken,
  setAccount,
  setAccountFlags,
  setAuthorizationRequest,
  setEvidence,
} from 'react-native-bcsc-core'
import * as useBCSCApiClientModule from './useBCSCApiClient'
import { useSecureActions } from './useSecureActions'

jest.mock('@bifold/core')
jest.mock('react-native-bcsc-core', () => ({
  AccountSecurityMethod: {
    PinNoDeviceAuth: 'app_pin_no_device_authn',
    PinWithDeviceAuth: 'app_pin_has_device_authn',
    DeviceAuth: 'device_authentication',
  },
  TokenType: { Refresh: 0, Registration: 2, Access: 1 },
  setEvidence: jest.fn(),
  setAccount: jest.fn(),
  setAccountFlags: jest.fn(),
  setAuthorizationRequest: jest.fn(),
  setToken: jest.fn(),
  getAccount: jest.fn(),
  getAccountFlags: jest.fn(),
  getAccountSecurityMethod: jest.fn(),
  getAuthorizationRequest: jest.fn(),
  getCredential: jest.fn(),
  getEvidence: jest.fn(),
  getSavedServices: jest.fn(),
  getToken: jest.fn(),
}))
jest.mock('./useBCSCApiClient')

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

describe('useSecureActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Bifold.useStore).mockReturnValue([
      {
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
        evidenceType: { evidence_type: 'drivers_licence', image_sides: ['front', 'back'] } as any,
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

    it('should remove evidence without both photos', async () => {
      const { result } = renderHook(() => useSecureActions())

      const noPhotos = makeEvidence({
        evidenceType: { evidence_type: 'drivers_licence', image_sides: ['front', 'back'] } as any,
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
        evidenceType: { evidence_type: 'passport', image_sides: ['front', 'back'] } as any,
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
        evidenceType: { evidence_type: 'drivers_licence', image_sides: ['front', 'back'] } as any,
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
        documentNumber: 'DL456',
      })
      const incomplete = makeEvidence({
        evidenceType: { evidence_type: 'passport', image_sides: ['front', 'back'] } as any,
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
        evidenceType: { evidence_type: 'drivers_licence', image_sides: ['front', 'back'] } as any,
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
        documentNumber: 'DL789',
      })
      const incomplete = makeEvidence({
        evidenceType: { evidence_type: 'passport', image_sides: ['front', 'back'] } as any,
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

  describe('hydrateSecureState account recovery', () => {
    const baseAccount = {
      id: 'account-1',
      issuer: '',
      clientID: '',
      displayName: 'Test User',
    }

    beforeEach(() => {
      jest.mocked(getToken).mockResolvedValue(null as any)
      jest.mocked(getAccountFlags).mockResolvedValue({} as any)
      jest.mocked(getEvidence).mockResolvedValue([] as any)
      jest.mocked(getCredential).mockResolvedValue(null as any)
      jest.mocked(getSavedServices).mockResolvedValue([] as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.PinNoDeviceAuth)
    })

    it('recovers issuer/clientID from authorization request and updates account', async () => {
      jest.mocked(getAccount).mockResolvedValue(baseAccount as any)
      jest.mocked(getAuthorizationRequest).mockResolvedValue({
        issuer: 'https://idsit.gov.bc.ca',
        clientID: 'recovered-client-id',
      } as any)

      const { result } = renderHook(() => useSecureActions())

      await act(async () => {
        await result.current.hydrateSecureState()
      })

      expect(getAccountSecurityMethod).toHaveBeenCalled()
      expect(setAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'account-1',
          issuer: 'https://idsit.gov.bc.ca',
          clientID: 'recovered-client-id',
          securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
        })
      )
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
})
