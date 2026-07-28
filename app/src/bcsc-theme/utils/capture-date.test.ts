import {
  derivePlausibleCaptureDateSeconds,
  isPlausibleCaptureDateSeconds,
  MAX_CLOCK_SKEW_SECONDS,
  MIN_PLAUSIBLE_CAPTURE_DATE_SECONDS,
  repairEvidenceCaptureDates,
} from '@/bcsc-theme/utils/capture-date'
import { MockLogger } from '@bifold/core'
import { EvidenceMetadata, PhotoMetadata } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'

jest.mock('react-native-fs', () => ({
  stat: jest.fn(),
}))

const photo = (overrides: Partial<PhotoMetadata> = {}): PhotoMetadata => ({
  label: 'FRONT_SIDE',
  content_type: 'image/jpeg',
  content_length: 1,
  date: 1_782_000_000,
  sha256: 'sha',
  file_path: '/docs/front.jpg',
  ...overrides,
})

describe('capture-date utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isPlausibleCaptureDateSeconds', () => {
    const nowMs = new Date('2026-07-28T00:00:00Z').getTime()

    it('returns true for a plausible mid-range value', () => {
      expect(isPlausibleCaptureDateSeconds(1_782_000_000, nowMs)).toBe(true)
    })

    it('returns true at the exact floor boundary', () => {
      expect(isPlausibleCaptureDateSeconds(MIN_PLAUSIBLE_CAPTURE_DATE_SECONDS, nowMs)).toBe(true)
    })

    it('returns false just below the floor boundary', () => {
      expect(isPlausibleCaptureDateSeconds(MIN_PLAUSIBLE_CAPTURE_DATE_SECONDS - 1, nowMs)).toBe(false)
    })

    it('returns true at the exact ceiling boundary (now + max clock skew)', () => {
      const ceiling = Math.floor(nowMs / 1000) + MAX_CLOCK_SKEW_SECONDS
      expect(isPlausibleCaptureDateSeconds(ceiling, nowMs)).toBe(true)
    })

    it('returns false just above the ceiling boundary', () => {
      const justAboveCeiling = Math.floor(nowMs / 1000) + MAX_CLOCK_SKEW_SECONDS + 1
      expect(isPlausibleCaptureDateSeconds(justAboveCeiling, nowMs)).toBe(false)
    })

    it('returns false for a millisecond-magnitude value masquerading as seconds', () => {
      // e.g. Date.now() passed unconverted — this is what a unit-mismatch bug would produce.
      expect(isPlausibleCaptureDateSeconds(nowMs, nowMs)).toBe(false)
    })

    it('returns false for zero (the corrupted-to-1970 case)', () => {
      expect(isPlausibleCaptureDateSeconds(0, nowMs)).toBe(false)
    })

    it('returns false for a negative value', () => {
      expect(isPlausibleCaptureDateSeconds(-1, nowMs)).toBe(false)
    })

    it('defaults nowMs to Date.now() when not provided', () => {
      const spy = jest.spyOn(Date, 'now').mockReturnValue(nowMs)
      expect(isPlausibleCaptureDateSeconds(1_782_000_000)).toBe(true)
      spy.mockRestore()
    })
  })

  describe('derivePlausibleCaptureDateSeconds', () => {
    it('uses the file mtime when it is plausible', async () => {
      const mockLogger = new MockLogger()
      const mtimeMs = new Date('2026-06-15T00:00:00Z').getTime()
      ;(RNFS.stat as jest.Mock).mockResolvedValue({ mtime: mtimeMs })

      const result = await derivePlausibleCaptureDateSeconds('/docs/front.jpg', mockLogger)

      expect(result).toBe(Math.floor(mtimeMs / 1000))
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('substituted with file mtime'),
        expect.objectContaining({ filePath: '/docs/front.jpg' })
      )
    })

    it('returns 0 when the file mtime is itself implausible (no real capture signal available)', async () => {
      const mockLogger = new MockLogger()
      ;(RNFS.stat as jest.Mock).mockResolvedValue({ mtime: 0 })

      const result = await derivePlausibleCaptureDateSeconds('/docs/front.jpg', mockLogger)

      expect(result).toBe(0)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('no real capture signal available'),
        expect.objectContaining({ filePath: '/docs/front.jpg' })
      )
    })

    it('returns 0 and never throws when RNFS.stat rejects', async () => {
      const mockLogger = new MockLogger()
      ;(RNFS.stat as jest.Mock).mockRejectedValue(new Error('ENOENT'))

      const result = await derivePlausibleCaptureDateSeconds('/docs/missing.jpg', mockLogger)

      expect(result).toBe(0)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read file mtime'),
        expect.objectContaining({ filePath: '/docs/missing.jpg' })
      )
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('no real capture signal available'),
        expect.objectContaining({ filePath: '/docs/missing.jpg' })
      )
    })
  })

  describe('repairEvidenceCaptureDates', () => {
    it('reports no change and preserves identity when all dates are plausible', async () => {
      const mockLogger = new MockLogger()
      const evidence: EvidenceMetadata[] = [
        { metadata: [photo({ date: 1_782_000_000 }), photo({ date: 1_782_000_030, label: 'BACK_SIDE' })] },
      ]

      const { repaired, changed } = await repairEvidenceCaptureDates(evidence, mockLogger)

      expect(changed).toBe(false)
      expect(repaired).toEqual(evidence)
      expect(repaired[0]).toBe(evidence[0])
      expect(RNFS.stat).not.toHaveBeenCalled()
    })

    it('substitutes only the implausible photo date and flags changed', async () => {
      const mockLogger = new MockLogger()
      const mtimeMs = new Date('2026-06-15T00:00:00Z').getTime()
      ;(RNFS.stat as jest.Mock).mockResolvedValue({ mtime: mtimeMs })

      const goodPhoto = photo({ date: 1_782_000_000, file_path: '/docs/front.jpg' })
      const corruptedPhoto = photo({ date: 1_780_000, file_path: '/docs/back.jpg', label: 'BACK_SIDE' })
      const evidence: EvidenceMetadata[] = [{ metadata: [goodPhoto, corruptedPhoto] }]

      const { repaired, changed } = await repairEvidenceCaptureDates(evidence, mockLogger)

      expect(changed).toBe(true)
      expect(repaired[0].metadata[0]).toBe(goodPhoto)
      expect(repaired[0].metadata[1]).not.toBe(corruptedPhoto)
      expect(repaired[0].metadata[1].date).toBe(Math.floor(mtimeMs / 1000))
      expect(repaired[0].metadata[1].file_path).toBe('/docs/back.jpg')
    })

    it('is idempotent: repairing an already-repaired list reports no further change', async () => {
      const mockLogger = new MockLogger()
      const mtimeMs = new Date('2026-06-15T00:00:00Z').getTime()
      ;(RNFS.stat as jest.Mock).mockResolvedValue({ mtime: mtimeMs })

      const evidence: EvidenceMetadata[] = [{ metadata: [photo({ date: 1_780_000, file_path: '/docs/a.jpg' })] }]

      const first = await repairEvidenceCaptureDates(evidence, mockLogger)
      expect(first.changed).toBe(true)

      const second = await repairEvidenceCaptureDates(first.repaired, mockLogger)
      expect(second.changed).toBe(false)
      expect(second.repaired).toEqual(first.repaired)
    })

    it('handles multiple evidence entries independently', async () => {
      const mockLogger = new MockLogger()
      const mtimeMs = new Date('2026-06-15T00:00:00Z').getTime()
      ;(RNFS.stat as jest.Mock).mockResolvedValue({ mtime: mtimeMs })

      const evidence: EvidenceMetadata[] = [
        { metadata: [photo({ date: 1_782_000_000, file_path: '/docs/a.jpg' })] },
        { metadata: [photo({ date: 1_780_000, file_path: '/docs/b.jpg' })] },
      ]

      const { repaired, changed } = await repairEvidenceCaptureDates(evidence, mockLogger)

      expect(changed).toBe(true)
      expect(repaired[0]).toBe(evidence[0])
      expect(repaired[1]).not.toBe(evidence[1])
      expect(repaired[1].metadata[0].date).toBe(Math.floor(mtimeMs / 1000))
    })

    it('returns an empty result for an empty evidence list', async () => {
      const mockLogger = new MockLogger()

      const { repaired, changed } = await repairEvidenceCaptureDates([], mockLogger)

      expect(repaired).toEqual([])
      expect(changed).toBe(false)
    })
  })
})
