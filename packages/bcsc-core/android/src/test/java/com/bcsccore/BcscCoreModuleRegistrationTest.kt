package com.bcsccore

import com.bcsccore.fileport.encryption.AESEncryptor
import com.bcsccore.storage.NativeAccount
import com.bcsccore.storage.NativeAccountSecurityType
import com.bcsccore.storage.NativeCompatibleStorage
import com.bcsccore.storage.NativeTokens
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkConstructor
import io.mockk.mockkStatic
import io.mockk.slot
import io.mockk.unmockkConstructor
import io.mockk.unmockkStatic
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

/**
 * The device registration has one writer (#4925): setRegistration saves the client ID, issuer and
 * registration access token together, clearRegistration removes the client ID and the token, and
 * setAccount can no longer change the client ID.
 *
 * File encryption needs the Android keystore, so it is stood in for and writes the JSON as it is;
 * the storage reads plain JSON without the keystore.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleRegistrationTest {
    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var context: ReactApplicationContext
    private lateinit var module: BcscCoreModule
    private lateinit var storage: NativeCompatibleStorage
    private lateinit var promise: Promise

    private val issuerName = "sit"
    private val issuer = "https://idsit.gov.bc.ca/device/"

    // Must be a valid UUID: with no readable issuer file the storage infers the issuer from UUID-named directories.
    private val accountUuid = "123e4567-e89b-42d3-a456-426614174000"

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        every { context.filesDir } returns tempFolder.root

        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }

        mockkConstructor(AESEncryptor::class)
        writesSucceed()

        promise = mockk(relaxed = true)
        module = BcscCoreModule(context)
        storage = NativeCompatibleStorage(context)
    }

    @After
    fun tearDown() {
        unmockkConstructor(AESEncryptor::class)
        unmockkStatic(Arguments::class)
    }

    // MARK: - Fixtures

    private fun writesSucceed() {
        every { anyConstructed<AESEncryptor>().encrypt(any()) } answers { firstArg<String>().toByteArray() }
    }

    /** The accounts file holds a JSON list and the tokens file a JSON object, which tells the two writes apart. */
    private fun accountWritesFail() {
        every { anyConstructed<AESEncryptor>().encrypt(any()) } answers {
            val content = firstArg<String>()
            if (content.startsWith("[")) throw IllegalStateException("keystore unavailable")
            content.toByteArray()
        }
    }

    private fun tokenWritesFail() {
        every { anyConstructed<AESEncryptor>().encrypt(any()) } answers {
            val content = firstArg<String>()
            if (content.startsWith("{")) throw IllegalStateException("keystore unavailable")
            content.toByteArray()
        }
    }

    private fun accountsFile() = File(tempFolder.root, "$issuerName/accounts")

    private fun tokensFile() = File(tempFolder.root, "$issuerName/$accountUuid/tokens")

    private fun storeAccount(
        clientId: String? = "client-old",
        nickName: String? = "My phone",
    ) {
        val clientIdField = clientId?.let { """"clientId":"$it",""" } ?: ""
        val nickNameField = nickName?.let { """"nickName":"$it",""" } ?: ""
        File(tempFolder.root, "$issuerName/$accountUuid").mkdirs()
        accountsFile().writeText(
            """[{"uuid":"$accountUuid",$nickNameField"issuer":"$issuer",$clientIdField"createdAt":1700000000000,"penalty":{"penaltyAttempts":0,"penaltyEndTime":0},"accountSecurityType":"PinWithDeviceAuth"}]""",
        )
    }

    private fun storeTokens(
        registrationToken: String? = "token-old",
        withRefreshToken: Boolean = true,
    ) {
        val idToken = registrationToken?.let { """"idToken":{"rawToken":"$it"},""" } ?: ""
        val refreshToken =
            if (withRefreshToken) """"refreshToken":{"id":"r1","type":"REFRESH","token":"refresh-token"},""" else ""
        File(tempFolder.root, "$issuerName/$accountUuid").mkdirs()
        tokensFile().writeText("""{"issuer":"$issuer",$idToken$refreshToken"fetchedAt":1}""")
    }

    private fun storedAccount(): NativeAccount? = storage.readAccounts(issuerName)?.firstOrNull()

    private fun storedTokens(): NativeTokens? = storage.readTokens(issuerName, accountUuid)

    /** The rejections here carry no exception: a failed write is reported by the storage as false. */
    private fun rejectionUserInfo(code: String): WritableMap {
        val userInfo = slot<WritableMap>()
        verify(exactly = 1) { promise.reject(code, any<String>(), isNull<Throwable>(), capture(userInfo)) }
        verify(exactly = 0) { promise.resolve(any()) }
        return userInfo.captured
    }

    private fun resolvedAccount(): Map<String, Any?> {
        val result = slot<Any>()
        module.getAccount(promise)
        verify(exactly = 1) { promise.resolve(capture(result)) }
        return (result.captured as JavaOnlyMap).toHashMap()
    }

    // MARK: - setRegistration

    @Test
    fun `setRegistration saves the client ID, issuer and token for an account with no registration`() {
        storeAccount(clientId = "")

        module.setRegistration("client-new", issuer, "token-new", promise)

        verify(exactly = 1) { promise.resolve(null) }
        assertEquals("client-new", storedAccount()?.clientId)
        assertEquals(issuer, storedAccount()?.issuer)
        assertEquals("token-new", storedTokens()?.idToken?.rawToken)
    }

    @Test
    fun `setRegistration keeps the rest of the account and the other tokens`() {
        storeAccount()
        storeTokens()

        module.setRegistration("client-new", issuer, "token-new", promise)

        val account = storedAccount()
        assertEquals(accountUuid, account?.uuid)
        assertEquals("My phone", account?.nickName)
        assertEquals(1700000000000L, account?.createdAt)
        assertEquals(NativeAccountSecurityType.PinWithDeviceAuth, account?.accountSecurityType)
        assertEquals("refresh-token", storedTokens()?.refreshToken?.token)
        assertEquals("token-new", storedTokens()?.idToken?.rawToken)
    }

    @Test
    fun `setRegistration with the same client ID writes the tokens file only`() {
        storeAccount(clientId = "client-a")
        storeTokens()

        module.setRegistration("client-a", issuer, "token-rotated", promise)

        verify(exactly = 1) { promise.resolve(null) }
        assertEquals("token-rotated", storedTokens()?.idToken?.rawToken)
        // One encrypted write, and it was not the accounts list
        verify(exactly = 1) { anyConstructed<AESEncryptor>().encrypt(any()) }
        verify(exactly = 0) { anyConstructed<AESEncryptor>().encrypt(match { it.startsWith("[") }) }
    }

    @Test
    fun `setRegistration with a null token saves the client ID and leaves the tokens file alone`() {
        storeAccount(clientId = "")
        storeTokens(registrationToken = "token-kept")
        val tokensBefore = tokensFile().readText()

        module.setRegistration("client-new", issuer, null, promise)

        verify(exactly = 1) { promise.resolve(null) }
        assertEquals("client-new", storedAccount()?.clientId)
        assertEquals(tokensBefore, tokensFile().readText())
    }

    @Test
    fun `setRegistration fills in an account whose file has no client ID at all`() {
        storeAccount(clientId = null)

        module.setRegistration("client-new", issuer, "token-new", promise)

        verify(exactly = 1) { promise.resolve(null) }
        assertEquals("client-new", storedAccount()?.clientId)
    }

    @Test
    fun `setRegistration copies an account from the legacy file into native storage`() {
        File(tempFolder.root, "accounts").writeText(
            """[{"uuid":"$accountUuid","issuer":"$issuer","clientId":"client-a","accountSecurityType":"PinNoDeviceAuth"}]""",
        )
        // With no issuer file and no account directories the storage falls back to the default issuer
        val defaultIssuerName = "prod"

        module.setRegistration("client-a", issuer, "token-new", promise)

        verify(exactly = 1) { promise.resolve(null) }
        val copied = storage.readAccounts(defaultIssuerName)?.firstOrNull()
        assertEquals(accountUuid, copied?.uuid)
        assertEquals("client-a", copied?.clientId)
        assertEquals("token-new", storage.readTokens(defaultIssuerName, accountUuid)?.idToken?.rawToken)
    }

    @Test
    fun `setRegistration rejects with E_ACCOUNT_NOT_FOUND and writes nothing when no account exists`() {
        module.setRegistration("client-new", issuer, "token-new", promise)

        val userInfo = rejectionUserInfo("E_ACCOUNT_NOT_FOUND")
        assertEquals("setRegistration.read_account", userInfo.getString("site"))
        verify(exactly = 0) { anyConstructed<AESEncryptor>().encrypt(any()) }
    }

    @Test
    fun `setRegistration rejects an empty client ID, issuer or token`() {
        storeAccount()
        storeTokens()

        module.setRegistration("", issuer, "token-new", promise)
        module.setRegistration("client-new", "", "token-new", promise)
        module.setRegistration("client-new", issuer, "", promise)

        val userInfo = mutableListOf<WritableMap>()
        verify(exactly = 3) {
            promise.reject("E_INVALID_PARAMETERS", any<String>(), isNull<Throwable>(), capture(userInfo))
        }
        assertTrue(userInfo.all { it.getString("site") == "setRegistration.validate" })
        verify(exactly = 0) { promise.resolve(any()) }
        verify(exactly = 0) { anyConstructed<AESEncryptor>().encrypt(any()) }
        assertEquals("client-old", storedAccount()?.clientId)
    }

    @Test
    fun `a failed token save leaves the previous registration in place`() {
        storeAccount()
        storeTokens()
        tokenWritesFail()

        module.setRegistration("client-new", issuer, "token-new", promise)

        val userInfo = rejectionUserInfo("E_TOKEN_SAVE_FAILED")
        assertEquals("setRegistration.save_token", userInfo.getString("site"))
        assertEquals("client-old", storedAccount()?.clientId)
        assertEquals("token-old", storedTokens()?.idToken?.rawToken)
    }

    @Test
    fun `a failed account save puts the previous token back`() {
        storeAccount()
        storeTokens()
        accountWritesFail()

        module.setRegistration("client-new", issuer, "token-new", promise)

        val userInfo = rejectionUserInfo("E_SAVE_ACCOUNT_FAILED")
        assertEquals("setRegistration.save_account", userInfo.getString("site"))
        assertTrue(userInfo.getBoolean("tokenRolledBack"))
        assertEquals("client-old", storedAccount()?.clientId)
        assertEquals("token-old", storedTokens()?.idToken?.rawToken)
        assertEquals("refresh-token", storedTokens()?.refreshToken?.token)
    }

    @Test
    fun `a failed account save removes a tokens file that did not exist before`() {
        storeAccount(clientId = "")
        accountWritesFail()

        module.setRegistration("client-new", issuer, "token-new", promise)

        val userInfo = rejectionUserInfo("E_SAVE_ACCOUNT_FAILED")
        assertTrue(userInfo.getBoolean("tokenRolledBack"))
        assertFalse(tokensFile().exists())
        assertEquals("", storedAccount()?.clientId)
    }

    @Test
    fun `rejections never carry the client ID or the token`() {
        storeAccount()
        storeTokens()
        accountWritesFail()

        module.setRegistration("client-new", issuer, "token-new", promise)

        val message = slot<String>()
        val userInfo = slot<WritableMap>()
        verify { promise.reject(any<String>(), capture(message), isNull<Throwable>(), capture(userInfo)) }
        val reported =
            message.captured +
                userInfo.captured
                    .toHashMap()
                    .values
                    .joinToString()
        assertFalse(reported.contains("client-new"))
        assertFalse(reported.contains("token-new"))
        assertFalse(reported.contains("client-old"))
    }

    // MARK: - clearRegistration

    @Test
    fun `clearRegistration removes the client ID and the registration token, and keeps everything else`() {
        storeAccount(clientId = "client-a")
        storeTokens()

        module.clearRegistration(promise)

        verify(exactly = 1) { promise.resolve(null) }
        val account = storedAccount()
        assertEquals("", account?.clientId)
        assertEquals(issuer, account?.issuer)
        assertEquals("My phone", account?.nickName)
        assertEquals(NativeAccountSecurityType.PinWithDeviceAuth, account?.accountSecurityType)
        assertNull(storedTokens()?.idToken)
        assertEquals("refresh-token", storedTokens()?.refreshToken?.token)
    }

    @Test
    fun `clearRegistration deletes the tokens file when the registration token was the only token`() {
        storeAccount(clientId = "client-a")
        storeTokens(withRefreshToken = false)

        module.clearRegistration(promise)

        verify(exactly = 1) { promise.resolve(null) }
        assertFalse(tokensFile().exists())
    }

    @Test
    fun `clearRegistration retires the v3 registration token so it cannot come back`() {
        storeAccount(clientId = "client-a")
        File(tempFolder.root, "$issuerName/$accountUuid/providers").writeText(
            """{"issuer":"$issuer","clientRegistration":{"client_id":"v3-client","registration_access_token":"v3-token"}}""",
        )
        assertEquals("v3-token", storage.readRegistrationTokenFromV3Provider(issuerName, accountUuid))

        module.clearRegistration(promise)

        verify(exactly = 1) { promise.resolve(null) }
        assertNull(storage.readRegistrationTokenFromV3Provider(issuerName, accountUuid))
    }

    @Test
    fun `clearRegistration resolves and writes nothing when no account exists`() {
        module.clearRegistration(promise)

        verify(exactly = 1) { promise.resolve(null) }
        verify(exactly = 0) { anyConstructed<AESEncryptor>().encrypt(any()) }
    }

    @Test
    fun `clearRegistration does not rewrite an account that has no registration`() {
        storeAccount(clientId = "")

        module.clearRegistration(promise)

        verify(exactly = 1) { promise.resolve(null) }
        verify(exactly = 0) { anyConstructed<AESEncryptor>().encrypt(any()) }
    }

    @Test
    fun `a failed account save keeps the registration`() {
        storeAccount(clientId = "client-a")
        storeTokens()
        accountWritesFail()

        module.clearRegistration(promise)

        val userInfo = rejectionUserInfo("E_SAVE_ACCOUNT_FAILED")
        assertEquals("clearRegistration.save_account", userInfo.getString("site"))
        assertEquals("client-a", storedAccount()?.clientId)
        assertEquals("token-old", storedTokens()?.idToken?.rawToken)
    }

    @Test
    fun `a failed token delete puts the client ID back`() {
        storeAccount(clientId = "client-a")
        storeTokens()
        tokenWritesFail()

        module.clearRegistration(promise)

        val userInfo = rejectionUserInfo("E_TOKEN_DELETE_ERROR")
        assertEquals("clearRegistration.delete_token", userInfo.getString("site"))
        assertTrue(userInfo.getBoolean("accountRolledBack"))
        assertEquals("client-a", storedAccount()?.clientId)
        assertEquals("token-old", storedTokens()?.idToken?.rawToken)
    }

    // MARK: - getAccount

    @Test
    fun `getAccount leaves the client ID out for an account with no registration`() {
        storeAccount(clientId = "")

        val account = resolvedAccount()

        assertFalse(account.containsKey("clientID"))
        assertEquals(accountUuid, account["id"])
    }

    @Test
    fun `getAccount leaves the client ID out when the file has none at all`() {
        storeAccount(clientId = null)

        assertFalse(resolvedAccount().containsKey("clientID"))
    }

    @Test
    fun `getAccount returns the client ID of a registered account`() {
        storeAccount(clientId = "client-a")

        assertEquals("client-a", resolvedAccount()["clientID"])
    }

    // MARK: - setAccount

    @Test
    fun `setAccount creates an account with no client ID`() {
        // The issuer file names the environment once the account is saved
        module.setAccount(JavaOnlyMap.of("issuer", issuer, "securityMethod", "app_pin_no_device_authn"), promise)

        verify(exactly = 1) { promise.resolve(null) }
        val account = storedAccount()
        assertNotNull(account)
        assertEquals("", account?.clientId)
        assertEquals(NativeAccountSecurityType.PinNoDeviceAuth, account?.accountSecurityType)
    }

    @Test
    fun `setAccount keeps the client ID of an existing account, even when one is passed`() {
        storeAccount(clientId = "client-a")

        module.setAccount(
            JavaOnlyMap.of(
                "issuer",
                issuer,
                "securityMethod",
                "device_authentication",
                "clientID",
                "client-other",
                "nickname",
                "New name",
            ),
            promise,
        )

        verify(exactly = 1) { promise.resolve(null) }
        val account = storedAccount()
        assertEquals("client-a", account?.clientId)
        assertEquals(accountUuid, account?.uuid)
        assertEquals(1700000000000L, account?.createdAt)
        assertEquals("New name", account?.nickName)
        assertEquals(NativeAccountSecurityType.DeviceSecurity, account?.accountSecurityType)
    }

    @Test
    fun `setAccount keeps the nickname when none is passed`() {
        storeAccount(clientId = "client-a")

        module.setAccount(JavaOnlyMap.of("issuer", issuer, "securityMethod", "device_authentication"), promise)

        verify(exactly = 1) { promise.resolve(null) }
        assertEquals("My phone", storedAccount()?.nickName)
    }

    @Test
    fun `setAccount rejects a security method it does not know instead of defaulting one`() {
        storeAccount(clientId = "client-a")

        module.setAccount(JavaOnlyMap.of("issuer", issuer, "securityMethod", "face_scan"), promise)

        val userInfo = rejectionUserInfo("E_INVALID_PARAMETERS")
        assertEquals("setAccount.validate", userInfo.getString("site"))
        assertEquals(NativeAccountSecurityType.PinWithDeviceAuth, storedAccount()?.accountSecurityType)
    }

    @Test
    fun `setAccount reports a failed save at save_account`() {
        accountWritesFail()

        module.setAccount(JavaOnlyMap.of("issuer", issuer, "securityMethod", "device_authentication"), promise)

        val userInfo = rejectionUserInfo("E_STORAGE_ERROR")
        assertEquals("setAccount.save_account", userInfo.getString("site"))
    }
}
