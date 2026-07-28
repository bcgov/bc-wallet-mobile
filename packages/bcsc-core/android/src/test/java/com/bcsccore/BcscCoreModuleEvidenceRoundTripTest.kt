package com.bcsccore

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Fixes #4338. Drives [BcscCoreModule.convertToEvidenceUploadEntry] (write) and
 * [BcscCoreModule.addEvidenceMetadataFromObjectJson] (read) directly, bypassing the
 * file-backed setEvidence/getEvidence pair, to prove the write->read round trip preserves
 * capture dates instead of silently dividing an already-correct value by 1000.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleEvidenceRoundTripTest {
    private lateinit var mockReactContext: ReactApplicationContext
    private lateinit var module: BcscCoreModule

    @Before
    fun setUp() {
        mockReactContext = mockk(relaxed = true)

        // Arguments.createMap()/createArray() must return a fresh instance per call — `answers`
        // (not `returns`) so nested maps/arrays built during a single parse don't alias each other.
        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }
        every { Arguments.createArray() } answers { JavaOnlyArray() }

        module = BcscCoreModule(mockReactContext)
    }

    @After
    fun tearDown() {
        unmockkStatic(Arguments::class)
    }

    private fun photoInput(
        filePath: String,
        label: String,
        dateSeconds: Long,
    ): ReadableMap =
        JavaOnlyMap().apply {
            putString("file_path", filePath)
            putString("label", label)
            putDouble("date", dateSeconds.toDouble())
        }

    private fun evidenceInput(
        documentNumber: String,
        photos: List<ReadableMap>,
    ): ReadableMap =
        JavaOnlyMap().apply {
            putString("documentNumber", documentNumber)
            putArray(
                "metadata",
                JavaOnlyArray().apply { photos.forEach { pushMap(it) } },
            )
        }

    /** Wraps entries the way setEvidence does: JSONObject keyed "evidence1"/"evidence2". */
    private fun wrapAsEvidenceUpload(entries: List<JSONObject>): String {
        val evidenceUpload = JSONObject()
        entries.forEachIndexed { i, entry ->
            evidenceUpload.put(if (i == 0) "evidence1" else "evidence2", entry)
        }
        return evidenceUpload.toString()
    }

    private fun readBackDates(json: String): List<List<Long>> {
        val result = JavaOnlyArray()
        module.addEvidenceMetadataFromObjectJson(json, result)

        return (0 until result.size()).map { entryIndex ->
            val entry = result.getMap(entryIndex)
            val metadata = entry.getArray("metadata")!!
            (0 until metadata.size()).map { photoIndex ->
                metadata.getMap(photoIndex).getDouble("date").toLong()
            }
        }
    }

    // MARK: - single-side round trip

    @Test
    fun `single-side entry round trips capture date unchanged`() {
        val captureSeconds = 1_782_000_000L
        val item = evidenceInput("DL123", listOf(photoInput("/docs/front.jpg", "FRONT_SIDE", captureSeconds)))

        val entry = module.convertToEvidenceUploadEntry(item)
        val dates = readBackDates(wrapAsEvidenceUpload(listOf(entry)))

        assertEquals(listOf(listOf(captureSeconds)), dates)
    }

    // MARK: - two-side round trip

    @Test
    fun `two-side entry round trips both capture dates unchanged`() {
        val frontSeconds = 1_782_000_000L
        val backSeconds = 1_782_000_030L
        val item =
            evidenceInput(
                "DL123",
                listOf(
                    photoInput("/docs/front.jpg", "FRONT_SIDE", frontSeconds),
                    photoInput("/docs/back.jpg", "BACK_SIDE", backSeconds),
                ),
            )

        val entry = module.convertToEvidenceUploadEntry(item)
        val dates = readBackDates(wrapAsEvidenceUpload(listOf(entry)))

        assertEquals(listOf(listOf(frontSeconds, backSeconds)), dates)
    }

    @Test
    fun `two entries (front and back document types) each round trip independently`() {
        val entry1Seconds = 1_782_000_000L
        val entry2Seconds = 1_782_100_000L
        val entry1 =
            module.convertToEvidenceUploadEntry(
                evidenceInput("DL1", listOf(photoInput("/a.jpg", "FRONT_SIDE", entry1Seconds))),
            )
        val entry2 =
            module.convertToEvidenceUploadEntry(
                evidenceInput("DL2", listOf(photoInput("/b.jpg", "FRONT_SIDE", entry2Seconds))),
            )

        val dates = readBackDates(wrapAsEvidenceUpload(listOf(entry1, entry2)))

        assertEquals(listOf(listOf(entry1Seconds), listOf(entry2Seconds)), dates)
    }

    // MARK: - stability across repeated hydrate/persist cycles

    @Test
    fun `capture date is stable across 3 repeated write-read cycles`() {
        var seconds = 1_782_000_000L

        repeat(3) {
            val item = evidenceInput("DL123", listOf(photoInput("/docs/front.jpg", "FRONT_SIDE", seconds)))
            val entry = module.convertToEvidenceUploadEntry(item)
            seconds = readBackDates(wrapAsEvidenceUpload(listOf(entry))).single().single()
        }

        assertEquals(1_782_000_000L, seconds)
    }

    // MARK: - v3-format fixture (millisecond-magnitude timestamp already on disk)

    @Test
    fun `v3-format fixture with millisecond timestamp reads back a correct capture date in seconds`() {
        val v3MillisTimestamp = 1_782_000_000_000L
        val fixtureJson =
            JSONObject()
                .apply {
                    put(
                        "evidence1",
                        JSONObject().apply {
                            put("evidencedetails", JSONObject().put("document_number", "DL123"))
                            put(
                                "images",
                                JSONObject().put(
                                    "evidencePhotos",
                                    org.json.JSONArray().put(
                                        JSONObject().apply {
                                            put("filepath", "/docs/front.jpg")
                                            put("label", "FRONT_SIDE")
                                            put("timestamp", v3MillisTimestamp)
                                        },
                                    ),
                                ),
                            )
                        },
                    )
                }.toString()

        val dates = readBackDates(fixtureJson)

        assertEquals(listOf(listOf(1_782_000_000L)), dates)
    }

    // MARK: - corrupted / implausible values

    @Test
    fun `an implausible capture date (already corrupted to near-1970) writes as 0`() {
        // Simulates data already mangled by the pre-fix double-division bug.
        val corruptedSeconds = 1_780_000L
        val item = evidenceInput("DL123", listOf(photoInput("/docs/front.jpg", "FRONT_SIDE", corruptedSeconds)))

        val entry = module.convertToEvidenceUploadEntry(item)
        val storedTimestamp =
            entry
                .getJSONObject("images")
                .getJSONArray("evidencePhotos")
                .getJSONObject(0)
                .getLong("timestamp")

        assertEquals(0L, storedTimestamp)
    }

    @Test
    fun `a zero capture date round trips to 0, not a plausible-looking date`() {
        val item = evidenceInput("DL123", listOf(photoInput("/docs/front.jpg", "FRONT_SIDE", 0L)))

        val entry = module.convertToEvidenceUploadEntry(item)
        val dates = readBackDates(wrapAsEvidenceUpload(listOf(entry)))

        assertEquals(listOf(listOf(0L)), dates)
    }
}
