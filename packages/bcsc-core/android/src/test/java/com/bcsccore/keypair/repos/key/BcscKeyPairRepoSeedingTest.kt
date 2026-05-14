package com.bcsccore.keypair.repos.key

import com.bcsccore.keypair.core.exceptions.BcscException
import com.bcsccore.keypair.core.interfaces.KeyPairInfoSource
import com.bcsccore.keypair.core.models.BcscKeyPair
import com.bcsccore.keypair.core.models.KeyPairInfo
import com.nimbusds.jose.crypto.RSASSAVerifier
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.interfaces.RSAPublicKey
import java.util.Collections
import java.util.HashMap

/**
 * Verifies the v3→v4 migration seeding logic in BcscKeyPairRepo:
 *  - reconcileKeyPairInfoWithKeyStore assigns createdAt values so the highest
 *    rsa\d+ alias is treated as newest.
 *  - getOldestKeyPairInfo picks the entry with the lowest createdAt, so the
 *    lowest-numbered alias is pruned first after rotation.
 *  - Aliases that don't match rsa\d+ are silently ignored.
 *
 * Also verifies signClaimsSet / signAndSerializeClaimsSet kid behaviour:
 *  - The kid field in the JWS header equals the alias of the active key.
 *  - The kid field corresponds to the key that actually produced the signature,
 *    so server-side key selection cannot silently regress.
 */
@RunWith(RobolectricTestRunner::class)
class BcscKeyPairRepoSeedingTest {
    companion object {
        // One 2048-bit key pair shared across all signing tests — key size does
        // not affect kid logic and avoids per-test generation overhead.
        private val TEST_KEY_PAIR: java.security.KeyPair by lazy {
            KeyPairGenerator.getInstance("RSA").also { it.initialize(2048) }.generateKeyPair()
        }
    }

