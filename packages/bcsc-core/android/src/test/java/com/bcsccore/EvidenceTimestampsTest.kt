package com.bcsccore

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Fixes #4338. Verifies the magnitude-based unit inference that replaced the unconditional
 * "stored value is always millis" assumption which corrupted v4-written evidence capture dates.
 */
class EvidenceTimestampsTest {
    // MARK: - apiSecondsToStoredMillis

    @Test
    fun `apiSecondsToStoredMillis multiplies a plausible seconds value by 1000`() {
        val midYear2026Seconds = 1_782_000_000L

        val result = EvidenceTimestamps.apiSecondsToStoredMillis(midYear2026Seconds)

        assertEquals(midYear2026Seconds * 1000L, result)
    }

    @Test
    fun `apiSecondsToStoredMillis at the plausibility floor multiplies normally`() {
        val result = EvidenceTimestamps.apiSecondsToStoredMillis(EvidenceTimestamps.MIN_PLAUSIBLE_SECONDS)

        assertEquals(EvidenceTimestamps.MIN_PLAUSIBLE_SECONDS * 1000L, result)
    }

    @Test
    fun `apiSecondsToStoredMillis collapses a value just below the plausibility floor to 0`() {
        val result = EvidenceTimestamps.apiSecondsToStoredMillis(EvidenceTimestamps.MIN_PLAUSIBLE_SECONDS - 1L)

        assertEquals(0L, result)
    }

    @Test
    fun `apiSecondsToStoredMillis collapses zero to 0`() {
        val result = EvidenceTimestamps.apiSecondsToStoredMillis(0L)

        assertEquals(0L, result)
    }

    @Test
    fun `apiSecondsToStoredMillis collapses a negative value to 0`() {
        val result = EvidenceTimestamps.apiSecondsToStoredMillis(-1L)

        assertEquals(0L, result)
    }

    // MARK: - storedTimestampToApiSeconds

    @Test
    fun `storedTimestampToApiSeconds divides a v3-style millisecond value`() {
        val v3MillisValue = 1_782_000_000_000L

        val result = EvidenceTimestamps.storedTimestampToApiSeconds(v3MillisValue)

        assertEquals(1_782_000_000L, result)
    }

    @Test
    fun `storedTimestampToApiSeconds divides a value written by the fixed v4 write path`() {
        // The fixed write path always stores millis, so this is the steady-state case post-fix.
        val fixedV4MillisValue = EvidenceTimestamps.apiSecondsToStoredMillis(1_782_000_000L)

        val result = EvidenceTimestamps.storedTimestampToApiSeconds(fixedV4MillisValue)

        assertEquals(1_782_000_000L, result)
    }

    @Test
    fun `storedTimestampToApiSeconds passes through a plausible pre-fix v4 seconds value unchanged`() {
        // Data written by the pre-#4338-fix buggy write path (seconds stored directly, no
        // multiplication) is still in the plausible-seconds range, not the millis range.
        val preFixV4SecondsValue = 1_782_000_000L

        val result = EvidenceTimestamps.storedTimestampToApiSeconds(preFixV4SecondsValue)

        assertEquals(preFixV4SecondsValue, result)
    }

    @Test
    fun `storedTimestampToApiSeconds collapses an implausibly small value to 0`() {
        // e.g. a value already corrupted by the pre-fix bug's double division (~1970).
        val result = EvidenceTimestamps.storedTimestampToApiSeconds(1_780_000L)

        assertEquals(0L, result)
    }

    @Test
    fun `storedTimestampToApiSeconds collapses zero to 0`() {
        val result = EvidenceTimestamps.storedTimestampToApiSeconds(0L)

        assertEquals(0L, result)
    }

    @Test
    fun `storedTimestampToApiSeconds treats the millis threshold boundary as milliseconds`() {
        val result = EvidenceTimestamps.storedTimestampToApiSeconds(EvidenceTimestamps.MILLISECONDS_THRESHOLD)

        assertEquals(EvidenceTimestamps.MILLISECONDS_THRESHOLD / 1000L, result)
    }

    @Test
    fun `storedTimestampToApiSeconds treats just below the millis threshold as seconds`() {
        val justBelowThreshold = EvidenceTimestamps.MILLISECONDS_THRESHOLD - 1L

        val result = EvidenceTimestamps.storedTimestampToApiSeconds(justBelowThreshold)

        assertEquals(justBelowThreshold, result)
    }

    // MARK: - round trip

    @Test
    fun `write then read round trip preserves a plausible capture date in seconds`() {
        val captureSeconds = 1_782_000_000L

        val stored = EvidenceTimestamps.apiSecondsToStoredMillis(captureSeconds)
        val readBack = EvidenceTimestamps.storedTimestampToApiSeconds(stored)

        assertEquals(captureSeconds, readBack)
    }

    @Test
    fun `write then read round trip is stable across repeated cycles`() {
        var seconds = 1_782_000_000L

        repeat(3) {
            val stored = EvidenceTimestamps.apiSecondsToStoredMillis(seconds)
            seconds = EvidenceTimestamps.storedTimestampToApiSeconds(stored)
        }

        assertEquals(1_782_000_000L, seconds)
    }
}
