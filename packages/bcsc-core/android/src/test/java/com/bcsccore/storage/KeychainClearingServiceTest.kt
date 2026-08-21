package com.bcsccore.storage

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.security.KeyStore
import java.util.Collections

/**
 * Covers KeychainClearingService, the Android counterpart to
 * KeychainClearingService.swift's clearAll() — deletes every AndroidKeyStore alias belonging to this app
 */
@RunWith(RobolectricTestRunner::class)
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
}
