package com.bcsccore.keypair.repos.key

import com.bcsccore.keypair.core.exceptions.AlertKey
import com.bcsccore.keypair.core.exceptions.BcscException
import com.bcsccore.keypair.core.interfaces.KeyPairInfoSource
import com.bcsccore.keypair.core.models.KeyPairInfo
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.KeyStoreException
import java.util.HashMap

/**
 * Verifies the post-generation cleanup safety behavior in
 * [BcscKeyPairRepo.getNewBcscKeyPair] (issue #3876 review): if anything fails AFTER
 * `generateKeyPair()` has actually created a keystore entry, that entry (and any metadata row
 * already persisted for it) must be best-effort deleted before the original exception
 * propagates — otherwise the orphaned/untracked alias would strand the device signing with an
 * unregistered key, or collide with the next rotation attempt.
 *
 * Robolectric cannot exercise the real "AndroidKeyStore" provider (confirmed empirically —
 * `KeyPairGenerator.getInstance(..., "AndroidKeyStore")` throws `NoSuchAlgorithmException` under
 * this project's Robolectric setup), so [TestableBcscKeyPairRepo] substitutes a mocked
 * [KeyStore] and controllable fakes for `generateKeyPair`/`getKeyPair` — the three methods were
 * widened from `private` to `protected` specifically to allow this.
 */
@RunWith(RobolectricTestRunner::class)
class BcscKeyPairRepoCleanupTest {
    companion object {
        private val FAKE_KEY_PAIR: KeyPair by lazy {
            KeyPairGenerator.getInstance("RSA").also { it.initialize(2048) }.generateKeyPair()
        }

        /** True if [target] appears anywhere in [thrown]'s cause chain (including itself). */
        private fun causeChainContains(
            thrown: Throwable?,
            target: Throwable?,
        ): Boolean {
            var cause = thrown
            while (cause != null) {
                if (cause === target) return true
                cause = cause.cause
            }
            return false
        }
    }

