import {
  derivePlausibleCaptureDateSeconds,
  isPlausibleCaptureDateSeconds,
  MIN_PLAUSIBLE_CAPTURE_DATE_SECONDS,
} from '@/bcsc-theme/utils/capture-date'
import { MockLogger } from '@bifold/core'
import RNFS from 'react-native-fs'

jest.mock('react-native-fs', () => ({
  stat: jest.fn(),
}))

describe('capture-date utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isPlausibleCaptureDateSeconds', () => {
    it('pins the floor to 2020-01-01, not the pre-revision 2026-06-01 value', () => {
      // The boundary tests below assert relative to this constant, so they pass for ANY floor
      // value — pinning the literal here is what actually protects against a floor regression.
      expect(MIN_PLAUSIBLE_CAPTURE_DATE_SECONDS).toBe(1577836800)
    })

    it('treats a v3-migrated early-2026 date as plausible (below the pre-revision floor, above the 2020 one)', () => {
      // 1_773_100_000 (~2026-03-10) sits below the old 2026-06-01 floor this revision reverted
      // and above the 2020-01-01 floor it restored — mirrors EvidenceTimestampsTest.kt's
      // equivalent case on the Kotlin side. Without this, no test here would catch a regression
      // back to the old floor value.
      expect(isPlausibleCaptureDateSeconds(1_773_100_000)).toBe(true)
    })

    it('returns true for a plausible mid-range value', () => {
      expect(isPlausibleCaptureDateSeconds(1_782_000_000)).toBe(true)
    })

    it('returns true at the exact floor boundary', () => {
      expect(isPlausibleCaptureDateSeconds(MIN_PLAUSIBLE_CAPTURE_DATE_SECONDS)).toBe(true)
    })

    it('returns false just below the floor boundary', () => {
      expect(isPlausibleCaptureDateSeconds(MIN_PLAUSIBLE_CAPTURE_DATE_SECONDS - 1)).toBe(false)
    })

    it('returns true for a far-future value (no upper bound is enforced)', () => {
      expect(isPlausibleCaptureDateSeconds(MIN_PLAUSIBLE_CAPTURE_DATE_SECONDS + 100 * 365 * 24 * 60 * 60)).toBe(true)
    })

    it('returns false for zero (the corrupted-to-1970 case)', () => {
      expect(isPlausibleCaptureDateSeconds(0)).toBe(false)
    })

    it('returns false for a negative value', () => {
      expect(isPlausibleCaptureDateSeconds(-1)).toBe(false)
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

    it('returns 0 and never throws when RNFS.stat rejects, logging exactly one warning', async () => {
      const mockLogger = new MockLogger()
      ;(RNFS.stat as jest.Mock).mockRejectedValue(new Error('ENOENT'))

      const result = await derivePlausibleCaptureDateSeconds('/docs/missing.jpg', mockLogger)

      expect(result).toBe(0)
      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read file mtime'),
        expect.objectContaining({ filePath: '/docs/missing.jpg' })
      )
    })
  })
})
