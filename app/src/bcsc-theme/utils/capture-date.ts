/**
 * Migration-scoped repair machinery for #4338 (evidence capture dates corrupted by an Android
 * native timestamp round-trip bug). On a fixed build there is no path to an implausible date —
 * capture guarantees plausibility, and the native write/read round-trip is unit-correct — so
 * everything in this file exists solely to repair evidence metadata written by builds that
 * predate the fix. It comes out as a group, along with the pointers at its other call sites
 * (EvidenceTimestamps.kt, useSecureActions.tsx, useEvidenceUpload.tsx), once that data has aged
 * out. See #4373.
 */
import { BifoldLogger } from '@bifold/core'
import { EvidenceMetadata } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'

/**
 * 2020-01-01T00:00:00Z. This floor's job is separating structurally corrupt values from real
 * dates, not rejecting clock skew: the pre-fix double-division bug's corrupted-value ladder tops
 * out around 1_782_000 seconds (~1970-01-21), four orders of magnitude below this floor, so
 * there's no realistic corrupted value anywhere near it.
 */
export const MIN_PLAUSIBLE_CAPTURE_DATE_SECONDS = 1577836800

/**
 * True iff `seconds` is at or after 2020-01-01. No upper bound is enforced — there's no
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
 * Logs exactly one warning per call (on every branch), so callers should NOT log their own
 * "substituting" warning around this — pass anything worth surfacing via `context` instead.
 *
 * @param filePath - Path to the evidence photo file.
 * @param logger - Logger used to record the substitution.
 * @param context - Extra fields merged into the log payload (e.g. evidence type, label).
 */
export const derivePlausibleCaptureDateSeconds = async (
  filePath: string,
  logger: BifoldLogger,
  context: Record<string, unknown> = {}
): Promise<number> => {
  try {
    const stats = await RNFS.stat(filePath)
    const mtimeSeconds = Math.floor(new Date(stats.mtime).getTime() / 1000)
    if (isPlausibleCaptureDateSeconds(mtimeSeconds)) {
      logger.warn('Implausible evidence capture date substituted with file mtime', { filePath, ...context })
      return mtimeSeconds
    }
  } catch (error) {
    logger.warn('Failed to read file mtime while substituting implausible evidence capture date', {
      filePath,
      ...context,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  logger.warn('Implausible evidence capture date has no real capture signal available, using 0', {
    filePath,
    ...context,
  })
  return 0
}

/**
 * Repairs every photo's capture date across a list of evidence entries, substituting any
 * implausible value (e.g. corrupted by the Android native round-trip bug, see #4338) via
 * {@link derivePlausibleCaptureDateSeconds}.
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

      return { ...item, metadata }
    })
  )

  return { repaired, changed }
}
