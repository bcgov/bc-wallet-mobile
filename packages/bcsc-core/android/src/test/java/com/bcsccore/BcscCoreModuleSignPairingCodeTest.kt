package com.bcsccore

import com.bcsccore.keypair.core.interfaces.BcscKeyPairSource
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.nimbusds.jwt.JWTClaimsSet
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Covers the `challenge_source` claim of the login assertion (issue #4757): the caller's value is
 * signed as-is, and anything outside the IAS-supported set is rejected before signing.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleSignPairingCodeTest {
    private lateinit var keyPairSource: BcscKeyPairSource
    private lateinit var promise: Promise
    private lateinit var module: BcscCoreModule

    @Before
    fun setUp() {
        keyPairSource = mockk(relaxed = true)
        promise = mockk(relaxed = true)
        module = BcscCoreModule(mockk<ReactApplicationContext>(relaxed = true), keyPairSource)
    }

    @Test
    fun `signs the challenge source it was given`() {
        val claimsSlot = slot<JWTClaimsSet>()
        every { keyPairSource.signAndSerializeClaimsSet(capture(claimsSlot)) } returns "signed"

        module.signPairingCode("ABC123", "issuer", "client", "fcm-token", null, "push_notification", promise)

        assertEquals("push_notification", claimsSlot.captured.getStringClaim("challenge_source"))
        assertEquals("ABC123", claimsSlot.captured.getStringClaim("challenge"))
        verify { promise.resolve("signed") }
    }

    @Test
    fun `accepts every IAS challenge source`() {
        val claimsSlot = slot<JWTClaimsSet>()
        every { keyPairSource.signAndSerializeClaimsSet(capture(claimsSlot)) } returns "signed"

        listOf("local_app_switch", "push_notification", "remote_pairing_code", "remote_pairing_qr_code").forEach {
            module.signPairingCode("ABC123", "issuer", "client", "fcm-token", null, it, promise)
            assertEquals(it, claimsSlot.captured.getStringClaim("challenge_source"))
        }
    }

    @Test
    fun `rejects an unsupported challenge source without signing`() {
        module.signPairingCode("ABC123", "issuer", "client", "fcm-token", null, "mobile_app_initiated", promise)

        verify { promise.reject("E_INVALID_PARAMETERS", any<String>()) }
        verify(exactly = 0) { keyPairSource.signAndSerializeClaimsSet(any()) }
    }
}
