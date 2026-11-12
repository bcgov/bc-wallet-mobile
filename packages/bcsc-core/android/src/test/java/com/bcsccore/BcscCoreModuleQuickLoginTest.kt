package com.bcsccore

import com.bcsccore.keypair.core.exceptions.AlertKey
import com.bcsccore.keypair.core.exceptions.BcscException
import com.bcsccore.keypair.core.interfaces.BcscKeyPairSource
import com.bcsccore.keypair.core.models.BcscKeyPair
import com.bcsccore.keypair.core.models.KeyPairInfo
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.slot
import io.mockk.unmockkStatic
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** Quick login reports key and signing failures at separate sites, matching iOS. */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleQuickLoginTest {
    private lateinit var keyPairSource: BcscKeyPairSource
    private lateinit var promise: Promise
    private lateinit var module: BcscCoreModule

    @Before
    fun setUp() {
        mockkStatic(Arguments::class)
        every { Arguments.createMap() } returns JavaOnlyMap()

        keyPairSource = mockk(relaxed = true)
        every { keyPairSource.getAllBcscKeyPairInfos() } returns listOf(mockk<KeyPairInfo>(), mockk<KeyPairInfo>())
        promise = mockk(relaxed = true)
        module = BcscCoreModule(mockk<ReactApplicationContext>(relaxed = true), keyPairSource)
    }

    @After
    fun tearDown() {
        unmockkStatic(Arguments::class)
    }

    private fun createAndCaptureRejection(
        code: String,
        message: String,
    ): Pair<Throwable, WritableMap> {
        val jwk = JavaOnlyMap.of("kty", "RSA", "n", "AQAB", "e", "AQAB")
        val error = slot<Throwable>()
        val userInfo = slot<WritableMap>()
        module.createQuickLoginJWT(
            "access-token",
            "client",
            "https://idsit.gov.bc.ca/device/",
            "client-ref",
            jwk,
            "fcm",
            null,
            promise,
        )
        verify(exactly = 1) { promise.reject(code, message, capture(error), capture(userInfo)) }
        verify(exactly = 0) { promise.resolve(any()) }
        return error.captured to userInfo.captured
    }

    @Test
    fun `reports a key failure at get_key with its alert key and key count`() {
        val keyError = BcscException(AlertKey.GENERAL, "keystore path /data/secret")
        every { keyPairSource.getCurrentBcscKeyPair() } throws keyError

        val (error, userInfo) =
            createAndCaptureRejection("E_KEYPAIR_RETRIEVAL_FAILED", "Failed to retrieve the signing key pair.")

        assertEquals(keyError, error)
        assertEquals("createQuickLoginJWT.get_key", userInfo.getString("site"))
        assertEquals("GENERAL", userInfo.getString("alertKey"))
        assertEquals(2, userInfo.getInt("keyCount"))
        assertFalse(userInfo.toHashMap().values.any { it.toString().contains("/data/secret") })
        verify(exactly = 0) { keyPairSource.signAndSerializeClaimsSet(any(), any()) }
    }

    @Test
    fun `reports a signing failure at sign, signing with the key loaded at get_key`() {
        val keyPair = mockk<BcscKeyPair>()
        every { keyPairSource.getCurrentBcscKeyPair() } returns keyPair
        every { keyPairSource.signAndSerializeClaimsSet(any(), keyPair) } throws
            BcscException(AlertKey.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET, "signature failed")

        val (_, userInfo) = createAndCaptureRejection("E_JWT_SIGN_FAILED", "Failed to sign or serialize the JWT.")

        assertEquals("createQuickLoginJWT.sign", userInfo.getString("site"))
        assertEquals("ERR_207_UNABLE_TO_SIGN_CLAIMS_SET", userInfo.getString("alertKey"))
        // The key is loaded once, never reloaded by the signer
        verify(exactly = 1) { keyPairSource.getCurrentBcscKeyPair() }
        verify(exactly = 0) { keyPairSource.signAndSerializeClaimsSet(any()) }
    }
}
