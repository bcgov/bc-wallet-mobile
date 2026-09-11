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
import java.util.Base64
import java.util.Collections

/**
 * Covers how the decrypt key is chosen (issue #4595): try a response-named key first, then every
 * remaining key newest-first. Runs the real [BcscCoreModule.decodePayload] against a real
 * [BcscKeyPairRepo] over a stand-in [KeyStore], so the last test checks real code, not a substitute.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleDecodePayloadTest {
    companion object {
        private fun rsa(): KeyPair = KeyPairGenerator.getInstance("RSA").also { it.initialize(2048) }.generateKeyPair()

        // A different key per alias so a test can tell which one decrypted: rsa1 is the previous
        // key, rsa2 the newest, rsa3 one the keystore holds but our records don't. Reusing a single
        // key across aliases would let the wrong choice still decrypt and hide a failure.
        private val KEYS: Map<String, KeyPair> = listOf("rsa1", "rsa2", "rsa3").associateWith { rsa() }
    }

    private class InMemoryKeyPairInfoSource(
        initial: Map<String, KeyPairInfo>,
    ) : KeyPairInfoSource {
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

    /** The real repository, over a stand-in keystore holding exactly the [KEYS] aliases. */
    private class InMemoryKeyStoreRepo(
        infoSource: KeyPairInfoSource,
        private val keys: Map<String, KeyPair> = KEYS,
    ) : BcscKeyPairRepo(infoSource) {
        val retrievedAliases = mutableListOf<String>()
        private val keyStore: KeyStore =
            mockk<KeyStore>(relaxed = true).also {
                every { it.aliases() } answers { Collections.enumeration(keys.keys.toList()) }
                every { it.containsAlias(any()) } answers { firstArg<String>() in keys }
            }

        override fun loadAndroidKeyStore(): KeyStore = keyStore

        // fail() throws an Error, which escapes the catch blocks in getCurrentBcscKeyPair and
        // decodePayload, so the test fails clearly. Don't throw KeypairGenerationException here —
        // it would be caught and reported as a confusing decrypt failure instead.
        override fun generateKeyPair(alias: String) = fail("decodePayload must never mint a key (tried '$alias')")

        override fun getKeyPair(
            keyStore: KeyStore,
            kid: String,
        ): KeyPair = keys.getValue(kid).also { retrievedAliases += kid }
    }

    private lateinit var infoSource: InMemoryKeyPairInfoSource
    private lateinit var keyPairRepo: InMemoryKeyStoreRepo
    private lateinit var module: BcscCoreModule

    @Before
    fun setUp() {
        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }
        // rsa2 is the newest key on record; rsa3 is in the keystore but has no record.
        infoSource =
            InMemoryKeyPairInfoSource(
                mapOf(
                    "rsa1" to KeyPairInfo("rsa1", 1_000L),
                    "rsa2" to KeyPairInfo("rsa2", 2_000L),
                ),
            )
        keyPairRepo = InMemoryKeyStoreRepo(infoSource)
        module = BcscCoreModule(mockk(relaxed = true), keyPairRepo)
    }

    @After
    fun tearDown() = unmockkStatic(Arguments::class)

    /** Builds what the server sends: a signed token wrapped in an encrypted one, labelled [kid]. */
    private fun serverJwe(
        encryptTo: KeyPair,
        kid: String?,
    ): String {
        val inner =
            SignedJWT(JWSHeader.Builder(JWSAlgorithm.RS512).build(), JWTClaimsSet.Builder().subject("user-123").build())
        inner.sign(RSASSASigner(encryptTo.private))
        val header = JWEHeader.Builder(JWEAlgorithm.RSA1_5, EncryptionMethod.A256CBC_HS512)
        if (kid != null) header.keyID(kid)
        return JWEObject(header.build(), Payload(inner.serialize()))
            .also { it.encrypt(RSAEncrypter(encryptTo.public as RSAPublicKey)) }
            .serialize()
    }

    /** Runs decodePayload (no JWK, so `verified` is false and irrelevant) and returns the resolved map. */
    private fun decode(
        jwe: String,
        key: JavaOnlyMap? = null,
    ): JavaOnlyMap {
        val promise = mockk<Promise>(relaxed = true)
        val result = slot<JavaOnlyMap>()
        module.decodePayload(jwe, key, promise)
        // on failure MockK prints the reject(code, message) call, diagnostics included
        verify { promise.resolve(capture(result)) }
        return result.captured
    }

    private fun assertDecryptRejected(jwe: String) {
        val promise = mockk<Promise>(relaxed = true)
        module.decodePayload(jwe, null, promise)
        verify { promise.reject("E_JWE_DECRYPT_ERROR", any<String>(), any<Throwable>()) }
    }

    private fun jwkFor(keyPair: KeyPair): JavaOnlyMap {
        val publicKey = keyPair.public as RSAPublicKey
        return JavaOnlyMap().apply {
            putString("n", base64Url(publicKey.modulus.toByteArray()))
            putString("e", base64Url(publicKey.publicExponent.toByteArray()))
        }
    }

    private fun base64Url(bytes: ByteArray): String {
        val unsigned = bytes.dropWhile { it == 0.toByte() }.toByteArray()
        return Base64.getUrlEncoder().withoutPadding().encodeToString(unsigned)
    }

    @Test
    fun `a response labelled with the previous key opens while both keys are held`() {
        val result = decode(serverJwe(KEYS.getValue("rsa1"), kid = "rsa1"))

        assertTrue(result.getString("claims")!!.contains("user-123"))
    }

    @Test
    fun `a response with no label retries the older key after newest fails`() {
        val result = decode(serverJwe(KEYS.getValue("rsa1"), kid = null))

        assertTrue(result.getString("claims")!!.contains("user-123"))
        assertEquals(listOf("rsa2", "rsa1"), keyPairRepo.retrievedAliases)
    }

    @Test
    fun `a label naming a key this device does not hold falls back through all local keys`() {
        val result = decode(serverJwe(KEYS.getValue("rsa1"), kid = "rsa9"))

        assertTrue(result.getString("claims")!!.contains("user-123"))
        assertEquals(listOf("rsa2", "rsa1"), keyPairRepo.retrievedAliases)
    }

    @Test
    fun `a wrong named key retries an older key`() {
        val metadataBefore = infoSource.store.mapValues { it.value.createdAt }
        val result = decode(serverJwe(KEYS.getValue("rsa1"), kid = "rsa2"))

        assertTrue(result.getString("claims")!!.contains("user-123"))
        assertEquals(listOf("rsa2", "rsa1"), keyPairRepo.retrievedAliases)
        assertEquals(metadataBefore, infoSource.store.mapValues { it.value.createdAt })
    }

    @Test
    fun `a named key that succeeds does not try another key`() {
        val result = decode(serverJwe(KEYS.getValue("rsa2"), kid = "rsa2"))

        assertTrue(result.getString("claims")!!.contains("user-123"))
        assertEquals(listOf("rsa2"), keyPairRepo.retrievedAliases)
    }

    @Test
    fun `a label hit on an untracked keystore alias opens the response without writing key metadata`() {
        val result = decode(serverJwe(KEYS.getValue("rsa3"), kid = "rsa3"))

        assertTrue(result.getString("claims")!!.contains("user-123"))
        assertFalse(infoSource.store.containsKey("rsa3"))
        assertEquals(setOf("rsa1", "rsa2"), infoSource.store.keys)
        assertEquals(2_000L, infoSource.store["rsa2"]!!.createdAt)
    }

    @Test
    fun `all keys failing decryption rejects with the decrypt error`() {
        assertDecryptRejected(serverJwe(rsa(), kid = "rsa2"))

        assertEquals(listOf("rsa2", "rsa1", "rsa3"), keyPairRepo.retrievedAliases)
    }

    @Test
    fun `a tampered authentication tag is rejected`() {
        val parts = serverJwe(KEYS.getValue("rsa2"), kid = "rsa2").split(".").toMutableList()
        parts[4] = (if (parts[4].first() == 'A') "B" else "A") + parts[4].drop(1)

        assertDecryptRejected(parts.joinToString("."))
    }

    @Test
    fun `a successful decrypt does not bypass inner signature verification`() {
        val result = decode(serverJwe(KEYS.getValue("rsa2"), kid = "rsa2"), jwkFor(KEYS.getValue("rsa1")))

        assertFalse(result.getBoolean("verified"))
        assertEquals(listOf("rsa2"), keyPairRepo.retrievedAliases)
    }

    @Test
    fun `an empty key inventory rejects without minting a key`() {
        val emptyInfoSource = InMemoryKeyPairInfoSource(emptyMap())
        val emptyRepo = InMemoryKeyStoreRepo(emptyInfoSource, emptyMap())
        val emptyModule = BcscCoreModule(mockk(relaxed = true), emptyRepo)
        val promise = mockk<Promise>(relaxed = true)

        emptyModule.decodePayload(serverJwe(rsa(), kid = null), null, promise)

        verify { promise.reject("E_NO_KEYS_FOUND", any<String>()) }
        assertTrue(emptyInfoSource.store.isEmpty())
        assertTrue(emptyRepo.retrievedAliases.isEmpty())
    }
}
