package com.bcsccore

import com.bcsccore.keypair.core.exceptions.AlertKey
import com.bcsccore.keypair.core.exceptions.BcscException
import com.bcsccore.keypair.core.interfaces.BcscKeyPairSource
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

/**
 * A pairing code that can't be signed must say which stage failed and why, with status codes only:
 * the report must tell a missing or broken key apart from a failed signature, without leaking dev messages.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleSignPairingCodeTest {
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

    private fun signAndCaptureRejection(): Pair<Throwable, WritableMap> {
        val error = slot<Throwable>()
        val userInfo = slot<WritableMap>()
        module.signPairingCode("ABC123", "https://idsit.gov.bc.ca/device/", "client", "fcm", null, "push", promise)
        verify(exactly = 1) {
            promise.reject("E_JWT_SIGN_FAILED", "Failed to sign the pairing code.", capture(error), capture(userInfo))
        }
        verify(exactly = 0) { promise.resolve(any()) }
        return error.captured to userInfo.captured
    }

    @Test
    fun `reports a key failure at get_key with its alert key and key count`() {
        val keyError = BcscException(AlertKey.GENERAL, "keystore path /data/secret")
        every { keyPairSource.getCurrentBcscKeyPair() } throws keyError

        val (error, userInfo) = signAndCaptureRejection()

        assertEquals(keyError, error)
        assertEquals("signPairingCode.get_key", userInfo.getString("site"))
        assertEquals("BcscException", userInfo.getString("detail"))
        assertEquals("GENERAL", userInfo.getString("alertKey"))
        assertEquals(2, userInfo.getInt("keyCount"))
        assertFalse(userInfo.toHashMap().values.any { it.toString().contains("/data/secret") })
    }

    @Test
    fun `reports a signing failure at sign`() {
        every { keyPairSource.signAndSerializeClaimsSet(any()) } throws
            BcscException(AlertKey.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET, "signature failed")

        val (_, userInfo) = signAndCaptureRejection()

        assertEquals("signPairingCode.sign", userInfo.getString("site"))
        assertEquals("ERR_207_UNABLE_TO_SIGN_CLAIMS_SET", userInfo.getString("alertKey"))
    }

    @Test
    fun `still rejects with the real failure when the key count can't be read`() {
        every { keyPairSource.getCurrentBcscKeyPair() } throws BcscException(AlertKey.GENERAL)
        every { keyPairSource.getAllBcscKeyPairInfos() } throws BcscException(AlertKey.GENERAL)

        val (_, userInfo) = signAndCaptureRejection()

        assertEquals("signPairingCode.get_key", userInfo.getString("site"))
        assertEquals("unavailable", userInfo.getString("keyCount"))
    }
}
