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
})
