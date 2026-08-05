package com.bcsccore

/**
 * Converts evidence photo capture timestamps between the JS API's second-magnitude
 * representation and the v3-compatible millisecond-magnitude representation used by
 * on-device evidence storage.
 *
 * Fixes #4338: [convertToEvidenceUploadEntry] previously wrote `date` (seconds) straight into
 * the stored `timestamp` field, while the read path unconditionally divided by 1000 assuming
 * v3's millisecond storage. Every v4-written value was then divided again, collapsing a
 * mid-2026 capture date to ~21 January 1970. Writes now always store millis (matching the v3
 * format); reads infer the unit from magnitude instead of assuming it.
 */
object EvidenceTimestamps {
    /**
     * 2020-01-01T00:00:00Z. This floor's job is separating structurally corrupt values from real
     * dates, not rejecting clock skew: the pre-fix double-division bug's corrupted-value ladder
     * tops out around 1_782_000 seconds (~1970-01-21), four orders of magnitude below this floor,
     * so there's no realistic corrupted value anywhere near it.
     */
    const val MIN_PLAUSIBLE_SECONDS = 1_577_836_800L

    /** At/above this magnitude a stored value is unambiguously milliseconds. */
    const val MILLISECONDS_THRESHOLD = 100_000_000_000L

    /** JS seconds -> stored v3-format millis; input below [MIN_PLAUSIBLE_SECONDS] collapses to 0. */
    fun apiSecondsToStoredMillis(seconds: Long): Long = if (seconds >= MIN_PLAUSIBLE_SECONDS) seconds * 1000L else 0L

    /**
     * Stored value -> API seconds.
     * - millis-magnitude (v3 + fixed v4): a faithful unit conversion — divides and returns the
     *   quotient unfloored. Don't add a floor here: the corruption the floor exists to catch
     *   only ever lands at seconds magnitude.
     * - seconds-magnitude (only pre-#4338-fix v4 data lands here): passes through when
     *   plausible, collapses to 0 otherwise.
     *
     * No upper bound is enforced — a far-future value passes through unchanged.
     */
    fun storedTimestampToApiSeconds(stored: Long): Long =
        when {
            stored >= MILLISECONDS_THRESHOLD -> stored / 1000L

            // Migration-scoped: only pre-#4338-fix data lands here. See #4373.
            stored >= MIN_PLAUSIBLE_SECONDS -> stored

            else -> 0L
        }
}
