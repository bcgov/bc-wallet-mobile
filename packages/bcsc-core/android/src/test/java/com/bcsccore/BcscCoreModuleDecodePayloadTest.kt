package com.bcsccore

import com.bcsccore.keypair.core.exceptions.KeyNotFoundException
import com.bcsccore.keypair.core.exceptions.KeypairGenerationException
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
    companion object {
        // Hoisted so 2048-bit RSA generation happens once for the whole class, not once per
        // test — three sibling BcscKeyPairRepo*Test files use the same `by lazy` pattern.
        private val rsa1: KeyPair by lazy { generateRsaKeyPair() }
        private val rsa2: KeyPair by lazy { generateRsaKeyPair() }
        private val rsa3: KeyPair by lazy { generateRsaKeyPair() }

        private fun generateRsaKeyPair(): KeyPair =
            KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
    }

    private lateinit var mockReactContext: ReactApplicationContext
    private lateinit var fakeKeyPairSource: FakeKeyPairSource
    private lateinit var module: BcscCoreModule

    @Before
    fun setUp() {
        mockReactContext = mockk(relaxed = true)

        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }

        fakeKeyPairSource =
            FakeKeyPairSource(
                keys =
                    linkedMapOf(
                        "rsa1" to KeyPairAndInfo(rsa1, KeyPairInfo("rsa1", 1_000L)),
                        "rsa2" to KeyPairAndInfo(rsa2, KeyPairInfo("rsa2", 2_000L)),
                        // Present in the keystore but untracked in metadata (createdAt=0), e.g.
                        // a failed rollback or a failed deleteKeyEntry — see F1 tests below.
                        "rsa3" to KeyPairAndInfo(rsa3, KeyPairInfo("rsa3", 0L)),
                    ),
                currentAlias = "rsa2",
            )
        module = BcscCoreModule(mockReactContext, fakeKeyPairSource)
    }

    @After
    fun tearDown() {
        unmockkStatic(Arguments::class)
    }

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
        assertEquals(
            "newest must come from the enumerated list; getCurrentBcscKeyPair() reconciles " +
                "metadata and can mint a key pair, which a decrypt must never do",
            0,
            fakeKeyPairSource.getCurrentCallCount,
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
        assertEquals(0, fakeKeyPairSource.getCurrentCallCount)
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
        // Post-#4595-F3 contract: an alias the repo enumerates but can't retrieve throws,
        // it does not return null — model that here rather than the null-return the real
        // repo used to (incorrectly) produce.
        fakeKeyPairSource.forceThrowFor.add("rsa1")
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

    // MARK: - F1 regression: a locally-held but untracked (orphan) kid must not require /
    // trigger a promotion to "newest" to be usable

    @Test
    fun `kid matching a locally-held but untracked orphan alias decrypts via the confirmed-local path`() {
        val inner = signedInnerJwt(rsa3, "rsa3")
        val jweString = jwe(inner, kid = "rsa3", encryptTo = rsa3)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa3), promise)

        assertTrue(
            "expected resolve, got reject: ${capture.rejectedCode} ${capture.rejectedMessage}",
            capture.resolved != null,
        )
        assertEquals(
            "an orphan kid must resolve via the confirmed-local lookup alone — any call to " +
                "getCurrentBcscKeyPair() here would mean it fell through to a newest fallback " +
                "instead of being read directly",
            0,
            fakeKeyPairSource.getCurrentCallCount,
        )
    }

    // MARK: - F2 regression: an enumeration fault must not silently reintroduce newest-wins

    @Test
    fun `previous-key label still decrypts correctly when key enumeration itself fails`() {
        fakeKeyPairSource.enumerationShouldFail = true
        val inner = signedInnerJwt(rsa1, "rsa1")
        val jweString = jwe(inner, kid = "rsa1", encryptTo = rsa1)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa1), promise)

        assertTrue(
            "an enumeration fault must not make a held previous key fall back to newest — " +
                "got reject ${capture.rejectedCode} ${capture.rejectedMessage}",
            capture.resolved != null,
        )
    }

    @Test
    fun `previous-key label still decrypts when enumeration reports no keys at all`() {
        // The real repo used to swallow a keyStore.aliases() fault into an empty list rather than
        // throwing, so the label must be tried directly regardless of what enumeration says.
        fakeKeyPairSource.enumerationReturnsEmpty = true
        val inner = signedInnerJwt(rsa1, "rsa1")
        val jweString = jwe(inner, kid = "rsa1", encryptTo = rsa1)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa1), promise)

        assertTrue(
            "an empty enumeration must not make a held previous key fall back to newest — " +
                "got reject ${capture.rejectedCode} ${capture.rejectedMessage}",
            capture.resolved != null,
        )
        assertEquals(0, fakeKeyPairSource.getCurrentCallCount)
    }

    @Test
    fun `held kid used under an enumeration fault is reported as kidMatchesLocal true`() {
        fakeKeyPairSource.enumerationShouldFail = true
        val inner = signedInnerJwt(rsa1, "rsa1")
        // Labelled rsa1 (held, so rsa1 is the decrypt key) but encrypted to rsa2: the decrypt
        // fails and the report must still say the named key was found and used.
        val jweString = jwe(inner, kid = "rsa1", encryptTo = rsa2)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa1), promise)

        assertEquals("E_JWE_DECRYPT_ERROR", capture.rejectedCode)
        assertTrue(capture.rejectedMessage!!.contains("kidMatchesLocal=true"))
        assertTrue(capture.rejectedMessage!!.contains("enumerationFailed=true"))
    }

    // MARK: - F1 regression: an empty (rather than failed) enumeration falls back to the
    // tracked-newest alias instead of rejecting outright

    @Test
    fun `no kid falls back to the tracked-newest alias when enumeration returns empty`() {
        fakeKeyPairSource.enumerationReturnsEmpty = true
        val inner = signedInnerJwt(rsa2, "rsa2")
        val jweString = jwe(inner, kid = null, encryptTo = rsa2)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa2), promise)

        assertTrue(
            "expected resolve, got reject: ${capture.rejectedCode} ${capture.rejectedMessage}",
            capture.resolved != null,
        )
        assertEquals(0, fakeKeyPairSource.getCurrentCallCount)
    }

    @Test
    fun `unmatched kid with a failed enumeration still falls back to the tracked-newest alias`() {
        fakeKeyPairSource.enumerationShouldFail = true
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
    fun `a tracked-newest alias that is not actually held rejects with E_NO_KEYS_FOUND rather than minting`() {
        fakeKeyPairSource.enumerationReturnsEmpty = true
        fakeKeyPairSource.newestTrackedAlias = "rsa7"
        val inner = signedInnerJwt(rsa1, "rsa1")
        val jweString = jwe(inner, kid = null, encryptTo = rsa1)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa1), promise)

        assertEquals("E_NO_KEYS_FOUND", capture.rejectedCode)
        assertEquals(
            "an untracked/unheld newest alias must reject, not fall through to " +
                "getCurrentBcscKeyPair() which can mint a key pair",
            0,
            fakeKeyPairSource.getCurrentCallCount,
        )
    }

    @Test
    fun `no keys at all rejects with E_NO_KEYS_FOUND`() {
        fakeKeyPairSource.enumerationReturnsEmpty = true
        fakeKeyPairSource.newestTrackedAlias = null
        val inner = signedInnerJwt(rsa1, "rsa1")
        val jweString = jwe(inner, kid = null, encryptTo = rsa1)
        val (promise, capture) = capturingPromise()

        module.decodePayload(jweString, jwkMap(rsa1), promise)

        assertEquals("E_NO_KEYS_FOUND", capture.rejectedCode)
        assertTrue(capture.rejectedMessage!!.contains("keys=0"))
        assertEquals(0, fakeKeyPairSource.getCurrentCallCount)
    }

    private data class KeyPairAndInfo(
        val keyPair: KeyPair,
        val info: KeyPairInfo,
    )

    /**
     * Test double for [BcscKeyPairSource] backed by real in-memory RSA key pairs, modeling the
     * real repo's post-#4595 contract: [getBcscKeyPair] is a pure read (never mutates [keys]),
     * returns null only for an alias absent from [keys], and throws for one in [forceThrowFor]
     * (simulating "present but unreadable" — a real repo error, never a swallowed null).
     * [getAllBcscKeyPairInfos] throws when [enumerationShouldFail] and returns an empty list
     * when [enumerationReturnsEmpty], independent of whether a specific alias is still directly
     * readable via [getBcscKeyPair]. Only the methods `decodePayload` actually calls are
     * implemented; anything else throws so an accidental new call site is caught rather than
     * silently returning a stub value.
     */
    private class FakeKeyPairSource(
        private val keys: LinkedHashMap<String, KeyPairAndInfo>,
        private val currentAlias: String,
    ) : BcscKeyPairSource {
        val forceThrowFor = mutableSetOf<String>()
        var enumerationShouldFail = false
        var enumerationReturnsEmpty = false
        var newestTrackedAlias: String? = currentAlias
        var getCurrentCallCount = 0
            private set

        override fun isAvailable(): Boolean = throw UnsupportedOperationException()

        override fun getCurrentBcscKeyPair(): BcscKeyPair {
            getCurrentCallCount++
            val entry = keys.getValue(currentAlias)
            return BcscKeyPair(entry.keyPair, entry.info)
        }

        override fun getBcscKeyPair(kid: String): BcscKeyPair? {
            if (kid in forceThrowFor) {
                throw KeyNotFoundException(
                    "simulated unreadable key for '$kid'",
                    RuntimeException("simulated OEM keystore failure"),
                )
            }
            val entry = keys[kid] ?: return null
            return BcscKeyPair(entry.keyPair, entry.info)
        }

        override fun getNewestTrackedAlias(): String? = newestTrackedAlias

        override fun getNewBcscKeyPair(): BcscKeyPair = throw UnsupportedOperationException()

        override fun deleteBcscKeyPair(alias: String): Unit = throw UnsupportedOperationException()

        override fun getAllBcscKeyPairInfos(): List<KeyPairInfo> {
            if (enumerationShouldFail) {
                throw KeypairGenerationException("simulated keystore enumeration fault")
            }
            if (enumerationReturnsEmpty) {
                return emptyList()
            }
            return keys.values.map { it.info }
        }

        override fun markActiveBcscKeyPair(alias: String): Unit = throw UnsupportedOperationException()

        override fun cleanUpBcscKeyPairs(): Unit = throw UnsupportedOperationException()

        override fun convertBcscKeyPairToJWK(bcscKeyPair: BcscKeyPair) = throw UnsupportedOperationException()

        override fun signAndSerializeClaimsSet(claimsSet: JWTClaimsSet): String = throw UnsupportedOperationException()

        override fun signClaimsSet(claimsSet: JWTClaimsSet): SignedJWT = throw UnsupportedOperationException()
    }
}
