/**
 * Capture-date plausibility checking for #4338 (evidence capture dates corrupted by an Android
 * native timestamp round-trip bug). `isPlausibleCaptureDateSeconds` and the floor it's built on
 * also back the live `getPhotoMetadata`/`getVideoMetadata` mtime guards in `file-info.ts`, which
 * are not migration-scoped — those cover `File.lastModified()` returning 0 on failure
 * independent of #4338. `withPlausibleCaptureDate` (and `derivePlausibleCaptureDateSeconds`
 * underneath it) is permanent — it does NOT come out with #4373. Its three call sites have mixed
 * scoping: `useEvidenceUpload.tsx`'s `processAdditionalEvidence` guard is genuinely
 * migration-scoped (guards `additionalEvidenceData`, sourced from native secure storage, which
 * can hold pre-#4338-fix data) and is #4373's removal target; `useEvidenceUpload.tsx`'s
 * `uploadSelfiePhoto` and `useEvidenceUploadModel.tsx`'s send-video guard are permanent AC3
 * boundary checks on `bcsc.photoMetadata`, which is never persisted, so #4373 does not touch
 * them.
 */
import { BifoldLogger } from '@bifold/core'
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
 * still a real signal of when the photo was captured on Android; returns 0 when no real capture
 * signal is available (file missing/unreadable, or its mtime is itself implausible). Deliberately
 * does NOT fall back to the current time here — for evidence already collected, a fabricated date
 * with no connection to the actual capture is worse than an explicit "unknown". Never throws.
 *
 * Note: on iOS, evidence photos are re-materialised to disk on every `getEvidence` call
 * (`BcscCore.swift`'s `convertEvidenceModelToMetadata` → `savePhotoDataToDisk`), so a statted
 * mtime there is the moment of hydration, not of capture — don't rely on the mtime premise
 * above for iOS evidence.
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
    return 0
  }

  logger.warn('Implausible evidence capture date has no real capture signal available, using 0', {
    filePath,
    ...context,
  })
  return 0
}

/**
 * Returns `photo` unchanged (same object identity) if its capture date is already plausible;
 * otherwise substitutes a derived date via {@link derivePlausibleCaptureDateSeconds} and returns
 * a new object. This is #4338's "no upload leaves the app with an implausible capture date"
 * guard (AC3) — the single entry point used by all three call sites (see the file header for
 * their scoping). Does not log its own warning; `derivePlausibleCaptureDateSeconds` owns that.
 *
 * @param photo - Evidence metadata with a `date` and permanent `file_path`.
 * @param logger - Logger passed through on substitution.
 * @param context - Extra fields merged into the log payload if a substitution happens (e.g.
 * evidence type, label).
 */
export const withPlausibleCaptureDate = async <T extends { date: number; file_path: string }>(
  photo: T,
  logger: BifoldLogger,
  context: Record<string, unknown> = {}
): Promise<T> => {
  if (isPlausibleCaptureDateSeconds(photo.date)) {
    return photo
  }

  const date = await derivePlausibleCaptureDateSeconds(photo.file_path, logger, { date: photo.date, ...context })
  return { ...photo, date }
}
