package com.bcsccore

import com.bcsccore.keypair.core.interfaces.BcscKeyPairSource
import com.bcsccore.storage.NativeAccount
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.google.gson.Gson
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

/**
 * `getAccountReadStatus` explains a null `getAccount`. Both run `resolveAccountsWithStatus`, so these tests pin
 * the reported codes for each stage (native-compatible store, then legacy flat file) and that the status agrees
 * with what getAccount actually returned.
 *
 * With no issuer file and no account directories the issuer name resolves to the default, "prod".
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleAccountReadStatusTest {
    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var module: BcscCoreModule

    private val nativeAccountsFile: File
        get() = File(tempFolder.root, "prod" + File.separator + "accounts")

    private val legacyAccountsFile: File
        get() = File(tempFolder.root, "accounts")

    @Before
    fun setUp() {
        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }

        val context = mockk<ReactApplicationContext>(relaxed = true)
        every { context.filesDir } returns tempFolder.root
        module = BcscCoreModule(context, mockk<BcscKeyPairSource>(relaxed = true))
    }

    @After
    fun tearDown() {
        unmockkStatic(Arguments::class)
    }

    private fun writeNativeAccounts(text: String) {
        nativeAccountsFile.parentFile?.mkdirs()
        nativeAccountsFile.writeText(text)
    }

    private fun validNativeAccountsJson(): String =
        Gson().toJson(
            listOf(NativeAccount(uuid = "native-1", issuer = "https://idsit.gov.bc.ca", clientId = "client-1")),
        )

    private fun resolved(call: (Promise) -> Unit): Any? {
        val promise = mockk<Promise>(relaxed = true)
        val values = mutableListOf<Any?>()
        call(promise)
        verify(exactly = 1) { promise.resolve(captureNullable(values)) }
        verify(exactly = 0) { promise.reject(any<String>(), any<String>()) }
        return values.single()
    }

    private fun readStatus(): ReadableMap = resolved { module.getAccountReadStatus(it) } as ReadableMap

    private fun getAccount(): ReadableMap? = resolved { module.getAccount(it) } as ReadableMap?

    // MARK: - Status codes

    @Test
    fun `native account reports ok and skips the legacy read`() {
        writeNativeAccounts(validNativeAccountsJson())

        val status = readStatus()

        assertEquals("ok", status.getString("status"))
        assertEquals("prod", status.getString("environment"))
        assertEquals("skipped", status.getString("legacyStatus"))
        assertFalse(status.hasKey("detail"))
        assertEquals("native-1", getAccount()?.getString("id"))
    }

    @Test
    fun `nothing stored reports account_file_missing and legacy absent`() {
        val status = readStatus()

        assertEquals("account_file_missing", status.getString("status"))
        assertEquals("absent", status.getString("legacyStatus"))
        assertNull(getAccount())
    }

    @Test
    fun `native parse failure reports its detail alongside the legacy outcome`() {
        writeNativeAccounts("[{")

        val status = readStatus()

        assertEquals("account_parse_failed", status.getString("status"))
        assertNotNull(status.getString("detail"))
        assertEquals("absent", status.getString("legacyStatus"))
    }

    @Test
    fun `empty native store falls back to a valid legacy file`() {
        writeNativeAccounts("[]")
        legacyAccountsFile.writeText("""[{"uuid":"legacy-1","issuer":"https://idsit.gov.bc.ca","clientId":"c"}]""")

        val status = readStatus()

        assertEquals("account_list_empty", status.getString("status"))
        assertEquals("ok", status.getString("legacyStatus"))
        assertEquals("legacy-1", getAccount()?.getString("id"))
    }

    @Test
    fun `malformed legacy file reports parse_failed`() {
        legacyAccountsFile.writeText("not json")

        assertEquals("parse_failed", readStatus().getString("legacyStatus"))
        assertNull(getAccount())
    }

    @Test
    fun `empty legacy file and empty legacy array both report empty`() {
        legacyAccountsFile.writeText("")
        assertEquals("empty", readStatus().getString("legacyStatus"))

        legacyAccountsFile.writeText("[]")
        assertEquals("empty", readStatus().getString("legacyStatus"))
    }

    // MARK: - Parity with getAccount

    /** The reviewer's concern: the report must never disagree with what getAccount returned. */
    @Test
    fun `getAccount returns an account exactly when one of the stages reports ok`() {
        val legacyJson = """[{"uuid":"legacy-1","issuer":"https://idsit.gov.bc.ca","clientId":"c"}]"""
        val scenarios: List<Pair<String, () -> Unit>> =
            listOf(
                "nothing stored" to {},
                "native malformed" to { writeNativeAccounts("[{") },
                "native empty" to { writeNativeAccounts("[]") },
                "native valid" to { writeNativeAccounts(validNativeAccountsJson()) },
                "legacy only" to { legacyAccountsFile.writeText(legacyJson) },
                "legacy malformed" to { legacyAccountsFile.writeText("{") },
                "native malformed, legacy valid" to {
                    writeNativeAccounts("[{")
                    legacyAccountsFile.writeText(legacyJson)
                },
            )

        for ((name, arrange) in scenarios) {
            tempFolder.root.listFiles()?.forEach { it.deleteRecursively() }
            arrange()

            val status = readStatus()
            val reportsAccount = status.getString("status") == "ok" || status.getString("legacyStatus") == "ok"
            val hasAccount = getAccount() != null

            assertEquals(
                "$name: status reports account=$reportsAccount but getAccount=$hasAccount",
                reportsAccount,
                hasAccount,
            )
        }
    }
}
