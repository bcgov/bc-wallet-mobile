package com.bcsccore.keypair.repos.key

import com.bcsccore.keypair.core.exceptions.KeyAlreadyExistsException
import com.bcsccore.keypair.core.interfaces.KeyPairInfoSource
import com.bcsccore.keypair.core.models.KeyPairInfo
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.security.KeyPair
import java.security.KeyStore
import java.security.KeyStoreException
import java.util.Collections

/**
 * Verifies [BcscKeyPairRepo.getNewBcscKeyPair]'s alias selection: the next rsa\d+ alias must be
 * computed from the max id across ALL metadata rows AND all keystore aliases, with a bounded
 * catch-and-bump retry as defense-in-depth against a stale/blind keystore scan. See issue #3876.
 */
@RunWith(RobolectricTestRunner::class)
class BcscKeyPairRepoAliasSelectionTest {
    /**
     * Robolectric can't exercise the real "AndroidKeyStore" provider, so [loadAndroidKeyStore] is
     * substituted with a controllable mock and [getKeyPair] with a shared fake key pair.
     *
     * Unlike BcscKeyPairRepoCleanupTest's no-op stub, [generateKeyPair] here enforces the real
     * containsAlias guard against [keystoreEntries] and records every attempted alias in
     * [generatedAttempts] — without this, the livelock scenarios under test cannot fail
     * pre-fix, making the tests theatre rather than a regression guard.
     */
    private class RecordingBcscKeyPairRepo(
        infoSource: KeyPairInfoSource,
        private val fakeKeyStore: KeyStore,
        private val keystoreEntries: MutableSet<String>,
    ) : BcscKeyPairRepo(infoSource) {
        val generatedAttempts: MutableList<String> = mutableListOf()

        override fun loadAndroidKeyStore(): KeyStore = fakeKeyStore

        override fun generateKeyPair(alias: String) {
            generatedAttempts.add(alias)
            if (keystoreEntries.contains(alias)) {
                throw KeyAlreadyExistsException("simulated collision for alias '$alias'")
            }
            keystoreEntries.add(alias)
        }

        override fun getKeyPair(
            keyStore: KeyStore,
            kid: String,
        ): KeyPair = KeyPairRepoTestFixtures.RSA_KEY_PAIR
    }

    /**
     * A keystore mock whose aliases() reflects [keystoreEntries] live on every call — `answers`,
     * not `returns`, so a second call (the retry path) doesn't see a stale/exhausted enumeration.
     * An exhausted enumeration on the second call would make findRsaAliasesInKeyStore see an
     * empty keystore and the retry would rescue an otherwise-broken max computation, masking a
     * regression.
     */
    private fun liveKeyStore(keystoreEntries: MutableSet<String>): KeyStore {
        val ks = mockk<KeyStore>(relaxed = true)
        every { ks.aliases() } answers { Collections.enumeration(keystoreEntries.toList()) }
        return ks
    }

    private fun blindKeyStore(): KeyStore {
        val ks = mockk<KeyStore>(relaxed = true)
        every { ks.aliases() } throws KeyStoreException("simulated blind keystore scan")
        return ks
    }

    @Test
    fun `spec livelock case picks the alias one past the highest keystore id`() {
        // metadata {rsa1}, keystore {rsa1, rsa2}: pre-fix this computed rsa2 from metadata alone
        // and collided forever. The fix must land on rsa3 on the first attempt.
        val infoSource =
            InMemoryKeyPairInfoSource(mapOf("rsa1" to KeyPairInfo("rsa1", System.currentTimeMillis())))
        val keystoreEntries = mutableSetOf("rsa1", "rsa2")
        val repo = RecordingBcscKeyPairRepo(infoSource, liveKeyStore(keystoreEntries), keystoreEntries)

        val result = repo.getNewBcscKeyPair()

        assertEquals("rsa3", result.keyInfo.alias)
        assertTrue("metadata must gain the new alias", infoSource.store.containsKey("rsa3"))
        // Load-bearing: with the retry present, a broken max computation could still "succeed" on
        // a bump. size == 1 is what proves it succeeds on the FIRST attempt.
        assertEquals(listOf("rsa3"), repo.generatedAttempts)
    }