    // Lightweight in-memory stand-in for SharedPreferences-backed KeyPairInfoSource, matching
    // the one in BcscKeyPairRepoSeedingTest (duplicated locally to keep this file self-contained
    // and focused on cleanup behavior rather than seeding).
    private open class InMemoryKeyPairInfoSource(
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

    /** Throws a (captured, for identity assertions) [BcscException] from saveKeyPairInfo when the alias matches. */
    private class ThrowingSaveInfoSource(
        initial: Map<String, KeyPairInfo>,
        private val throwOnSaveAlias: String,
    ) : InMemoryKeyPairInfoSource(initial) {
        var lastThrown: BcscException? = null
            private set

        override fun saveKeyPairInfo(info: KeyPairInfo) {
            if (info.alias == throwOnSaveAlias) {
                val error = BcscException(AlertKey.GENERAL, "simulated saveKeyPairInfo failure for '$throwOnSaveAlias'")
                lastThrown = error
                throw error
            }
            super.saveKeyPairInfo(info)
        }
    }

    /**
     * Test subclass substituting Robolectric-incompatible native Android Keystore calls with
     * controllable fakes. [generateKeyPair] is a no-op (pretends generation succeeded — the
     * behavior under test starts AFTER generation), and [getKeyPair] delegates to
     * [getKeyPairResult] so each test can choose success or failure.
     */
    private class TestableBcscKeyPairRepo(
        infoSource: KeyPairInfoSource,
        val fakeKeyStore: KeyStore,
        private val getKeyPairResult: () -> KeyPair,
    ) : BcscKeyPairRepo(infoSource) {
        override fun loadAndroidKeyStore(): KeyStore = fakeKeyStore

        override fun generateKeyPair(alias: String) {
            // No-op: pretends the native key was generated. The real method's own failure modes
            // (before any keystore entry exists) are out of scope here — see BcscCore.swift's
            // and BcscCoreModule.kt's equivalent pre-generation paths, which correctly have no
            // cleanup because nothing exists yet to clean up.
        }

        override fun getKeyPair(
            keyStore: KeyStore,
            kid: String,
        ): KeyPair = getKeyPairResult()
    }

    private fun mockKeyStore(): KeyStore = mockk(relaxed = true)

    // -----------------------------------------------------------------------
    // saveKeyPairInfo throws -> keystore entry deleted -> original exception propagates
    // -----------------------------------------------------------------------

    @Test
    fun `saveKeyPairInfo failure deletes the just-generated keystore entry and rethrows the original exception`() {
        // Seed with an existing rsa1 so reconcile() short-circuits (metadata non-empty) and the
        // only saveKeyPairInfo call reached is the one for the NEW alias ("rsa2") we want to fail.
        val infoSource =
            ThrowingSaveInfoSource(
                initial = mapOf("rsa1" to KeyPairInfo("rsa1", System.currentTimeMillis())),
                throwOnSaveAlias = "rsa2",
            )
        val keyStore = mockKeyStore()
        val repo = TestableBcscKeyPairRepo(infoSource, keyStore) { FAKE_KEY_PAIR }

        val thrown =
            try {
                repo.getNewBcscKeyPair()
                fail("getNewBcscKeyPair() must propagate the saveKeyPairInfo failure")
                null
            } catch (e: Exception) {
                e
            }

        assertTrue(
            "the original saveKeyPairInfo exception must survive in the cause chain, not be swallowed",
            causeChainContains(thrown, infoSource.lastThrown),
        )
        verify(exactly = 1) { keyStore.deleteEntry("rsa2") }
        assertFalse(
            "the failed alias must never end up persisted in metadata",
            infoSource.store.containsKey("rsa2"),
        )
        assertTrue("the pre-existing rsa1 entry must be untouched", infoSource.store.containsKey("rsa1"))
    }

    @Test
    fun `saveKeyPairInfo failure cleanup does not mask the original exception even if delete itself fails`() {
        val infoSource =
            ThrowingSaveInfoSource(
                initial = mapOf("rsa1" to KeyPairInfo("rsa1", System.currentTimeMillis())),
                throwOnSaveAlias = "rsa2",
            )
        val keyStore = mockKeyStore()
        every { keyStore.deleteEntry(any()) } throws KeyStoreException("delete also failed")
        val repo = TestableBcscKeyPairRepo(infoSource, keyStore) { FAKE_KEY_PAIR }

        val thrown =
            try {
                repo.getNewBcscKeyPair()
                fail("getNewBcscKeyPair() must still propagate the ORIGINAL saveKeyPairInfo failure")
                null
            } catch (e: Exception) {
                e
            }

        assertTrue(
            "the cleanup failure must not replace the original exception",
            causeChainContains(thrown, infoSource.lastThrown),
        )
    }

    // -----------------------------------------------------------------------
    // getKeyPair throws post-save -> keystore entry AND metadata row both cleaned up
    // -----------------------------------------------------------------------

    @Test
    fun `getKeyPair failure after a successful save deletes both the keystore entry and the metadata row`() {
        val infoSource =
            InMemoryKeyPairInfoSource(
                initial = mapOf("rsa1" to KeyPairInfo("rsa1", System.currentTimeMillis())),
            )
        val keyStore = mockKeyStore()
        val retrievalError = KeyStoreException("simulated getKeyPair failure")
        val repo =
            TestableBcscKeyPairRepo(infoSource, keyStore) {
                throw retrievalError
            }

        val thrown =
            try {
                repo.getNewBcscKeyPair()
                fail("getNewBcscKeyPair() must propagate the getKeyPair failure")
                null
            } catch (e: Exception) {
                e
            }

        assertTrue(
            "the original getKeyPair exception must survive in the cause chain",
            causeChainContains(thrown, retrievalError),
        )

        // Both the keystore entry AND the now-orphaned metadata row must be cleaned up — this is
        // the fix (#3876 review, comment 2): the saveKeyPairInfo-failure branch only has a
        // keystore entry to clean up, but by the time getKeyPair runs, saveKeyPairInfo already
        // succeeded, so BOTH must go.
        verify(exactly = 1) { keyStore.deleteEntry("rsa2") }
        assertFalse(
            "the orphaned metadata row for the unretrievable key must be deleted",
            infoSource.store.containsKey("rsa2"),
        )
        assertTrue("the pre-existing rsa1 entry must be untouched", infoSource.store.containsKey("rsa1"))
    }

    @Test
    fun `getKeyPair failure cleanup does not mask the original exception even if both cleanups themselves fail`() {
        val infoSource =
            object : InMemoryKeyPairInfoSource(
                initial = mapOf("rsa1" to KeyPairInfo("rsa1", System.currentTimeMillis())),
            ) {
                override fun deleteKeyPairInfo(alias: String): Unit =
                    throw BcscException(AlertKey.GENERAL, "simulated metadata cleanup failure")
            }
        val keyStore = mockKeyStore()
        every { keyStore.deleteEntry(any()) } throws KeyStoreException("simulated keystore cleanup failure")
        val retrievalError = KeyStoreException("simulated getKeyPair failure")
        val repo =
            TestableBcscKeyPairRepo(infoSource, keyStore) {
                throw retrievalError
            }

        val thrown =
            try {
                repo.getNewBcscKeyPair()
                fail("getNewBcscKeyPair() must still propagate the ORIGINAL getKeyPair failure")
                null
            } catch (e: Exception) {
                e
            }

        assertTrue(
            "the original exception must survive even when BOTH best-effort cleanups themselves fail",
            causeChainContains(thrown, retrievalError),
        )
    }
}
