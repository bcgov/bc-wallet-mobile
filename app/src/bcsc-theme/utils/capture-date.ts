import { BifoldLogger } from '@bifold/core'
import { EvidenceMetadata } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'

/** 2026-06-01T00:00:00Z — no legitimate capture predates this. */
export const MIN_PLAUSIBLE_CAPTURE_DATE_SECONDS = 1780272000

/**
 * True iff `seconds` is at or after 2026-06-01. No upper bound is enforced — there's no
 * server-side validation that cares about future-dated captures.
 *
 * @param seconds - A Unix timestamp, in seconds, to validate.
 */
export const isPlausibleCaptureDateSeconds = (seconds: number): boolean => seconds >= MIN_PLAUSIBLE_CAPTURE_DATE_SECONDS

/**
 * Derives a plausible replacement capture date (in seconds) for a photo whose stored date
 * failed the plausibility check. Prefers the file's on-disk modification time, since that's
 * still a real signal of when the photo was captured; returns 0 when no real capture signal is
 * available (file missing/unreadable, or its mtime is itself implausible). Deliberately does
 * NOT fall back to the current time here — for evidence already collected, a fabricated date
 * with no connection to the actual capture is worse than an explicit "unknown". Never throws.
 *
 * @param filePath - Path to the evidence photo file.
 * @param logger - Logger used to record the substitution.
 */
export const derivePlausibleCaptureDateSeconds = async (filePath: string, logger: BifoldLogger): Promise<number> => {
  try {
    const stats = await RNFS.stat(filePath)
    const mtimeSeconds = Math.floor(new Date(stats.mtime).getTime() / 1000)
    if (isPlausibleCaptureDateSeconds(mtimeSeconds)) {
      logger.warn('Implausible evidence capture date substituted with file mtime', { filePath })
      return mtimeSeconds
    }
  } catch (error) {
    logger.warn('Failed to read file mtime while substituting implausible evidence capture date', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  logger.warn('Implausible evidence capture date has no real capture signal available, using 0', { filePath })
  return 0
}

/**
 * Repairs every photo's capture date across a list of evidence entries, substituting any
 * implausible value (e.g. corrupted by the Android native round-trip bug, see #4338) via
 * {@link derivePlausibleCaptureDateSeconds}. Entries/photos with plausible dates are returned
 * unchanged (same object identity) so callers can cheaply detect "nothing changed".
 *
 * @param evidence - Evidence metadata entries to repair.
 * @param logger - Logger used to record substitutions.
 * @returns The repaired evidence list and whether any date was actually substituted.
 */
export const repairEvidenceCaptureDates = async (
  evidence: EvidenceMetadata[],
  logger: BifoldLogger
): Promise<{ repaired: EvidenceMetadata[]; changed: boolean }> => {
  let changed = false

  const repaired = await Promise.all(
    evidence.map(async (item) => {
      const metadata = await Promise.all(
        item.metadata.map(async (photo) => {
          if (isPlausibleCaptureDateSeconds(photo.date)) {
            return photo
          }

          changed = true
          const date = await derivePlausibleCaptureDateSeconds(photo.file_path, logger)
          return { ...photo, date }
        })
      )

      const itemChanged = metadata.some((photo, i) => photo !== item.metadata[i])
      return itemChanged ? { ...item, metadata } : item
    })
  )

  return { repaired, changed }
}
