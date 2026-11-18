package com.bcsccore.storage

import android.content.Context
import com.google.gson.Gson
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeFalse
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

/**
 * [NativeCompatibleStorage.readAccountsResult] is the single read behind both [NativeCompatibleStorage.readAccounts]
 * and `getAccountReadStatus`. These tests pin each storage state to its status code, and that the status says
 * "ok" exactly when readAccounts returns accounts.
 *
 * Fixtures are plain-text JSON, which the reader accepts without decryption (Robolectric has no AndroidKeyStore).
 */
@RunWith(RobolectricTestRunner::class)
class NativeCompatibleStorageAccountsReadTest {
    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var storage: NativeCompatibleStorage

    private val issuerName = "sit"

    private val accountsFile: File
        get() = File(tempFolder.root, issuerName + File.separator + "accounts")

    @Before
    fun setUp() {
        val context = mockk<Context>(relaxed = true)
        every { context.filesDir } returns tempFolder.root
        storage = NativeCompatibleStorage(context)
    }

    private fun writeAccountsFile(bytes: ByteArray) {
        accountsFile.parentFile?.mkdirs()
        accountsFile.writeBytes(bytes)
    }

    private fun writeAccountsFile(text: String) = writeAccountsFile(text.toByteArray())

    private fun validAccountsJson(): String =
        Gson().toJson(listOf(NativeAccount(uuid = "uuid-1", issuer = "https://idsit.gov.bc.ca", clientId = "client-1")))

    // MARK: - Status codes

    @Test
    fun `valid accounts file parses and reports ok`() {
        writeAccountsFile(validAccountsJson())

        val result = storage.readAccountsResult(issuerName)

        assertEquals("ok", result.statusCode)
        assertNull(result.detail)
        assertEquals("uuid-1", storage.readAccounts(issuerName)?.single()?.uuid)
    }

    @Test
    fun `missing accounts file reports account_file_missing`() {
        val result = storage.readAccountsResult(issuerName)

        assertEquals(AccountsRead.FileMissing, result)
        assertEquals("account_file_missing", result.statusCode)
        assertNull(result.detail)
    }

    @Test
    fun `directory in place of the accounts file reports account_file_missing`() {
        accountsFile.mkdirs()

        assertEquals("account_file_missing", storage.readAccountsResult(issuerName).statusCode)
    }

    @Test
    fun `unreadable accounts file reports account_file_unreadable with exception class`() {
        writeAccountsFile(validAccountsJson())
        accountsFile.setReadable(false)
        assumeFalse("can't revoke read permission here (running as root?)", accountsFile.canRead())

        val result = storage.readAccountsResult(issuerName)

        assertEquals("account_file_unreadable", result.statusCode)
        assertEquals("FileNotFoundException", result.detail)
    }

    /** Non-zero tag length + IV + body, so AESEncryptor actually attempts (and fails) a decrypt. */
    private val undecryptableBytes = ByteArray(64) { 0x7F }

    @Test
    fun `non-JSON bytes that fail to decrypt report account_decrypt_failed`() {
        writeAccountsFile(undecryptableBytes)

        val result = storage.readAccountsResult(issuerName)

        assertEquals("account_decrypt_failed", result.statusCode)
        assertNotNull(result.detail)
    }

    /**
     * AESEncryptor.decrypt returns "" (no exception) for input no longer than its 16-byte header, so a truncated
     * accounts file reads as an empty list rather than a decrypt failure. Pinned so a change here is deliberate.
     */
    @Test
    fun `truncated ciphertext reports account_list_empty because AESEncryptor returns empty`() {
        writeAccountsFile(byteArrayOf(0x01, 0x02, 0x03, 0x04))

        assertEquals("account_list_empty", storage.readAccountsResult(issuerName).statusCode)
        assertNull(storage.readAccounts(issuerName))
    }

    @Test
    fun `malformed JSON reports account_parse_failed`() {
        writeAccountsFile("[{")

        val result = storage.readAccountsResult(issuerName)

        assertEquals("account_parse_failed", result.statusCode)
        assertNotNull(result.detail)
    }

    @Test
    fun `empty JSON array reports account_list_empty and readAccounts keeps returning an empty list`() {
        writeAccountsFile("[]")

        assertEquals("account_list_empty", storage.readAccountsResult(issuerName).statusCode)
        assertEquals(emptyList<NativeAccount>(), storage.readAccounts(issuerName))
    }

    /** The report goes to remote logs: detail is an exception class name only — no paths, IDs or messages. */
    @Test
    fun `detail is a bare exception class name`() {
        writeAccountsFile("[{")

        val detail = storage.readAccountsResult(issuerName).detail!!

        assertTrue("got $detail", Regex("^[A-Za-z0-9_$]+$").matches(detail))
    }

    // MARK: - Parity with readAccounts

    @Test
    fun `status is ok exactly when readAccounts returns accounts`() {
        val scenarios: List<Pair<String, () -> Unit>> =
            listOf(
                "missing file" to {},
                "empty array" to { writeAccountsFile("[]") },
                "malformed JSON" to { writeAccountsFile("[{") },
                "undecryptable bytes" to { writeAccountsFile(undecryptableBytes) },
                "truncated ciphertext" to { writeAccountsFile(byteArrayOf(0x01, 0x02)) },
                "valid accounts" to { writeAccountsFile(validAccountsJson()) },
            )

        for ((name, arrange) in scenarios) {
            File(tempFolder.root, issuerName).deleteRecursively()
            arrange()

            val isOk = storage.readAccountsResult(issuerName).statusCode == "ok"
            val didRead = !storage.readAccounts(issuerName).isNullOrEmpty()

            assertEquals("$name: status ok=$isOk but readAccounts returned accounts=$didRead", isOk, didRead)
        }
    }
}
