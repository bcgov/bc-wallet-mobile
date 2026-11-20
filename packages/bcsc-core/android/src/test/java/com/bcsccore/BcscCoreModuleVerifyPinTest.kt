package com.bcsccore

import com.bcsccore.authentication.PinService
import com.bcsccore.fileport.encryption.AESEncryptor
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
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

/**
 * verifyPIN only checks the PIN for the account it is given: wrong attempts are counted, and lockouts enforced,
 * in TypeScript (#4423), and the account record is neither read nor written. The PIN check needs the Android
 * keystore, so it is stood in for.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleVerifyPinTest {
    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var module: BcscCoreModule
    private lateinit var promise: Promise

    private val issuerName = "sit"
    private val issuer = "https://idsit.gov.bc.ca/device/"
    private val accountUuid = "123e4567-e89b-42d3-a456-426614174000"

    @Before
    fun setUp() {
        val context = mockk<ReactApplicationContext>(relaxed = true)
        every { context.filesDir } returns tempFolder.root

        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }

        mockkConstructor(PinService::class)
        every { anyConstructed<PinService>().validatePINReturningHash(any(), any(), any()) } returns Pair(false, null)

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

    private fun accountJson() =
        """[{"uuid":"$accountUuid","issuer":"$issuer","clientId":"client-id","createdAt":1,"penalty":{"penaltyAttempts":0,"penaltyEndTime":0},"accountSecurityType":"PinNoDeviceAuth"}]"""

    private fun nativeAccountsFile() = File(tempFolder.root, "$issuerName/accounts")

    private fun correctPin(hash: String = "wallet-key-hash") {
        every { anyConstructed<PinService>().validatePINReturningHash(accountUuid, issuer, "123456") } returns
            Pair(true, hash)
    }

    private fun resolvedResult(): Map<String, Any?> {
        val result = slot<Any>()
        verify(exactly = 1) { promise.resolve(capture(result)) }
        return (result.captured as JavaOnlyMap).toHashMap()
    }

    @Test
    fun `verifyPIN resolves success and the wallet key for a correct PIN with no accounts file`() {
        correctPin()

        module.verifyPIN(accountUuid, issuer, "123456", promise)

        assertEquals(mapOf("success" to true, "walletKey" to "wallet-key-hash"), resolvedResult())
        assertFalse(nativeAccountsFile().exists())
    }

    @Test
    fun `verifyPIN resolves only success false for a wrong PIN`() {
        module.verifyPIN(accountUuid, issuer, "000000", promise)

        assertEquals(mapOf<String, Any?>("success" to false), resolvedResult())
        verify(exactly = 1) { anyConstructed<PinService>().validatePINReturningHash(accountUuid, issuer, "000000") }
    }

    @Test
    fun `verifyPIN keeps checking wrong PINs and never writes the stored account`() {
        File(tempFolder.root, "$issuerName/$accountUuid").mkdirs()
        nativeAccountsFile().writeText(accountJson())
        val storedBefore = nativeAccountsFile().readText()

        repeat(8) { module.verifyPIN(accountUuid, issuer, "000000", promise) }

        verify(exactly = 8) { anyConstructed<PinService>().validatePINReturningHash(accountUuid, issuer, "000000") }
        verify(exactly = 8) { promise.resolve(any()) }
        assertEquals(storedBefore, nativeAccountsFile().readText())
    }

    @Test
    fun `verifyPIN no longer copies a legacy account into native storage`() {
        File(tempFolder.root, "accounts").writeText(accountJson())
        correctPin()

        module.verifyPIN(accountUuid, issuer, "123456", promise)

        assertEquals(mapOf("success" to true, "walletKey" to "wallet-key-hash"), resolvedResult())
        assertFalse(File(tempFolder.root, "prod/accounts").exists())
    }

    @Test
    fun `verifyPIN rejects E_INVALID_PARAMETERS without checking the PIN when accountId or issuer is empty`() {
        listOf("" to issuer, accountUuid to "", " " to issuer).forEach { (accountId, accountIssuer) ->
            val rejected = mockk<Promise>(relaxed = true)

            module.verifyPIN(accountId, accountIssuer, "123456", rejected)

            verify(exactly = 1) { rejected.reject("E_INVALID_PARAMETERS", "accountId and issuer are required") }
            verify(exactly = 0) { rejected.resolve(any()) }
        }
        verify(exactly = 0) { anyConstructed<PinService>().validatePINReturningHash(any(), any(), any()) }
    }
}