    // Lightweight in-memory stand-in for SharedPreferences-backed KeyPairInfoSource.
    private class InMemoryKeyPairInfoSource(
        initial: Map<String, KeyPairInfo> = emptyMap(),
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

    // Reflective helpers so we can reach the private seeding methods directly
    // without going through the full Android KeyStore stack.

    private fun reconcile(
        repo: BcscKeyPairRepo,
        keyStore: KeyStore,
    ) {
        BcscKeyPairRepo::class.java
            .getDeclaredMethod("reconcileKeyPairInfoWithKeyStore", KeyStore::class.java)
            .also { it.isAccessible = true }
            .invoke(repo, keyStore)
    }

    private fun getOldest(
        repo: BcscKeyPairRepo,
        map: HashMap<String, KeyPairInfo>,
    ): KeyPairInfo? =
        BcscKeyPairRepo::class.java
            .getDeclaredMethod("getOldestKeyPairInfo", HashMap::class.java)
            .also { it.isAccessible = true }
            .invoke(repo, map) as? KeyPairInfo

    private fun keystoreWith(aliases: List<String>): KeyStore {
        val ks = mockk<KeyStore>(relaxed = true)
        every { ks.aliases() } returns Collections.enumeration(aliases)
        return ks
    }

    // -----------------------------------------------------------------------
    // (1) Highest rsa\d+ alias is seeded with the newest createdAt
    // -----------------------------------------------------------------------

    @Test
    fun `highest rsa alias is assigned the newest createdAt during reconciliation`() {
        val infoSource = InMemoryKeyPairInfoSource()
        val repo = BcscKeyPairRepo(infoSource)

        reconcile(repo, keystoreWith(listOf("rsa1", "rsa3", "rsa5")))

        val saved = infoSource.store
        assertEquals("all three aliases must be backfilled", 3, saved.size)

        val ts1 = saved["rsa1"]!!.createdAt
        val ts3 = saved["rsa3"]!!.createdAt
        val ts5 = saved["rsa5"]!!.createdAt

        assertTrue("rsa5 (highest id) must have a higher createdAt than rsa3", ts5 > ts3)
        assertTrue("rsa3 must have a higher createdAt than rsa1 (lowest id)", ts3 > ts1)
    }

    // -----------------------------------------------------------------------
    // (2) createdAt ordering → getOldestKeyPairInfo prunes lowest alias first
    // -----------------------------------------------------------------------

    @Test
    fun `getOldestKeyPairInfo returns the entry with the lowest createdAt`() {
        val repo = BcscKeyPairRepo(InMemoryKeyPairInfoSource())
        val now = System.currentTimeMillis()
        val map =
            hashMapOf(
                "rsa1" to KeyPairInfo("rsa1", now - 2000L),
                "rsa2" to KeyPairInfo("rsa2", now - 1000L),
                "rsa3" to KeyPairInfo("rsa3", now),
            )

        val oldest = getOldest(repo, map)

        assertNotNull(oldest)
        assertEquals("rsa1 has the lowest createdAt so it must be pruned first", "rsa1", oldest!!.alias)
    }

    @Test
    fun `getOldestKeyPairInfo returns null when fewer than 3 entries exist`() {
        val repo = BcscKeyPairRepo(InMemoryKeyPairInfoSource())
        val now = System.currentTimeMillis()
        val map =
            hashMapOf(
                "rsa1" to KeyPairInfo("rsa1", now - 1000L),
                "rsa2" to KeyPairInfo("rsa2", now),
            )

        assertNull(
            "cleanup guard must prevent pruning when fewer than 3 keys are tracked",
            getOldest(repo, map),
        )
    }

    // -----------------------------------------------------------------------
    // (3) Non-matching aliases are silently ignored
    // -----------------------------------------------------------------------

    @Test
    fun `non-matching aliases are ignored during reconciliation`() {
        val infoSource = InMemoryKeyPairInfoSource()
        val repo = BcscKeyPairRepo(infoSource)

        reconcile(
            repo,
            keystoreWith(listOf("rsa2", "firebase_key", "some_cert", "RSA4", "rsa4")),
        )

        val saved = infoSource.store
        assertEquals("only rsa2 and rsa4 should be backfilled", 2, saved.size)
        assertTrue(saved.containsKey("rsa2"))
        assertTrue(saved.containsKey("rsa4"))
        assertFalse("firebase_key must be ignored", saved.containsKey("firebase_key"))
        assertFalse("some_cert must be ignored", saved.containsKey("some_cert"))
        assertFalse("RSA4 (uppercase) must be ignored — pattern is case-sensitive", saved.containsKey("RSA4"))
    }

    // -----------------------------------------------------------------------
    // (4) signClaimsSet – kid in JWS header matches the active key alias, and
    //     the alias identifies the key that actually produced the signature.
    // -----------------------------------------------------------------------

    // Returns a spy whose getCurrentBcscKeyPair() is stubbed to return a
    // BcscKeyPair backed by TEST_KEY_PAIR under the given alias, so the signing
    // path runs against a real JVM RSA key without touching AndroidKeyStore.
    private fun repoSigningAs(alias: String): BcscKeyPairRepo {
        val spy = spyk(BcscKeyPairRepo(InMemoryKeyPairInfoSource()))
        val bcscKeyPair = BcscKeyPair(TEST_KEY_PAIR, KeyPairInfo(alias, System.currentTimeMillis()))
        every { spy.getCurrentBcscKeyPair() } returns bcscKeyPair
        return spy
    }

    @Test
    fun `signClaimsSet sets kid in JWS header to the active key alias`() {
        val alias = "rsa7"
        val jwt =
            repoSigningAs(alias)
                .signClaimsSet(JWTClaimsSet.Builder().subject("test-subject").build())

        assertEquals(
            "JWS header kid must equal the alias of the active key",
            alias,
            jwt.header.keyID,
        )
    }

    @Test
    fun `signClaimsSet kid matches the key that produced the signature`() {
        val alias = "rsa7"
        val jwt =
            repoSigningAs(alias)
                .signClaimsSet(JWTClaimsSet.Builder().subject("test-subject").build())

        // Verify with the public half of TEST_KEY_PAIR — if kid lied about which
        // key signed, this would fail and the server would reject the token.
        val verifier = RSASSAVerifier(TEST_KEY_PAIR.public as RSAPublicKey)
        assertTrue(
            "JWT must be verifiable with the public key whose alias appears as kid",
            jwt.verify(verifier),
        )
        assertEquals(alias, jwt.header.keyID)
    }

    @Test
    fun `signAndSerializeClaimsSet embeds kid in the serialized JWT header`() {
        val alias = "rsa7"
        val serialized =
            repoSigningAs(alias)
                .signAndSerializeClaimsSet(JWTClaimsSet.Builder().subject("test-subject").build())

        val parsed = SignedJWT.parse(serialized)
        assertEquals(
            "kid in the serialized JWT header must match the active key alias",
            alias,
            parsed.header.keyID,
        )
    }
}
