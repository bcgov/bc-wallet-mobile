package com.bcsccore

import com.bcsccore.keypair.core.interfaces.BcscKeyPairSource
import com.bcsccore.keypair.core.models.BcscKeyPair
import com.bcsccore.keypair.core.models.KeyPairInfo
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.nimbusds.jose.EncryptionMethod
import com.nimbusds.jose.JWEAlgorithm
import com.nimbusds.jose.JWEHeader
import com.nimbusds.jose.JWEObject
import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.Payload
import com.nimbusds.jose.crypto.RSAEncrypter
import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Fixes #4595. Drives the real [BcscCoreModule.decodePayload] with real RSA key pairs and a
 * real Nimbus JWE/JWS, through the `internal` test constructor override, to prove the kid on
 * the incoming response — not just "newest local key" — selects the decrypt key during the
 * rotation window.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleDecodePayloadTest {
    private lateinit var mockReactContext: ReactApplicationContext
    private lateinit var fakeKeyPairSource: FakeKeyPairSource
    private lateinit var module: BcscCoreModule

    private lateinit var rsa1: KeyPair
    private lateinit var rsa2: KeyPair

    @Before
    fun setUp() {
        mockReactContext = mockk(relaxed = true)

        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }

        rsa1 = generateRsaKeyPair()
        rsa2 = generateRsaKeyPair()
        fakeKeyPairSource =
            FakeKeyPairSource(
                keys =
                    linkedMapOf(
                        "rsa1" to KeyPairAndInfo(rsa1, KeyPairInfo("rsa1", 1_000L)),
                        "rsa2" to KeyPairAndInfo(rsa2, KeyPairInfo("rsa2", 2_000L)),
                    ),
                currentAlias = "rsa2",
            )
        module = BcscCoreModule(mockReactContext, fakeKeyPairSource)
    }

    @After
    fun tearDown() {
        unmockkStatic(Arguments::class)
    }

    private fun generateRsaKeyPair(): KeyPair =
        KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()

    /** Inner signed JWT (RS512, `alg:none` would fail `SignedJWT.parse`). */
    private fun signedInnerJwt(
        signingKey: KeyPair,
        signingAlias: String,
        subject: String = "user-123",
    ): SignedJWT {
        val claims = JWTClaimsSet.Builder().subject(subject).build()
        val jwt = SignedJWT(JWSHeader.Builder(JWSAlgorithm.RS512).keyID(signingAlias).build(), claims)
        jwt.sign(RSASSASigner(signingKey.private as RSAPrivateKey))
        return jwt
    }

    /** Outer JWE, labelled with [kid] (or unlabelled when null), encrypted to [encryptTo]. */
    private fun jwe(
        innerJwt: SignedJWT,
        kid: String?,
        encryptTo: KeyPair,
    ): String {
        val headerBuilder = JWEHeader.Builder(JWEAlgorithm.RSA1_5, EncryptionMethod.A256CBC_HS512)
        if (kid != null) headerBuilder.keyID(kid)
        val jweObject = JWEObject(headerBuilder.build(), Payload(innerJwt.serialize()))
        jweObject.encrypt(RSAEncrypter(encryptTo.public as RSAPublicKey))
        return jweObject.serialize()
    }

    /** JWK map (n/e) matching [signingKey]'s public half, for the `verified` flag. */
    private fun jwkMap(signingKey: KeyPair): ReadableMap {
        val rsaKey = RSAKey.Builder(signingKey.public as RSAPublicKey).build()
        return JavaOnlyMap().apply {
            putString("n", rsaKey.modulus.toString())
            putString("e", rsaKey.publicExponent.toString())
        }
    }

    private fun capturingPromise(): Pair<Promise, PromiseCapture> {
        val promise = mockk<Promise>(relaxed = true)
        val capture = PromiseCapture()
        every { promise.resolve(any()) } answers {
            capture.resolved = firstArg()
            Unit
        }
        every { promise.reject(any<String>(), any<String>(), any<Throwable>()) } answers {
            capture.rejectedCode = firstArg()
            capture.rejectedMessage = secondArg()
            Unit
        }
        every { promise.reject(any<String>(), any<String>()) } answers {
            capture.rejectedCode = firstArg()
            capture.rejectedMessage = secondArg()
            Unit
        }
        return promise to capture
    }

    private class PromiseCapture {
        var resolved: Any? = null
        var rejectedCode: String? = null
        var rejectedMessage: String? = null
    }

    // MARK: - case 1: previous-key label decrypts (the regression guard)

    @Test
    fun `JWE labelled with the previous key decrypts while both keys are present`() {
        val inner = signedInnerJwt(rsa1, "rsa1")
        val jweString = jwe(inner, kid = "rsa1", encryptTo = rsa1)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa1), promise)

        assertTrue(
            "expected resolve, got reject: ${capture.rejectedCode} ${capture.rejectedMessage}",
            capture.resolved != null,
        )
        val result = capture.resolved as ReadableMap
        assertTrue(result.getString("claims")!!.contains("user-123"))
        assertTrue(result.getBoolean("verified"))
    }

    // MARK: - case 2: newest-key label still decrypts

    @Test
    fun `JWE labelled with the newest key still decrypts`() {
        val inner = signedInnerJwt(rsa2, "rsa2")
        val jweString = jwe(inner, kid = "rsa2", encryptTo = rsa2)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa2), promise)

        assertTrue(
            "expected resolve, got reject: ${capture.rejectedCode} ${capture.rejectedMessage}",
            capture.resolved != null,
        )
    }

    // MARK: - case 3: no kid falls back to newest, not "try all"

    @Test
    fun `no kid encrypted to newest key falls back and decrypts`() {
        val inner = signedInnerJwt(rsa2, "rsa2")
        val jweString = jwe(inner, kid = null, encryptTo = rsa2)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa2), promise)

        assertTrue(
            "expected resolve, got reject: ${capture.rejectedCode} ${capture.rejectedMessage}",
            capture.resolved != null,
        )
    }

    @Test
    fun `no kid encrypted to previous key rejects rather than trying every local key`() {
        val inner = signedInnerJwt(rsa1, "rsa1")
        val jweString = jwe(inner, kid = null, encryptTo = rsa1)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa1), promise)

        assertEquals("E_JWE_DECRYPT_ERROR", capture.rejectedCode)
        assertTrue(capture.rejectedMessage!!.contains("jweKid=none"))
    }

    // MARK: - case 4: unknown kid falls back to newest

    @Test
    fun `unknown kid encrypted to newest key falls back and decrypts`() {
        val inner = signedInnerJwt(rsa2, "rsa2")
        val jweString = jwe(inner, kid = "rsa9", encryptTo = rsa2)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa2), promise)

        assertTrue(
            "expected resolve, got reject: ${capture.rejectedCode} ${capture.rejectedMessage}",
            capture.resolved != null,
        )
    }

    @Test
    fun `unknown kid encrypted to previous key rejects and diagnostics show kidMatchesLocal false`() {
        val inner = signedInnerJwt(rsa1, "rsa1")
        val jweString = jwe(inner, kid = "rsa9", encryptTo = rsa1)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa1), promise)

        assertEquals("E_JWE_DECRYPT_ERROR", capture.rejectedCode)
        assertTrue(capture.rejectedMessage!!.contains("kidMatchesLocal=false"))
    }

    // MARK: - case 5: kid present locally but unreadable never falls back

    @Test
    fun `kid present locally but unreadable rejects and never falls back to newest`() {
        fakeKeyPairSource.forceNullFor.add("rsa1")
        val inner = signedInnerJwt(rsa1, "rsa1")
        val jweString = jwe(inner, kid = "rsa1", encryptTo = rsa1)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa1), promise)

        assertEquals("E_BCSC_DECODE_ERROR", capture.rejectedCode)
        assertTrue(capture.rejectedMessage!!.contains("kidMatchesLocal=true"))
        assertEquals(0, fakeKeyPairSource.getCurrentCallCount)
    }

    // MARK: - case 6: malformed JWE still rejects as a parse error

    @Test
    fun `malformed JWE rejects with E_JWE_PARSE_ERROR`() {
        val (promise, capture) = capturingPromise()

        module.decodePayload("a.b.c", null, promise)

        assertEquals("E_JWE_PARSE_ERROR", capture.rejectedCode)
    }

    private data class KeyPairAndInfo(
        val keyPair: KeyPair,
        val info: KeyPairInfo,
    )

    /**
     * Test double for [BcscKeyPairSource] backed by real in-memory RSA key pairs. Only the
     * methods `decodePayload` actually calls are implemented; anything else throws so an
     * accidental new call site is caught rather than silently returning a stub value.
     */
    private class FakeKeyPairSource(
        private val keys: LinkedHashMap<String, KeyPairAndInfo>,
        private val currentAlias: String,
    ) : BcscKeyPairSource {
        val forceNullFor = mutableSetOf<String>()
        var getCurrentCallCount = 0
            private set

        override fun isAvailable(): Boolean = throw UnsupportedOperationException()

        override fun getCurrentBcscKeyPair(): BcscKeyPair {
            getCurrentCallCount++
            val entry = keys.getValue(currentAlias)
            return BcscKeyPair(entry.keyPair, entry.info)
        }

        override fun getBcscKeyPair(kid: String): BcscKeyPair? {
            if (kid in forceNullFor) return null
            val entry = keys[kid] ?: return null
            return BcscKeyPair(entry.keyPair, entry.info)
        }

        override fun getNewBcscKeyPair(): BcscKeyPair = throw UnsupportedOperationException()

        override fun deleteBcscKeyPair(alias: String): Unit = throw UnsupportedOperationException()

        override fun getAllBcscKeyPairInfos(): List<KeyPairInfo> = keys.values.map { it.info }

        override fun markActiveBcscKeyPair(alias: String): Unit = throw UnsupportedOperationException()

        override fun cleanUpBcscKeyPairs(): Unit = throw UnsupportedOperationException()

        override fun convertBcscKeyPairToJWK(bcscKeyPair: BcscKeyPair) = throw UnsupportedOperationException()

        override fun signAndSerializeClaimsSet(claimsSet: JWTClaimsSet): String = throw UnsupportedOperationException()

        override fun signClaimsSet(claimsSet: JWTClaimsSet): SignedJWT = throw UnsupportedOperationException()
    }
}
