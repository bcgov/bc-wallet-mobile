import useApi from '@/bcsc-theme/api/hooks/useApi'
import useEvidenceUpload, { EvidenceUploadItem } from '@/bcsc-theme/hooks/useEvidenceUpload'
import { BCState } from '@/store'
import readFileInChunks from '@/utils/read-file'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { PhotoMetadata } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/utils/read-file')
jest.mock('react-native-fs', () => ({
  stat: jest.fn(),
}))
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

  // A plausible capture date (mid-2026) — the default so existing tests aren't tripped up by
  // the date-plausibility guard added for #4338. Tests targeting that guard override this.
  const plausibleDate = 1_782_000_000

  const photo = (label: string, tag: string, date: number = plausibleDate): PhotoMetadata => ({
    label,
    content_type: 'image/jpeg',
    content_length: 1,
    date,
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

    it('substitutes an implausible capture date (#4338) with the file mtime before upload', async () => {
      const mtimeMs = new Date('2026-06-15T00:00:00Z').getTime()
      jest.mocked(RNFS.stat).mockResolvedValue({ mtime: mtimeMs } as any)

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
                metadata: [
                  photo('FRONT_SIDE', 'front'),
                  // Corrupted to a near-1970 value, as the Android native round-trip bug produces.
                  photo('BACK_SIDE', 'back', 1_780_000),
                ],
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

      await act(async () => {
        await result.current.processAdditionalEvidence()
      })

      const payload = mockEvidenceApi.sendEvidenceMetadata.mock.calls[0][0]
      const frontImage = payload.images.find((i: PhotoMetadata) => i.label === 'FRONT_SIDE')
      const backImage = payload.images.find((i: PhotoMetadata) => i.label === 'BACK_SIDE')

      expect(frontImage.date).toBe(plausibleDate)
      expect(backImage.date).toBe(Math.floor(mtimeMs / 1000))
      // Exactly one warn for the substitution (derivePlausibleCaptureDateSeconds logs it; the
      // call site no longer logs its own on top — see #4373).
      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('substituted with file mtime'),
        expect.objectContaining({ label: 'BACK_SIDE', evidenceType: 'drivers_licence' })
      )
    })

    it('passes a plausible capture date through untouched', async () => {
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

      await act(async () => {
        await result.current.processAdditionalEvidence()
      })

      const payload = mockEvidenceApi.sendEvidenceMetadata.mock.calls[0][0]
      expect(payload.images.every((i: PhotoMetadata) => i.date === plausibleDate)).toBe(true)
      expect(RNFS.stat).not.toHaveBeenCalled()
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })
  })

  describe('uploadSelfiePhoto', () => {
    it('substitutes an implausible selfie capture date with the permanent file mtime before upload', async () => {
      const mtimeMs = new Date('2026-06-15T00:00:00Z').getTime()
      jest.mocked(RNFS.stat).mockResolvedValue({ mtime: mtimeMs } as any)

      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([
        {
          ...baseStore,
          bcsc: {
            // The camera temp path — distinct from photoMetadata.file_path (the permanent path)
            // so the test can't pass by accident if the guard stats the wrong one.
            photoPath: '/tmp/camera/selfie-temp.jpg',
            photoMetadata: { ...photo('front', 'selfie', 1_780_000), file_path: '/permanent/selfie.jpg' },
          },
        } as unknown as BCState,
        jest.fn(),
      ])

      mockEvidenceApi.uploadPhotoEvidenceMetadata.mockResolvedValue({ upload_uri: 'selfie-uri' })

      const { result } = renderHook(() => useEvidenceUpload())

      await act(async () => {
        await result.current.uploadSelfiePhoto()
      })

      expect(RNFS.stat).toHaveBeenCalledWith('/permanent/selfie.jpg')
      expect(mockEvidenceApi.uploadPhotoEvidenceMetadata).toHaveBeenCalledWith(
        expect.objectContaining({ date: Math.floor(mtimeMs / 1000) })
      )
      // Exactly one warn for the substitution — see #4373.
      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('substituted with file mtime'),
        expect.objectContaining({ date: 1_780_000 })
      )
    })

    it('passes a plausible selfie capture date through untouched', async () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([
        {
          ...baseStore,
          bcsc: {
            photoPath: '/selfie.jpg',
            photoMetadata: photo('front', 'selfie'),
          },
        } as unknown as BCState,
        jest.fn(),
      ])

      mockEvidenceApi.uploadPhotoEvidenceMetadata.mockResolvedValue({ upload_uri: 'selfie-uri' })

      const { result } = renderHook(() => useEvidenceUpload())

      await act(async () => {
        await result.current.uploadSelfiePhoto()
      })

      expect(mockEvidenceApi.uploadPhotoEvidenceMetadata).toHaveBeenCalledWith(
        expect.objectContaining({ date: plausibleDate })
      )
      expect(RNFS.stat).not.toHaveBeenCalled()
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })
  })
})
