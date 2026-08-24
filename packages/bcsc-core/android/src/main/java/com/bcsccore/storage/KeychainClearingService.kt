package com.bcsccore.storage

import android.content.Context
import android.util.Log
import com.bcsccore.BuildConfig
import java.security.KeyStore
import java.util.Collections

/**
 * Wipes every AndroidKeyStore alias this app has created
 */
class KeychainClearingService(
    private val context: Context,
    // Overridable for tests — production always loads the real AndroidKeyStore.
    private val keyStoreSupplier: () -> KeyStore = {
        KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }
    },
) {
    companion object {
        private const val TAG = "KeychainClearingService"
        private const val ANDROID_KEY_STORE = "AndroidKeyStore"
        private val LEGACY_PREFS_NAMES = listOf("bcsc_pin_secrets", "bcsc_keypair_info")
    }

    fun clearAll() {
        clearKeyStoreEntries()
        clearLegacyPrefs()
    }

    private fun clearKeyStoreEntries() {
        try {
            val keyStore = keyStoreSupplier()

            val aliases = Collections.list(keyStore.aliases())
            if (BuildConfig.DEBUG) {
                Log.d(TAG, "clearKeyStoreEntries: ${aliases.size} AndroidKeyStore alias(es) before clear")
            }

            for (alias in aliases) {
                try {
                    keyStore.deleteEntry(alias)
                } catch (e: Exception) {
                    Log.w(TAG, "clearKeyStoreEntries: failed to delete alias '$alias': ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "clearKeyStoreEntries: failed to access AndroidKeyStore: ${e.message}", e)
        }
    }

    private fun clearLegacyPrefs() {
        for (prefsName in LEGACY_PREFS_NAMES) {
            try {
                val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "clearLegacyPrefs: '$prefsName' has ${prefs.all.size} entries before clear")
                }
                prefs.edit().clear().apply()
            } catch (e: Exception) {
                Log.w(TAG, "clearLegacyPrefs: failed to clear '$prefsName': ${e.message}")
            }
        }
    }
}
