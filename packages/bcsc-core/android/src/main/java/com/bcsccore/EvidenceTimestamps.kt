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
 * assuming it, and values below the plausibility floor collapse to 0 rather than propagating a
 * bad date. There is no upper bound: far-future values pass through unchanged by design, since
 * no server-side validation depends on one.
 */
object EvidenceTimestamps {
    /** 2026-06-01T00:00:00Z — no legitimate v4 capture predates this. */
    const val MIN_PLAUSIBLE_SECONDS = 1_780_272_000L

    /** At/above this magnitude a stored value is unambiguously milliseconds. */
    const val MILLISECONDS_THRESHOLD = 100_000_000_000L

    /** JS seconds -> stored v3-format millis; input below [MIN_PLAUSIBLE_SECONDS] collapses to 0. */
    fun apiSecondsToStoredMillis(seconds: Long): Long = if (seconds >= MIN_PLAUSIBLE_SECONDS) seconds * 1000L else 0L

    /**
     * Stored value -> API seconds: divides millis (v3 + fixed v4), passes through pre-fix v4
     * seconds, collapses sub-floor (below [MIN_PLAUSIBLE_SECONDS]) values to 0. No upper bound
     * is enforced — a far-future second-magnitude value passes through unchanged.
     */
    fun storedTimestampToApiSeconds(stored: Long): Long =
        when {
            stored >= MILLISECONDS_THRESHOLD -> stored / 1000L
            stored >= MIN_PLAUSIBLE_SECONDS -> stored
            else -> 0L
        }
}
