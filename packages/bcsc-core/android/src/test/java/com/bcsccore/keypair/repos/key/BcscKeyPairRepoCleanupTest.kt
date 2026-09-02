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
import java.security.KeyStore
import java.security.KeyStoreException

/**
 * Verifies [BcscKeyPairRepo.getNewBcscKeyPair]'s post-generation cleanup: a failure after the
 * keystore entry exists must best-effort delete it (and any persisted metadata row) before
 * rethrowing, or the orphaned alias strands signing or collides with the next rotation.
 */
@RunWith(RobolectricTestRunner::class)
class BcscKeyPairRepoCleanupTest {
    companion object {
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
     * Robolectric can't exercise the real "AndroidKeyStore" provider (`NoSuchAlgorithmException`),
     * so this substitutes controllable fakes: [generateKeyPair] is a no-op (behavior under test
     * starts after generation) and [getKeyPair] delegates to [getKeyPairResult].
     */
    private class TestableBcscKeyPairRepo(
        infoSource: KeyPairInfoSource,
        val fakeKeyStore: KeyStore,
        private val getKeyPairResult: () -> KeyPair,
    ) : BcscKeyPairRepo(infoSource) {
        override fun loadAndroidKeyStore(): KeyStore = fakeKeyStore

        override fun generateKeyPair(alias: String) {
            // No-op: pretends generation succeeded. Pre-generation failures are out of scope here.
        }

        override fun getKeyPair(
            keyStore: KeyStore,
            kid: String,
        ): KeyPair = getKeyPairResult()
    }

    private fun mockKeyStore(): KeyStore = mockk(relaxed = true)

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
        val repo = TestableBcscKeyPairRepo(infoSource, keyStore) { KeyPairRepoTestFixtures.RSA_KEY_PAIR }

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
        val repo = TestableBcscKeyPairRepo(infoSource, keyStore) { KeyPairRepoTestFixtures.RSA_KEY_PAIR }

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

        // Unlike the saveKeyPairInfo-failure case, saveKeyPairInfo already succeeded by the time
        // getKeyPair runs here, so both the keystore entry AND the metadata row must be cleaned up.
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
