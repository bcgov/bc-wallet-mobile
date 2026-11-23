package com.bcsccore.storage

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File
import java.security.KeyStore
import java.util.Collections

/**
 * Covers KeychainClearingService, the Android counterpart to
 * KeychainClearingService.swift's clearAll() — deletes every AndroidKeyStore alias belonging to this app
 * API 34: deleting PIN prefs files needs API 24, the module's minSdk.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class KeychainClearingServiceTest {
    private fun keyStoreWith(aliases: List<String>): KeyStore {
        val ks = mockk<KeyStore>(relaxed = true)
        every { ks.aliases() } returns Collections.enumeration(aliases)
        return ks
    }

    @Test
    fun `clearAll deletes every keystore alias`() {
        val keyStore = keyStoreWith(listOf("rsa1", "rsa2", "enc1"))
        val context = ApplicationProvider.getApplicationContext<Context>()
        val service = KeychainClearingService(context, keyStoreSupplier = { keyStore })

        service.clearAll()

        verify(exactly = 1) { keyStore.deleteEntry("rsa1") }
        verify(exactly = 1) { keyStore.deleteEntry("rsa2") }
        verify(exactly = 1) { keyStore.deleteEntry("enc1") }
    }

    @Test
    fun `clearAll clears legacy pin and keypair-info prefs`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        context
            .getSharedPreferences("bcsc_pin_secrets", Context.MODE_PRIVATE)
            .edit()
            .putString("some.alias_key", "secret")
            .commit()
        context
            .getSharedPreferences("bcsc_keypair_info", Context.MODE_PRIVATE)
            .edit()
            .putString("rsa1", "{}")
            .commit()

        val service = KeychainClearingService(context, keyStoreSupplier = { keyStoreWith(emptyList()) })

        service.clearAll()

        assertEquals(0, context.getSharedPreferences("bcsc_pin_secrets", Context.MODE_PRIVATE).all.size)
        assertEquals(0, context.getSharedPreferences("bcsc_keypair_info", Context.MODE_PRIVATE).all.size)
    }

    @Test
    fun `clearAll continues past a single alias delete failure`() {
        val keyStore = keyStoreWith(listOf("rsa1", "rsa2"))
        every { keyStore.deleteEntry("rsa1") } throws RuntimeException("boom")
        val context = ApplicationProvider.getApplicationContext<Context>()
        val service = KeychainClearingService(context, keyStoreSupplier = { keyStore })

        service.clearAll()

        verify(exactly = 1) { keyStore.deleteEntry("rsa2") }
    }

    @Test
    fun `clearAll deletes PIN prefs files, including ones under an empty issuer, and keeps other prefs files`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val keysetKey = "__androidx_security_crypto_encrypted_prefs_key_keyset__"
        val uuid = "123e4567-e89b-42d3-a456-426614174000"
        val pinFiles = listOf("https:idsit.gov.bc.cadevice.$uuid", ".$uuid")
        val otherFiles = listOf("some_library_secure_prefs", "com.bcsccore.test.PREFERENCE_FILE_KEY_$uuid")
        (pinFiles + otherFiles).forEach {
            context
                .getSharedPreferences(it, Context.MODE_PRIVATE)
                .edit()
                .putString(keysetKey, "keyset")
                .commit()
        }

        fun prefsFile(name: String) = File(context.dataDir, "shared_prefs/$name.xml")

        KeychainClearingService(context, keyStoreSupplier = { keyStoreWith(emptyList()) }).clearAll()

        pinFiles.forEach { assertFalse("$it deleted", prefsFile(it).exists()) }
        otherFiles.forEach { assertTrue("$it kept", prefsFile(it).exists()) }
    }
}
