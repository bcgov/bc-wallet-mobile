package com.bcsccore

/**
 * Converts evidence photo capture timestamps between the JS API's second-magnitude
 * representation and the v3-compatible millisecond-magnitude representation used by
 * on-device evidence storage.
 *
 * Fixes #4338: [convertToEvidenceUploadEntry] previously wrote `date` (seconds) straight into
 * the stored `timestamp` field, while the read path unconditionally divided by 1000 assuming
 * v3's millisecond storage. Every v4-written value was then divided again, collapsing a
 * mid-2026 capture date to ~21 January 1970. The magnitude checks here make both directions
 * self-correcting: writes always store millis, reads infer the unit from magnitude instead of
 * assuming it. The plausibility floor is NOT a blanket rule for the whole file — it only
 * collapses sub-floor values that already arrive at seconds magnitude (pre-#4338-fix data). A
 * millis-magnitude value is always divided and returned as-is on read, unfloored — a faithful
 * unit conversion, not a plausibility judgment. That read result does NOT necessarily survive:
 * a below-floor quotient is zeroed on the next write-back by [apiSecondsToStoredMillis], and
 * discarded by the JS layer at upload regardless. This read/write asymmetry is known and
 * deliberate, with no observable consequence — nothing else consumes this field between read and
 * write. See [storedTimestampToApiSeconds] for the branch-by-branch reasoning. There is no upper
 * bound: far-future values pass through unchanged by design, since no server-side validation
 * depends on one.
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
     * Stored value -> API seconds. The floor applies to exactly one branch, not the function as
     * a whole:
     * - millis-magnitude (>= [MILLISECONDS_THRESHOLD], v3 + fixed v4): divides and returns the
     *   quotient UNFLOORED, deliberately. Do not add a floor check to this branch. Its job is a
     *   faithful magnitude conversion, not a plausibility judgment — the pre-fix double-division
     *   corruption ladder only ever lands at seconds magnitude (see [MIN_PLAUSIBLE_SECONDS]'s
     *   doc), never at millis magnitude, so there is nothing here for the floor to catch. (A
     *   below-floor quotient IS zeroed on the very next write-back by [apiSecondsToStoredMillis],
     *   and discarded by the JS layer at upload regardless — a known, deliberate read/write
     *   asymmetry with no observable consequence, since nothing else consumes this field between
     *   read and write.)
     * - seconds-magnitude (migration-scoped: only pre-#4338-fix v4 data lands here, see #4373):
     *   passes through when >= [MIN_PLAUSIBLE_SECONDS], collapses to 0 otherwise — this is
     *   where the floor is actually enforced, because this is where the corrupted values land.
     *
     * No upper bound is enforced — a far-future second-magnitude value passes through unchanged.
     */
    fun storedTimestampToApiSeconds(stored: Long): Long =
        when {
            stored >= MILLISECONDS_THRESHOLD -> stored / 1000L

            // Migration-scoped: only pre-#4338-fix data lands here. See #4373.
            stored >= MIN_PLAUSIBLE_SECONDS -> stored

            else -> 0L
        }
}
