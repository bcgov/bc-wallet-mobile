package com.bcsccore

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.slot
import io.mockk.unmockkStatic
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPublicKey
import java.util.Base64

/**
 * The login challenge is a bare signed JWT; its signature check shares the server-key path with
 * decodePayload, so this pins the same verdicts without a JWE around the token.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleDecodeLoginChallengeTest {
    private val serverKey: KeyPair = rsa()
    private lateinit var module: BcscCoreModule

    @Before
    fun setUp() {
        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }
        // decodeLoginChallenge never touches the device keys.
        module = BcscCoreModule(mockk(relaxed = true))
    }

    @After
    fun tearDown() = unmockkStatic(Arguments::class)

    private fun rsa(): KeyPair = KeyPairGenerator.getInstance("RSA").also { it.initialize(2048) }.generateKeyPair()

    private fun challenge(): String =
        SignedJWT(
            JWSHeader.Builder(JWSAlgorithm.RS512).build(),
            JWTClaimsSet
                .Builder()
                .subject("user-123")
                .claim("bcsc_challenge", "123456")
                .claim("bcsc_client_name", "Example service")
                .build(),
        ).also { it.sign(RSASSASigner(serverKey.private)) }.serialize()

    private fun jwkFor(keyPair: KeyPair): JavaOnlyMap {
        val publicKey = keyPair.public as RSAPublicKey
        return JavaOnlyMap().apply {
            putString("kty", "RSA")
            putString("kid", "server-key")
            putString("alg", "RS512")
            putString("n", base64Url(publicKey.modulus.toByteArray()))
            putString("e", base64Url(publicKey.publicExponent.toByteArray()))
        }
    }

    private fun base64Url(bytes: ByteArray): String {
        val unsigned = bytes.dropWhile { it == 0.toByte() }.toByteArray()
        return Base64.getUrlEncoder().withoutPadding().encodeToString(unsigned)
    }

    private fun decode(
        jwt: String,
        key: JavaOnlyMap?,
    ): JavaOnlyMap {
        val promise = mockk<Promise>(relaxed = true)
        val result = slot<JavaOnlyMap>()
        module.decodeLoginChallenge(jwt, key, promise)
        verify { promise.resolve(capture(result)) }
        return result.captured
    }

    @Test
    fun `the challenge verifies against the signing key's JWK`() {
        assertTrue(decode(challenge(), jwkFor(serverKey)).getBoolean("verified"))
    }

    @Test
    fun `a JWK for another key leaves the challenge unverified`() {
        assertFalse(decode(challenge(), jwkFor(rsa())).getBoolean("verified"))
    }

    @Test
    fun `a JWK without a modulus rejects as an unusable key`() {
        val jwk = jwkFor(serverKey).also { it.putString("n", null) }
        val promise = mockk<Promise>(relaxed = true)

        module.decodeLoginChallenge(challenge(), jwk, promise)

        verify { promise.reject("E_INVALID_JWK", any<String>(), any<Throwable>()) }
        verify(exactly = 0) { promise.resolve(any()) }
    }
}
