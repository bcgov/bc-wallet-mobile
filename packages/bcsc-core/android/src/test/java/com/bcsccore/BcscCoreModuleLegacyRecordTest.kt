package com.bcsccore

import android.content.Context
import android.os.UserManager
import android.security.keystore.UserNotAuthenticatedException
import com.bcsccore.fileport.decryption.BcscFileDecryptor
import com.bcsccore.fileport.decryption.DecryptionException
import com.bcsccore.fileport.encryption.AESEncryptor
import com.bcsccore.keypair.core.interfaces.BcscKeyPairSource
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkConstructor
import io.mockk.mockkStatic
import io.mockk.unmockkConstructor
import io.mockk.unmockkStatic
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.io.File
import javax.crypto.AEADBadTagException

/**
 * readLegacyRecord classifies each record through the same read its getter uses, so each test also checks the
 * getter's output for that state is what it was. Files are plain JSON, which the storage reads without the keystore;
 * a decrypt failure is a non-JSON file with [AESEncryptor.decrypt] made to throw. The tokens file is read through
 * bcsc-file-port, whose decryptor needs the keystore, so tests that need a readable tokens file pass it through.
 *
 * Runs on API 34: the direct-boot check uses UserManager.isUserUnlocked (API 24, the module's minSdk).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class BcscCoreModuleLegacyRecordTest {
    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var module: BcscCoreModule

    private val issuerName = "sit"

    // Must be a valid UUID: with no readable issuer file the storage infers the issuer from UUID-named directories.
    private val accountUuid = "123e4567-e89b-42d3-a456-426614174000"

    private val undecryptable = ByteArray(64) { 0x7F }

    private val reasonFormat = Regex("^[a-z0-9_]+(:[A-Za-z0-9_$]+)?$")

    private val allRecords =
        listOf("account", "tokens", "credential", "authorizationRequest", "accountFlags", "evidence", "savedServices")

    @Before
    fun setUp() {
        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }
        every { Arguments.createArray() } answers { JavaOnlyArray() }

        mockkConstructor(AESEncryptor::class)
        // Like the real AESEncryptor, input no longer than its 16-byte header decrypts to ""
        every { anyConstructed<AESEncryptor>().decrypt(any()) } answers {
            if (firstArg<ByteArray>().size <= 16) "" else throw AEADBadTagException()
        }
        every { anyConstructed<AESEncryptor>().encrypt(any()) } answers { firstArg<String>().toByteArray() }

        val app = RuntimeEnvironment.getApplication()
        val context = mockk<ReactApplicationContext>(relaxed = true)
        every { context.filesDir } returns tempFolder.root
        every { context.packageName } returns "com.bcsccore.test"
        every { context.getSharedPreferences(any(), any()) } answers {
            app.getSharedPreferences(firstArg(), secondArg())
        }
        every { context.getSystemService(Context.USER_SERVICE) } answers { app.getSystemService(Context.USER_SERVICE) }

        module = BcscCoreModule(context, mockk<BcscKeyPairSource>(relaxed = true))
    }

    @After
    fun tearDown() {
        unmockkConstructor(BcscFileDecryptor::class)
        unmockkConstructor(AESEncryptor::class)
        unmockkStatic(Arguments::class)
    }

    // MARK: - Helpers

    private fun file(relative: String): File = File(tempFolder.root, relative).also { it.parentFile?.mkdirs() }

    private fun accountFile(name: String) = file("$issuerName/$accountUuid/$name")

    private fun storeAccount() {
        File(tempFolder.root, "$issuerName/$accountUuid").mkdirs()
        file("$issuerName/accounts").writeText(
            """[{"uuid":"$accountUuid","issuer":"https://idsit.gov.bc.ca/device/","clientId":"client-id","createdAt":1,"accountSecurityType":"DeviceSecurity"}]""",
        )
    }

    /** Makes the bcsc-file-port decryptor return the file bytes as they are. */
    private fun passThroughTokenDecryption() {
        mockkConstructor(BcscFileDecryptor::class)
        every { anyConstructed<BcscFileDecryptor>().decrypt(any()) } answers { String(firstArg<ByteArray>()) }
    }

    private fun resolved(call: (Promise) -> Unit): Any? {
        val promise = mockk<Promise>(relaxed = true)
        val values = mutableListOf<Any?>()
        call(promise)
        verify(exactly = 1) { promise.resolve(captureNullable(values)) }
        verify(exactly = 0) { promise.reject(any<String>(), any<String>()) }
        verify(exactly = 0) { promise.reject(any<String>(), any<String>(), any<Throwable>()) }
        return values.single()
    }

    private fun read(name: String): ReadableMap = resolved { module.readLegacyRecord(name, it) } as ReadableMap

    private fun ReadableMap.status() = getString("status")

    private fun ReadableMap.reason() = if (hasKey("reason")) getString("reason") else null

    private fun assertUnreadable(
        name: String,
        reasonPrefix: String,
    ): String {
        val result = read(name)
        assertEquals("$name status", "unreadable", result.status())
        assertFalse("$name has no value", result.hasKey("value"))
        val reason = result.reason()!!
        assertTrue("$name reason $reason should start with $reasonPrefix", reason.startsWith(reasonPrefix))
        assertTrue("$name reason $reason is a bare code", reasonFormat.matches(reason))
        return reason
    }

    private fun assertStatus(
        name: String,
        status: String,
    ) {
        val result = read(name)
        assertEquals("$name status", status, result.status())
        assertNull("$name reason", result.reason())
    }

    // MARK: - Contract

    @Test
    fun `unknown record name is unreadable with unknown_record`() {
        val result = read("somethingElse")

        assertEquals("unreadable", result.status())
        assertEquals("unknown_record", result.reason())
    }

    @Test
    fun `with nothing stored every record is absent and the getters return their empty values`() {
        allRecords.forEach { assertStatus(it, "absent") }

        assertNull(resolved { module.getAccount(it) })
        assertNull(resolved { module.getCredential(it) })
        assertNull(resolved { module.getAuthorizationRequest(it) })
        assertEquals(0, (resolved { module.getEvidence(it) } as ReadableArray).size())
        assertEquals(0, (resolved { module.getSavedServices(it) } as ReadableArray).size())
        assertFalse((resolved { module.getAccountFlags(it) } as ReadableMap).keySetIterator().hasNextKey())
    }

    @Test
    fun `direct boot reports every record locked`() {
        storeAccount()
        val userManager = RuntimeEnvironment.getApplication().getSystemService(UserManager::class.java)
        shadowOf(userManager).setUserUnlocked(false)

        allRecords.forEach { assertStatus(it, "locked") }
    }

    // MARK: - Account, and records following it

    @Test
    fun `stored account is ok with the getAccount value`() {
        storeAccount()

        val result = read("account")

        assertEquals("ok", result.status())
        val value = result.getMap("value")!!
        assertEquals(accountUuid, value.getString("id"))
        assertEquals((resolved { module.getAccount(it) } as ReadableMap).toHashMap(), value.toHashMap())
    }

    @Test
    fun `undecryptable account makes the account and every record under it unreadable`() {
        File(tempFolder.root, "$issuerName/$accountUuid").mkdirs()
        file("$issuerName/accounts").writeBytes(undecryptable)

        val reason = assertUnreadable("account", "account_decrypt_failed:")
        assertEquals("account_decrypt_failed:AEADBadTagException", reason)
        listOf("tokens", "authorizationRequest", "accountFlags", "evidence", "savedServices", "credential").forEach {
            assertEquals("$it follows the account", reason, assertUnreadable(it, "account_"))
        }

        // getToken still rejects as it always has
        val promise = mockk<Promise>(relaxed = true)
        module.getToken(0.0, promise)
        verify { promise.reject("E_ACCOUNT_NOT_FOUND", "Account not found") }
        assertNull(resolved { module.getAccount(it) })
    }

    @Test
    fun `malformed native account and malformed legacy file report their stage`() {
        File(tempFolder.root, "$issuerName/$accountUuid").mkdirs()
        file("$issuerName/accounts").writeText("[{")
        assertUnreadable("account", "account_parse_failed:")

        File(tempFolder.root, issuerName).deleteRecursively()
        file("accounts").writeText("not json")
        assertEquals("legacy_account_parse_failed", assertUnreadable("account", "legacy_account_parse_failed"))
    }

    @Test
    fun `empty native account list with a valid legacy file is ok`() {
        file("prod/accounts").writeText("[]")
        file("accounts").writeText("""[{"uuid":"legacy-1","issuer":"https://idsit.gov.bc.ca","clientId":"c"}]""")

        val result = read("account")

        assertEquals("ok", result.status())
        assertEquals("legacy-1", result.getMap("value")!!.getString("id"))
    }

    // MARK: - Tokens

    @Test
    fun `missing tokens file is absent and getToken resolves null`() {
        storeAccount()

        assertStatus("tokens", "absent")
        assertNull(resolved { module.getToken(0.0, it) })
    }

    @Test
    fun `tokens file that fails to decrypt is unreadable and getToken resolves null`() {
        storeAccount()
        accountFile("tokens").writeBytes(undecryptable)

        assertUnreadable("tokens", "tokens_decrypt_failed:")
        assertNull(resolved { module.getToken(1.0, it) })
    }

    @Test
    fun `keystore wanting user authentication reports tokens locked`() {
        storeAccount()
        accountFile("tokens").writeBytes(undecryptable)
        mockkConstructor(BcscFileDecryptor::class)
        every { anyConstructed<BcscFileDecryptor>().decrypt(any()) } throws
            DecryptionException("Failed to decrypt content", UserNotAuthenticatedException())

        assertStatus("tokens", "locked")
        assertNull(resolved { module.getToken(0.0, it) })
    }

    @Test
    fun `readable tokens file reports the token strings of each type`() {
        storeAccount()
        passThroughTokenDecryption()
        accountFile("tokens").writeText(
            """
            {
              "issuer": "https://idsit.gov.bc.ca/device/",
              "accessToken": { "id": "a", "type": "ACCESS", "token": "access-token" },
              "refreshToken": { "id": "r", "type": "REFRESH", "token": "refresh-token" },
              "idToken": { "rawToken": "registration-token" }
            }
            """.trimIndent(),
        )

        val result = read("tokens")

        assertEquals("ok", result.status())
        val value = result.getMap("value")!!
        assertEquals(
            mapOf("access" to "access-token", "refresh" to "refresh-token", "registration" to "registration-token"),
            value.toHashMap(),
        )
        assertEquals("access-token", (resolved { module.getToken(0.0, it) } as ReadableMap).getString("token"))
        assertEquals("registration-token", (resolved { module.getToken(2.0, it) } as ReadableMap).getString("token"))
    }

    @Test
    fun `tokens file with no tokens and no v3 providers file is absent`() {
        storeAccount()
        passThroughTokenDecryption()
        accountFile("tokens").writeText("""{"issuer":"https://idsit.gov.bc.ca/device/"}""")

        assertStatus("tokens", "absent")
        assertNull(resolved { module.getToken(2.0, it) })
    }

    @Test
    fun `registration token falls back to the v3 providers file like getToken`() {
        storeAccount()
        passThroughTokenDecryption()
        accountFile("tokens").writeText("""{"issuer":"https://idsit.gov.bc.ca/device/","idToken":{"sub":"x"}}""")
        accountFile("providers").writeText("""{"clientRegistration":{"registration_access_token":"v3-token"}}""")

        val result = read("tokens")

        assertEquals("ok", result.status())
        assertEquals(mapOf("registration" to "v3-token"), result.getMap("value")!!.toHashMap())
    }

    @Test
    fun `with no tokens a v3 providers file that fails to decrypt is unreadable`() {
        storeAccount()
        passThroughTokenDecryption()
        accountFile("tokens").writeText("""{"issuer":"https://idsit.gov.bc.ca/device/"}""")
        accountFile("providers").writeBytes(undecryptable)

        assertEquals("tokens_v3_decrypt_failed:AEADBadTagException", assertUnreadable("tokens", "tokens_v3_"))
        assertNull(resolved { module.getToken(2.0, it) })
    }

    @Test
    fun `malformed tokens content is unreadable and getToken resolves null`() {
        storeAccount()
        passThroughTokenDecryption()

        accountFile("tokens").writeText("{")
        assertEquals("tokens_parse_failed:JSONException", assertUnreadable("tokens", "tokens_parse_failed"))
        assertNull(resolved { module.getToken(0.0, it) })

        accountFile("tokens").writeText("not json")
        assertEquals("tokens_parse_failed", assertUnreadable("tokens", "tokens_parse_failed"))
        assertNull(resolved { module.getToken(0.0, it) })
    }

    /** The getters resolve null or empty for a blank file, so readLegacyRecord reports it absent. */
    @Test
    fun `blank files are absent and their getters resolve empty`() {
        storeAccount()
        passThroughTokenDecryption()
        listOf("tokens", "providers", "authorization_request", "evidence_upload", "clientmetadata").forEach {
            accountFile(it).writeText("  ")
        }

        listOf("tokens", "credential", "authorizationRequest", "evidence", "savedServices").forEach {
            assertStatus(it, "absent")
        }
        assertNull(resolved { module.getToken(2.0, it) })
        assertNull(resolved { module.getCredential(it) })
        assertNull(resolved { module.getAuthorizationRequest(it) })
        assertEquals(0, (resolved { module.getEvidence(it) } as ReadableArray).size())
        assertEquals(0, (resolved { module.getSavedServices(it) } as ReadableArray).size())
    }

    @Test
    fun `account without an id or issuer is ok while the records under it are absent`() {
        listOf(
            """{"issuer":"https://idsit.gov.bc.ca/device/","clientId":"c","accountSecurityType":"DeviceSecurity"}""" to
                "Account ID is null or empty",
            """{"uuid":"$accountUuid","clientId":"c","accountSecurityType":"DeviceSecurity"}""" to
                "Account issuer is null or empty",
        ).forEach { (accountJson, tokenRejection) ->
            File(tempFolder.root, "$issuerName/$accountUuid").mkdirs()
            file("$issuerName/accounts").writeText("[$accountJson]")

            assertStatus("account", "ok")
            listOf("tokens", "credential", "evidence", "savedServices").forEach { assertStatus(it, "absent") }

            // getToken still rejects as it always has
            val promise = mockk<Promise>(relaxed = true)
            module.getToken(0.0, promise)
            verify { promise.reject("E_ACCOUNT_NOT_FOUND", tokenRejection) }
        }
    }

    // MARK: - Credential

    @Test
    fun `registration without a credential is absent and getCredential resolves null`() {
        storeAccount()
        accountFile("providers").writeText("""{"clientRegistration":{"client_id":"c"}}""")

        assertStatus("credential", "absent")
        assertNull(resolved { module.getCredential(it) })
    }

    @Test
    fun `credential in the providers file is ok with the getCredential value`() {
        storeAccount()
        accountFile("providers").writeText("""{"clientRegistration":{"credential":{"bcscEvent":"Approved"}}}""")

        val result = read("credential")

        assertEquals("ok", result.status())
        assertEquals(
            (resolved { module.getCredential(it) } as ReadableMap).toHashMap(),
            result.getMap("value")!!.toHashMap(),
        )
    }

    @Test
    fun `providers file that fails to decrypt makes the credential unreadable`() {
        storeAccount()
        accountFile("providers").writeBytes(undecryptable)

        assertEquals("credential_decrypt_failed:AEADBadTagException", assertUnreadable("credential", "credential_"))
        assertNull(resolved { module.getCredential(it) })
    }

    @Test
    fun `malformed providers JSON is unreadable while getCredential keeps rejecting`() {
        storeAccount()
        accountFile("providers").writeText("{")

        assertEquals("credential_parse_failed:JSONException", assertUnreadable("credential", "credential_parse_failed"))
        val promise = mockk<Promise>(relaxed = true)
        module.getCredential(promise)
        verify { promise.reject("E_GET_CREDENTIAL_ERROR", any<String>(), any<Throwable>()) }
    }

    // MARK: - Authorization request

    @Test
    fun `v4 authorization request is ok`() {
        storeAccount()
        accountFile("authorization_request").writeText(
            """{"deviceCode":"device-1","requestStatus":"REQUESTED","authorizationMethod":"NONE"}""",
        )

        val result = read("authorizationRequest")

        assertEquals("ok", result.status())
        assertEquals("device-1", result.getMap("value")!!.getString("deviceCode"))
    }

    @Test
    fun `undecryptable v4 authorization request with no v3 record is unreadable and the getter resolves null`() {
        storeAccount()
        accountFile("authorization_request").writeBytes(undecryptable)

        assertEquals(
            "authorization_request_decrypt_failed:AEADBadTagException",
            assertUnreadable("authorizationRequest", "authorization_request_"),
        )
        assertNull(resolved { module.getAuthorizationRequest(it) })
    }

    @Test
    fun `undecryptable v4 authorization request falls back to the v3 record like the getter`() {
        storeAccount()
        accountFile("authorization_request").writeBytes(undecryptable)
        accountFile("providers").writeText("""{"clientRegistration":{"authorizationRequest":{"deviceCode":"v3"}}}""")

        val result = read("authorizationRequest")

        assertEquals("ok", result.status())
        assertEquals("v3", result.getMap("value")!!.getString("deviceCode"))
    }

    @Test
    fun `retired v3 authorization request with no v4 file is absent`() {
        storeAccount()
        accountFile("providers").writeText("""{"clientRegistration":{"authorizationRequest":{"deviceCode":"v3"}}}""")
        accountFile("v3_authorization_request_retired").createNewFile()

        assertStatus("authorizationRequest", "absent")
        assertNull(resolved { module.getAuthorizationRequest(it) })
    }

    // MARK: - Account flags

    @Test
    fun `no flags is absent and set flags are ok`() {
        storeAccount()
        assertStatus("accountFlags", "absent")

        RuntimeEnvironment
            .getApplication()
            .getSharedPreferences("com.bcsccore.test.PREFERENCE_FILE_KEY_$accountUuid", Context.MODE_PRIVATE)
            .edit()
            .putBoolean("is_email_verified", true)
            .commit()

        val result = read("accountFlags")
        assertEquals("ok", result.status())
        assertEquals(true, result.getMap("value")!!.getBoolean("isEmailVerified"))
    }

    // MARK: - Evidence

    @Test
    fun `empty evidence is absent and getEvidence resolves an empty array`() {
        storeAccount()
        accountFile("evidence_upload").writeText("{}")

        assertStatus("evidence", "absent")
        assertEquals(0, (resolved { module.getEvidence(it) } as ReadableArray).size())
    }

    @Test
    fun `evidence that fails to decrypt is unreadable and getEvidence resolves an empty array`() {
        storeAccount()
        accountFile("evidence_upload").writeBytes(undecryptable)

        assertEquals("evidence_decrypt_failed:AEADBadTagException", assertUnreadable("evidence", "evidence_"))
        assertEquals(0, (resolved { module.getEvidence(it) } as ReadableArray).size())
    }

    @Test
    fun `stored evidence is ok`() {
        storeAccount()
        accountFile("evidence_upload").writeText("""{"evidence1":{"evidencetype":{"type":"passport"}}}""")

        val result = read("evidence")

        assertEquals("ok", result.status())
        assertEquals(1, result.getArray("value")!!.size())
    }

    // MARK: - Saved services

    @Test
    fun `empty saved services is absent`() {
        storeAccount()
        accountFile("clientmetadata").writeText("[]")

        assertStatus("savedServices", "absent")
        assertEquals(0, (resolved { module.getSavedServices(it) } as ReadableArray).size())
    }

    @Test
    fun `saved services that fail to decrypt or parse are unreadable while the getter resolves empty`() {
        storeAccount()
        accountFile("clientmetadata").writeBytes(undecryptable)
        assertEquals(
            "saved_services_decrypt_failed:AEADBadTagException",
            assertUnreadable("savedServices", "saved_services_"),
        )
        assertEquals(0, (resolved { module.getSavedServices(it) } as ReadableArray).size())

        accountFile("clientmetadata").writeText("[{")
        assertUnreadable("savedServices", "saved_services_parse_failed:")
        assertEquals(0, (resolved { module.getSavedServices(it) } as ReadableArray).size())
    }

    @Test
    fun `stored saved services are ok`() {
        storeAccount()
        accountFile("clientmetadata").writeText("""[{"client_ref_id":"ref-1","client_name":"Service"}]""")

        val result = read("savedServices")

        assertEquals("ok", result.status())
        assertEquals("ref-1", result.getArray("value")!!.getMap(0)!!.getString("clientRefId"))
    }
}
