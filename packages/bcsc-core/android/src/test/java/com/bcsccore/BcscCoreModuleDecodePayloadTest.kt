package com.bcsccore

import com.bcsccore.keypair.core.interfaces.KeyPairInfoSource
import com.bcsccore.keypair.core.models.KeyPairInfo
import com.bcsccore.keypair.repos.key.BcscKeyPairRepo
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.nimbusds.jose.EncryptionMethod
import com.nimbusds.jose.JWEAlgorithm
import com.nimbusds.jose.JWEHeader
import com.nimbusds.jose.JWEObject
import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.Payload
import com.nimbusds.jose.crypto.RSAEncrypter
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
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.interfaces.RSAPublicKey
import java.util.Collections

/**
 * Covers the decrypt-key selection rule behind issue #4595: a response's own JWE `kid` wins
 * over "newest" when we hold that key, falling back to newest exactly as before otherwise.
 * Drives the real [BcscCoreModule.decodePayload] through the constructor test seam with a real
 * [BcscKeyPairRepo] over a mocked [KeyStore], so the metadata-write contract (case 4) is
 * exercised against the real repo code, not a fake.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleDecodePayloadTest {
    companion object {
        private fun rsa(): KeyPair = KeyPairGenerator.getInstance("RSA").also { it.initialize(2048) }.generateKeyPair()

        // One DISTINCT key per alias so the tests can tell which key decrypted: rsa1 = previous
        // key, rsa2 = tracked newest, rsa3 = held in the keystore but untracked in metadata.
        // Sharing one JVM key across aliases would let a wrong-key fallback still decrypt.
        private val KEYS: Map<String, KeyPair> = listOf("rsa1", "rsa2", "rsa3").associateWith { rsa() }
    }

    private class InMemoryKeyPairInfoSource(initial: Map<String, KeyPairInfo>) : KeyPairInfoSource {
        val store = HashMap<String, KeyPairInfo>(initial)

        override fun getKeyPairInfo(kid: String): KeyPairInfo? = store[kid]

        override fun getKeyPairInfo(): HashMap<String, KeyPairInfo> = HashMap(store)

        override fun saveKeyPairInfo(info: KeyPairInfo) {
            store[info.alias] = info
        }

        override fun deleteKeyPairInfo(alias: String) {
            store.remove(alias)
        }
    }

    /** Real repo over a fake keystore whose aliases are exactly [KEYS]. */
    private class InMemoryKeyStoreRepo(infoSource: KeyPairInfoSource) : BcscKeyPairRepo(infoSource) {
        private val keyStore: KeyStore =
            mockk<KeyStore>(relaxed = true).also {
                every { it.aliases() } answers { Collections.enumeration(KEYS.keys.toList()) }
                every { it.containsAlias(any()) } answers { firstArg<String>() in KEYS }
            }

        override fun loadAndroidKeyStore(): KeyStore = keyStore

        // AssertionError is an Error, not an Exception, so it escapes every catch in
        // getCurrentBcscKeyPair/decodePayload and fails the test loudly. Do NOT throw
        // KeypairGenerationException here — that would be swallowed into a confusing reject.
        override fun generateKeyPair(alias: String) = fail("decodePayload must never mint a key (tried '$alias')")

        override fun getKeyPair(
            keyStore: KeyStore,
            kid: String,
        ): KeyPair = KEYS.getValue(kid)
    }

    private lateinit var infoSource: InMemoryKeyPairInfoSource
    private lateinit var module: BcscCoreModule

    @Before
    fun setUp() {
        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }
        // rsa2 is the tracked newest; rsa3 exists only in the keystore (no metadata row).
        infoSource =
            InMemoryKeyPairInfoSource(
                mapOf(
                    "rsa1" to KeyPairInfo("rsa1", 1_000L),
                    "rsa2" to KeyPairInfo("rsa2", 2_000L),
                ),
            )
        module = BcscCoreModule(mockk(relaxed = true), InMemoryKeyStoreRepo(infoSource))
    }

    @After
    fun tearDown() = unmockkStatic(Arguments::class)

    /** What the server sends: inner RS512 JWT, outer RSA1_5 JWE (the app's own JWE alg), labelled [kid] when non-null. */
    private fun serverJwe(
        encryptTo: KeyPair,
        kid: String?,
    ): String {
        val inner = SignedJWT(JWSHeader.Builder(JWSAlgorithm.RS512).build(), JWTClaimsSet.Builder().subject("user-123").build())
        inner.sign(RSASSASigner(encryptTo.private))
        val header = JWEHeader.Builder(JWEAlgorithm.RSA1_5, EncryptionMethod.A256CBC_HS512)
        if (kid != null) header.keyID(kid)
        return JWEObject(header.build(), Payload(inner.serialize()))
            .also { it.encrypt(RSAEncrypter(encryptTo.public as RSAPublicKey)) }
            .serialize()
    }

    /** Runs decodePayload (no JWK, so `verified` is false and irrelevant) and returns the resolved map. */
    private fun decode(jwe: String): JavaOnlyMap {
        val promise = mockk<Promise>(relaxed = true)
        val result = slot<JavaOnlyMap>()
        module.decodePayload(jwe, null, promise)
        // on failure MockK prints the reject(code, message) call, diagnostics included
        verify { promise.resolve(capture(result)) }
        return result.captured
    }

    @Test
    fun `a response labelled with the previous key opens while both keys are held`() {
        val result = decode(serverJwe(KEYS.getValue("rsa1"), kid = "rsa1"))

        assertTrue(result.getString("claims")!!.contains("user-123"))
    }

    @Test
    fun `a response with no label opens with the newest key`() {
        val result = decode(serverJwe(KEYS.getValue("rsa2"), kid = null))

        assertTrue(result.getString("claims")!!.contains("user-123"))
    }

    @Test
    fun `a label naming a key this device does not hold falls back to the newest key`() {
        val result = decode(serverJwe(KEYS.getValue("rsa2"), kid = "rsa9"))

        assertTrue(result.getString("claims")!!.contains("user-123"))
    }

    @Test
    fun `a label hit on an untracked keystore alias opens the response without writing key metadata`() {
        val result = decode(serverJwe(KEYS.getValue("rsa3"), kid = "rsa3"))

        assertTrue(result.getString("claims")!!.contains("user-123"))
        assertFalse(infoSource.store.containsKey("rsa3"))
        assertEquals(setOf("rsa1", "rsa2"), infoSource.store.keys)
        assertEquals(2_000L, infoSource.store["rsa2"]!!.createdAt)
    }
}
