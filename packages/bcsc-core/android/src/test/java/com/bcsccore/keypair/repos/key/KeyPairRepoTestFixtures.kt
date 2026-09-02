package com.bcsccore.keypair.repos.key

import com.bcsccore.keypair.core.interfaces.KeyPairInfoSource
import com.bcsccore.keypair.core.models.KeyPairInfo
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.util.HashMap

/**
 * Lightweight in-memory stand-in for SharedPreferences-backed [KeyPairInfoSource], shared by the
 * BcscKeyPairRepo*Test suites. `open` so [BcscKeyPairRepoCleanupTest]'s `ThrowingSaveInfoSource`
 * (and its anonymous `deleteKeyPairInfo`-throwing subclass) can override individual methods.
 */
internal open class InMemoryKeyPairInfoSource(
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
 * Shared RSA key pair fixtures for the BcscKeyPairRepo*Test suites. An `object`, not a top-level
 * `val`, to sidestep ktlint's property-naming rule for a file-level constant.
 */
internal object KeyPairRepoTestFixtures {
    // 2048-bit: key size doesn't affect the logic under test in these suites and keeps
    // generation overhead down. Hoisted so generation happens once per test run.
    val RSA_KEY_PAIR: KeyPair by lazy {
        KeyPairGenerator.getInstance("RSA").also { it.initialize(2048) }.generateKeyPair()
    }
}
