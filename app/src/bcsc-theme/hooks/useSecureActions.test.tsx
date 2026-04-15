import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { EvidenceMetadata, setEvidence } from 'react-native-bcsc-core'
import * as useBCSCApiClientModule from './useBCSCApiClient'
import { useSecureActions } from './useSecureActions'

jest.mock('@bifold/core')
jest.mock('react-native-bcsc-core', () => ({
  setEvidence: jest.fn(),
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
        evidenceType: { evidence_type: 'drivers_licence' } as any,
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
        evidenceType: { evidence_type: 'drivers_licence' } as any,
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
        evidenceType: { evidence_type: 'passport' } as any,
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
        evidenceType: { evidence_type: 'drivers_licence' } as any,
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
        documentNumber: 'DL456',
      })
      const incomplete = makeEvidence({
        evidenceType: { evidence_type: 'passport' } as any,
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
        evidenceType: { evidence_type: 'drivers_licence' } as any,
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
        documentNumber: 'DL789',
      })
      const incomplete = makeEvidence({
        evidenceType: { evidence_type: 'passport' } as any,
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
})
