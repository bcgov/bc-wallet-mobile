package com.bcsccore

import com.bcsccore.authentication.PinService
import com.bcsccore.fileport.encryption.AESEncryptor
import com.bcsccore.storage.NativeCompatibleStorage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
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
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

/**
 * verifyPIN only checks the PIN: wrong attempts are counted, and lockouts enforced, in TypeScript
 * (#4423). The PIN check and the file encryption need the Android keystore, so both are stood in
 * for; the storage files are plain JSON, which the storage reads without the keystore.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleVerifyPinTest {
    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var context: ReactApplicationContext
    private lateinit var module: BcscCoreModule
    private lateinit var promise: Promise

    private val issuerName = "sit"

    // Must be a valid UUID: with no readable issuer file the storage infers the issuer from UUID-named directories.
    private val accountUuid = "123e4567-e89b-42d3-a456-426614174000"

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        every { context.filesDir } returns tempFolder.root

        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }

        mockkConstructor(PinService::class)
        every { anyConstructed<PinService>().validatePINReturningHash(any(), any()) } returns Pair(false, null)

        // Writes the JSON as it is, so a test can see whether the module wrote an accounts file
        mockkConstructor(AESEncryptor::class)
        every { anyConstructed<AESEncryptor>().encrypt(any()) } answers { firstArg<String>().toByteArray() }

        promise = mockk(relaxed = true)
        module = BcscCoreModule(context)
    }

    @After
    fun tearDown() {
        unmockkConstructor(AESEncryptor::class)
        unmockkConstructor(PinService::class)
        unmockkStatic(Arguments::class)
    }

    private fun accountJson(penalty: String = """{"penaltyAttempts":0,"penaltyEndTime":0}""") =
        """[{"uuid":"$accountUuid","issuer":"https://idsit.gov.bc.ca/device/","clientId":"client-id","createdAt":1,"penalty":$penalty,"accountSecurityType":"PinNoDeviceAuth"}]"""

    private fun nativeAccountsFile() = File(tempFolder.root, "$issuerName/accounts")

    private fun storeNativeAccount(penalty: String = """{"penaltyAttempts":0,"penaltyEndTime":0}""") {
        File(tempFolder.root, "$issuerName/$accountUuid").mkdirs()
        nativeAccountsFile().writeText(accountJson(penalty))
    }

    private fun correctPin(hash: String = "wallet-key-hash") {
        every { anyConstructed<PinService>().validatePINReturningHash(accountUuid, "123456") } returns Pair(true, hash)
    }

    private fun resolvedResult(): Map<String, Any?> {
        val result = slot<Any>()
        verify(exactly = 1) { promise.resolve(capture(result)) }
        return (result.captured as JavaOnlyMap).toHashMap()
    }

    @Test
    fun `verifyPIN resolves success and the wallet key for a correct PIN, with no lockout fields`() {
        storeNativeAccount()
        correctPin()

        module.verifyPIN("123456", promise)

        assertEquals(mapOf("success" to true, "walletKey" to "wallet-key-hash"), resolvedResult())
    }

    @Test
    fun `verifyPIN resolves only success false for a wrong PIN`() {
        storeNativeAccount()

        module.verifyPIN("000000", promise)

        assertEquals(mapOf<String, Any?>("success" to false), resolvedResult())
        verify(exactly = 1) { anyConstructed<PinService>().validatePINReturningHash(accountUuid, "000000") }
    }

    @Test
    fun `verifyPIN checks the PIN even when the stored account still carries an unexpired penalty`() {
        val farFuture = System.currentTimeMillis() + 24 * 60 * 60 * 1000L
        storeNativeAccount("""{"penaltyAttempts":9,"penaltyEndTime":$farFuture}""")
        correctPin()

        module.verifyPIN("123456", promise)

        assertEquals(mapOf("success" to true, "walletKey" to "wallet-key-hash"), resolvedResult())
        verify(exactly = 1) { anyConstructed<PinService>().validatePINReturningHash(accountUuid, "123456") }
    }

    @Test
    fun `verifyPIN keeps checking wrong PINs and never records them in the stored account`() {
        storeNativeAccount()
        val storedBefore = nativeAccountsFile().readText()

        repeat(8) { module.verifyPIN("000000", promise) }

        verify(exactly = 8) { anyConstructed<PinService>().validatePINReturningHash(accountUuid, "000000") }
        verify(exactly = 8) { promise.resolve(any()) }
        assertEquals(storedBefore, nativeAccountsFile().readText())
    }

    @Test
    fun `verifyPIN copies an account from the legacy file into native storage before it checks the PIN`() {
        File(tempFolder.root, "accounts").writeText(accountJson())
        // With no issuer file and no account directories the storage falls back to the default issuer
        val defaultIssuerAccounts = File(tempFolder.root, "prod/accounts")
        var copiedWhenChecked = false
        every { anyConstructed<PinService>().validatePINReturningHash(accountUuid, "123456") } answers {
            copiedWhenChecked =
                NativeCompatibleStorage(context).readAccounts("prod")?.firstOrNull()?.uuid == accountUuid
            Pair(true, "wallet-key-hash")
        }
        assertFalse(defaultIssuerAccounts.exists())

        module.verifyPIN("123456", promise)

        assertTrue("the account must be in native storage when the PIN is checked", copiedWhenChecked)
        assertEquals(mapOf("success" to true, "walletKey" to "wallet-key-hash"), resolvedResult())
    }

    @Test
    fun `verifyPIN rejects without checking the PIN when the legacy account cannot be copied`() {
        File(tempFolder.root, "accounts").writeText(accountJson())
        every { anyConstructed<AESEncryptor>().encrypt(any()) } throws IllegalStateException("keystore unavailable")

        module.verifyPIN("123456", promise)

        verify(exactly = 1) {
            promise.reject("E_STORAGE_ERROR", "Failed to copy the legacy account to native storage")
        }
        verify(exactly = 0) { promise.resolve(any()) }
        verify(exactly = 0) { anyConstructed<PinService>().validatePINReturningHash(any(), any()) }
    }

    @Test
    fun `verifyPIN rejects with E_ACCOUNT_NOT_FOUND when no account exists`() {
        module.verifyPIN("123456", promise)

        verify(exactly = 1) { promise.reject("E_ACCOUNT_NOT_FOUND", "No account found") }
        verify(exactly = 0) { promise.resolve(any()) }
        verify(exactly = 0) { anyConstructed<PinService>().validatePINReturningHash(any(), any()) }
    }
}