    @Test
    fun `promoted-older-alias case scans all metadata rows not just the newest`() {
        // markActiveBcscKeyPair("rsa2") stamped an older alias as newest-by-createdAt, while rsa3
        // still exists in both metadata and keystore. Scanning ALL metadata rows (not just the
        // newest) must still land past rsa3.
        val now = System.currentTimeMillis()
        val infoSource =
            InMemoryKeyPairInfoSource(
                mapOf(
                    "rsa1" to KeyPairInfo("rsa1", now - 20_000L),
                    "rsa2" to KeyPairInfo("rsa2", now), // newest-stamped, but numerically lower
                    "rsa3" to KeyPairInfo("rsa3", now - 10_000L),
                ),
            )
        val keystoreEntries = mutableSetOf("rsa1", "rsa2", "rsa3")
        val repo = RecordingBcscKeyPairRepo(infoSource, liveKeyStore(keystoreEntries), keystoreEntries)

        val result = repo.getNewBcscKeyPair()

        assertEquals("rsa4", result.keyInfo.alias)
        assertEquals(listOf("rsa4"), repo.generatedAttempts)
    }

    @Test
    fun `ordinary case is unchanged when metadata and keystore agree`() {
        val infoSource =
            InMemoryKeyPairInfoSource(
                mapOf(
                    "rsa1" to KeyPairInfo("rsa1", System.currentTimeMillis() - 1000L),
                    "rsa2" to KeyPairInfo("rsa2", System.currentTimeMillis()),
                ),
            )
        val keystoreEntries = mutableSetOf("rsa1", "rsa2")
        val repo = RecordingBcscKeyPairRepo(infoSource, liveKeyStore(keystoreEntries), keystoreEntries)

        val result = repo.getNewBcscKeyPair()

        assertEquals("rsa3", result.keyInfo.alias)
        assertEquals(listOf("rsa3"), repo.generatedAttempts)
    }

    @Test
    fun `empty metadata and empty keystore generates rsa1 with no phantom row`() {
        val infoSource = InMemoryKeyPairInfoSource()
        val keystoreEntries = mutableSetOf<String>()
        val repo = RecordingBcscKeyPairRepo(infoSource, liveKeyStore(keystoreEntries), keystoreEntries)

        val result = repo.getNewBcscKeyPair()

        assertEquals("rsa1", result.keyInfo.alias)
        assertEquals(listOf("rsa1"), repo.generatedAttempts)
        assertEquals(
            "no phantom seed row: only the real rsa1 entry may exist",
            setOf("rsa1"),
            infoSource.store.keys,
        )
    }

    @Test
    fun `retry rescues a stale keystore scan when the first candidate collides`() {
        // aliases() throws (scan blind), so nextRsaAliasId undercounts from metadata alone
        // (max id 1 -> candidate rsa2). The keystore actually holds rsa2 already, so the first
        // attempt must collide and the bounded retry must rescue it on the second attempt.
        val infoSource = InMemoryKeyPairInfoSource(mapOf("rsa1" to KeyPairInfo("rsa1", System.currentTimeMillis())))
        val keystoreEntries = mutableSetOf("rsa2")
        val repo = RecordingBcscKeyPairRepo(infoSource, blindKeyStore(), keystoreEntries)

        val result = repo.getNewBcscKeyPair()

        assertEquals("rsa3", result.keyInfo.alias)
        assertEquals(listOf("rsa2", "rsa3"), repo.generatedAttempts)
    }

    @Test
    fun `bounded exhaustion throws KeyAlreadyExistsException after exactly MAX_ALIAS_ATTEMPTS`() {
        // aliases() throws (scan blind); keystore holds rsa2..rsa10 so every candidate in the
        // bounded retry window collides. Must throw after exactly 5 attempts, never loop forever.
        val infoSource = InMemoryKeyPairInfoSource(mapOf("rsa1" to KeyPairInfo("rsa1", System.currentTimeMillis())))
        val keystoreEntries = (2..10).map { "rsa$it" }.toMutableSet()
        val repo = RecordingBcscKeyPairRepo(infoSource, blindKeyStore(), keystoreEntries)

        val thrown =
            try {
                repo.getNewBcscKeyPair()
                fail("getNewBcscKeyPair() must throw once all attempts are exhausted")
                null
            } catch (e: Exception) {
                e
            }

        assertTrue(
            "the exhaustion failure must be (or wrap) a KeyAlreadyExistsException",
            thrown is KeyAlreadyExistsException || thrown?.cause is KeyAlreadyExistsException,
        )
        assertEquals(listOf("rsa2", "rsa3", "rsa4", "rsa5", "rsa6"), repo.generatedAttempts)
    }
}
