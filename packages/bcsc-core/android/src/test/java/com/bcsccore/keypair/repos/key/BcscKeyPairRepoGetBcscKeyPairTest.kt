package com.bcsccore.keypair.repos.key

import com.bcsccore.keypair.core.exceptions.BcscException
import com.bcsccore.keypair.core.exceptions.KeyNotFoundException
import com.bcsccore.keypair.core.interfaces.KeyPairInfoSource
import com.bcsccore.keypair.core.models.KeyPairInfo
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.KeyStoreException
import java.security.UnrecoverableEntryException
import java.util.Collections
import java.util.HashMap

/**
 * Pins [BcscKeyPairRepo.getBcscKeyPair]'s read-only contract (issue #4595 F1/F3): a read must
 * never write metadata (F1), and must distinguish "alias definitively absent" (null) from
 * "alias present but unreadable" (thrown [BcscException] carrying the real cause), instead of
 * swallowing every retrieval failure to null (F3).
 */
@RunWith(RobolectricTestRunner::class)
class BcscKeyPairRepoGetBcscKeyPairTest {
    companion object {
        private val FAKE_KEY_PAIR: KeyPair by lazy {
            KeyPairGenerator.getInstance("RSA").also { it.initialize(2048) }.generateKeyPair()
        }
    }

    // Matches the pattern in BcscKeyPairRepoAliasSelectionTest / *CleanupTest / *SeedingTest.
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

    /**
     * [loadAndroidKeyStore] is substituted (Robolectric has no real "AndroidKeyStore" provider).
     * [getKeyPair] either returns the shared fake pair or throws for aliases listed in
     * [unreadableAliases], to simulate a keystore entry that exists but can't be read
     * (invalidated, OEM keystore error, etc.).
     */
    private class TestRepo(
        infoSource: KeyPairInfoSource,
        private val fakeKeyStore: KeyStore,
        private val unreadableAliases: Set<String> = emptySet(),
    ) : BcscKeyPairRepo(infoSource) {
        override fun loadAndroidKeyStore(): KeyStore = fakeKeyStore

        override fun getKeyPair(
            keyStore: KeyStore,
            kid: String,
        ): KeyPair {
            if (kid in unreadableAliases) {
                throw UnrecoverableEntryException("simulated OEM keystore failure for '$kid'")
            }
            return FAKE_KEY_PAIR
        }
    }

    private fun keyStoreWithAliases(aliases: Set<String>): KeyStore {
        val ks = mockk<KeyStore>(relaxed = true)
        every { ks.aliases() } answers { Collections.enumeration(aliases.toList()) }
        every { ks.containsAlias(any()) } answers { firstArg<String>() in aliases }
        return ks
    }

    // MARK: - F1: a read must never write metadata or change what's newest

    @Test
    fun `reading a keystore-only orphan alias does not persist metadata`() {
        // rsa1 is tracked and active; rsa3 exists in the keystore but has no metadata row yet
        // (e.g. a failed rollback or a failed deleteKeyEntry after its row was removed).
        val infoSource = InMemoryKeyPairInfoSource(mapOf("rsa1" to KeyPairInfo("rsa1", 1_000L)))
        val repo = TestRepo(infoSource, keyStoreWithAliases(setOf("rsa1", "rsa3")))

        val result = repo.getBcscKeyPair("rsa3")

        assertEquals(0L, result?.keyInfo?.createdAt)
        assertFalse(
            "getBcscKeyPair must not persist metadata for an alias it merely read",
            infoSource.store.containsKey("rsa3"),
        )
        assertEquals(
            "the previously-active alias must remain untouched",
            1_000L,
            infoSource.store["rsa1"]?.createdAt,
        )
    }

    @Test
    fun `reading a keystore-only orphan alias does not change which alias is newest`() {
        val infoSource = InMemoryKeyPairInfoSource(mapOf("rsa1" to KeyPairInfo("rsa1", 1_000L)))
        val repo = TestRepo(infoSource, keyStoreWithAliases(setOf("rsa1", "rsa3")))

        repo.getBcscKeyPair("rsa3")

        val newest = repo.getCurrentBcscKeyPair()
        assertEquals("reading rsa3 must not promote it over the tracked rsa1", "rsa1", newest.keyInfo.alias)
    }

    // MARK: - F3: distinguish "absent" (null) from "present but unreadable" (throws, with cause)

    @Test
    fun `an alias present in the keystore but unreadable throws with the real cause, not null`() {
        val infoSource = InMemoryKeyPairInfoSource(mapOf("rsa1" to KeyPairInfo("rsa1", 1_000L)))
        val repo = TestRepo(infoSource, keyStoreWithAliases(setOf("rsa1")), unreadableAliases = setOf("rsa1"))

        val thrown =
            try {
                repo.getBcscKeyPair("rsa1")
                fail("expected getBcscKeyPair to throw, not return")
                null
            } catch (e: BcscException) {
                e
            }

        assertTrue(thrown is KeyNotFoundException)
        assertTrue(
            "message should name the alias",
            thrown!!.devMessage.contains("rsa1"),
        )
        assertTrue(
            "the real underlying failure must be preserved as the cause",
            thrown.cause is UnrecoverableEntryException,
        )
    }

    @Test
    fun `an alias absent from the keystore returns null, not an exception`() {
        val infoSource = InMemoryKeyPairInfoSource()
        val repo = TestRepo(infoSource, keyStoreWithAliases(emptySet()))

        assertNull(repo.getBcscKeyPair("rsa9"))
    }

    // MARK: - enumeration: a keystore fault must surface, not read as "no keys"

    @Test
    fun `getAllBcscKeyPairInfos throws when the keystore cannot enumerate aliases`() {
        val ks = mockk<KeyStore>(relaxed = true)
        every { ks.aliases() } throws KeyStoreException("simulated aliases() fault")
        val repo = TestRepo(InMemoryKeyPairInfoSource(), ks)

        try {
            repo.getAllBcscKeyPairInfos()
            fail("expected getAllBcscKeyPairInfos to throw, not return an empty list")
        } catch (e: BcscException) {
            assertTrue(e.cause is KeyStoreException)
        }
    }

    @Test
    fun `getAllBcscKeyPairInfos lists every rsa alias with createdAt 0 for untracked ones`() {
        val infoSource = InMemoryKeyPairInfoSource(mapOf("rsa1" to KeyPairInfo("rsa1", 1_000L)))
        val repo = TestRepo(infoSource, keyStoreWithAliases(setOf("rsa1", "rsa3", "legacy")))

        val infos = repo.getAllBcscKeyPairInfos().associate { it.alias to it.createdAt }

        assertEquals(mapOf("rsa1" to 1_000L, "rsa3" to 0L), infos)
    }

    // MARK: - sanity: the tracked/normal case is unchanged

    @Test
    fun `an alias with existing metadata returns it unchanged`() {
        val info = KeyPairInfo("rsa1", 1_000L)
        val infoSource = InMemoryKeyPairInfoSource(mapOf("rsa1" to info))
        val repo = TestRepo(infoSource, keyStoreWithAliases(setOf("rsa1")))

        val result = repo.getBcscKeyPair("rsa1")

        assertSame("existing metadata must be returned as-is, not replaced", info, result?.keyInfo)
        assertEquals(1, infoSource.store.size)
    }
}
