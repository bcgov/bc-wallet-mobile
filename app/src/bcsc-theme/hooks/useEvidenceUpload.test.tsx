import useApi from '@/bcsc-theme/api/hooks/useApi'
import useEvidenceUpload, { EvidenceUploadItem } from '@/bcsc-theme/hooks/useEvidenceUpload'
import { BCState } from '@/store'
import readFileInChunks from '@/utils/read-file'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { PhotoMetadata } from 'react-native-bcsc-core'

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/utils/read-file')
jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

describe('useEvidenceUpload', () => {
  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }

  const mockEvidenceApi = {
    uploadPhotoEvidenceMetadata: jest.fn(),
    uploadPhotoEvidenceBinary: jest.fn(),
    sendEvidenceMetadata: jest.fn(),
  }

  const baseStore: any = {
    bcsc: {
      photoPath: undefined,
      photoMetadata: undefined,
    },
    bcscSecure: {
      additionalEvidenceData: [],
    },
  }

  // A two-sided card's image_sides — used to derive the expected photo count.
  const bcdlImageSides = [
    { image_side_name: 'FRONT_SIDE', image_side_label: 'Front', image_side_tip: 'tip' },
    { image_side_name: 'BACK_SIDE', image_side_label: 'Back', image_side_tip: 'tip' },
  ]

  const photo = (label: string, tag: string): PhotoMetadata => ({
    label,
    content_type: 'image/jpeg',
    content_length: 1,
    date: 0,
    sha256: tag,
    file_path: `/${tag}.jpg`,
  })

  beforeEach(() => {
    jest.clearAllMocks()

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([baseStore as BCState, jest.fn()])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)

    const useApiMock = jest.mocked(useApi)
    useApiMock.mockReturnValue({ evidence: mockEvidenceApi } as any)

    jest.mocked(readFileInChunks).mockResolvedValue(Buffer.from([1, 2, 3]))
  })

  describe('processAdditionalEvidence', () => {
    it('heals corrupted persisted BCDL state with a stale duplicate back-side photo before upload', async () => {
      // Reproduces the issue #4159 dead end: a stale local photo left behind by
      // navigating back to retake the back side persists as a 3rd metadata entry
      // for a 2-sided card ([FRONT_SIDE, BACK_SIDE, BACK_SIDE]).
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([
        {
          ...baseStore,
          bcscSecure: {
            ...baseStore.bcscSecure,
            additionalEvidenceData: [
              {
                evidenceType: { evidence_type: 'drivers_licence', image_sides: bcdlImageSides },
                documentNumber: 'DL123',
                metadata: [photo('FRONT_SIDE', 'front'), photo('BACK_SIDE', 'back1'), photo('BACK_SIDE', 'back2')],
              },
            ],
          },
        } as BCState,
        jest.fn(),
      ])

      mockEvidenceApi.sendEvidenceMetadata.mockResolvedValue([
        { label: 'FRONT_SIDE', upload_uri: 'front-uri' },
        { label: 'BACK_SIDE', upload_uri: 'back-uri' },
      ])

      const { result } = renderHook(() => useEvidenceUpload())

      let uploads: EvidenceUploadItem[] = []
      await act(async () => {
        uploads = await result.current.processAdditionalEvidence()
      })

      const payload = mockEvidenceApi.sendEvidenceMetadata.mock.calls[0][0]
      expect(payload.images).toHaveLength(2)
      expect(payload.images.map((i: PhotoMetadata) => i.label)).toEqual(['FRONT_SIDE', 'BACK_SIDE'])

      // Healed metadata keeps the LAST occurrence of the duplicated label —
      // the most recently (re-)captured photo — not the stale first one.
      expect(readFileInChunks).toHaveBeenCalledWith('/back2.jpg', expect.anything())
      expect(readFileInChunks).not.toHaveBeenCalledWith('/back1.jpg', expect.anything())

      // Exactly 2 upload items — not 3 — so no duplicate binary is uploaded either.
      expect(uploads).toHaveLength(2)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ evidenceType: 'drivers_licence', before: 3, after: 2 })
      )
    })

    it('passes healthy 2-of-2 metadata through untouched with no healing warning', async () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([
        {
          ...baseStore,
          bcscSecure: {
            ...baseStore.bcscSecure,
            additionalEvidenceData: [
              {
                evidenceType: { evidence_type: 'drivers_licence', image_sides: bcdlImageSides },
                documentNumber: 'DL123',
                metadata: [photo('FRONT_SIDE', 'front'), photo('BACK_SIDE', 'back')],
              },
            ],
          },
        } as BCState,
        jest.fn(),
      ])

      mockEvidenceApi.sendEvidenceMetadata.mockResolvedValue([
        { label: 'FRONT_SIDE', upload_uri: 'front-uri' },
        { label: 'BACK_SIDE', upload_uri: 'back-uri' },
      ])

      const { result } = renderHook(() => useEvidenceUpload())

      let uploads: EvidenceUploadItem[] = []
      await act(async () => {
        uploads = await result.current.processAdditionalEvidence()
      })

      const payload = mockEvidenceApi.sendEvidenceMetadata.mock.calls[0][0]
      expect(payload.images).toHaveLength(2)
      expect(uploads).toHaveLength(2)
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })
  })
})
