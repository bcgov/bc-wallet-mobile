package com.bcsccore.storage

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

/**
 * PIN storage files are EncryptedSharedPreferences named after the alias with "/" removed. Robolectric has no
 * AndroidKeyStore, so these files are plain prefs holding the keyset entry EncryptedSharedPreferences writes.
 * API 34: deleting prefs files needs API 24, the module's minSdk.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class NativeCompatiblePinStorageDeleteTest {
    private lateinit var context: Context
    private lateinit var storage: NativeCompatiblePinStorage

    private val keysetKey = "__androidx_security_crypto_encrypted_prefs_key_keyset__"
    private val issuer = "https://idsit.gov.bc.ca/device/"
    private val uuid = "123e4567-e89b-42d3-a456-426614174000"
    private val otherUuid = "0f8fad5b-d9cb-469f-a165-70867728950e"

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        storage = NativeCompatiblePinStorage(context)
    }

    private fun prefsFile(name: String) = File(context.dataDir, "shared_prefs/$name.xml")

    private fun writePrefs(
        name: String,
        vararg keys: String,
    ) {
        val editor = context.getSharedPreferences(name, Context.MODE_PRIVATE).edit()
        keys.forEach { editor.putString(it, "value") }
        editor.commit()
        assertTrue("precondition: $name written", prefsFile(name).exists())
    }

    private fun writePinPrefs(alias: String) =
        writePrefs(NativeCompatiblePinStorage.prefsFileName(alias), keysetKey, "$alias.key", "$alias.salt")

    @Test
    fun `prefs file name is the alias without slashes`() {
        assertEquals("https:idsit.gov.bc.cadevice.$uuid", NativeCompatiblePinStorage.prefsFileName("$issuer.$uuid"))
    }

    @Test
    fun `removePin deletes the alias prefs file even when its entries can't be decrypted`() {
        writePinPrefs("$issuer.$uuid")
        writePinPrefs("$issuer.$otherUuid")

        // No keystore here, so the entries can't be removed; the file still goes
        assertFalse(storage.removePin("$issuer.$uuid"))

        assertFalse(prefsFile(NativeCompatiblePinStorage.prefsFileName("$issuer.$uuid")).exists())
        assertTrue(prefsFile(NativeCompatiblePinStorage.prefsFileName("$issuer.$otherUuid")).exists())
    }

    @Test
    fun `removePin with no PIN stored completes without creating a file`() {
        storage.removePin("$issuer.$uuid")

        assertFalse(prefsFile(NativeCompatiblePinStorage.prefsFileName("$issuer.$uuid")).exists())
    }

    @Test
    fun `deleteAllPinPrefsFiles deletes PIN files only`() {
        val pinAliases =
            listOf("$issuer.$uuid", "https://id.gov.bc.ca/device/.$otherUuid", ".$uuid", "http://localhost:8080/.$uuid")
        pinAliases.forEach { writePinPrefs(it) }

        val kept =
            listOf(
                // Alias-shaped names without an EncryptedSharedPreferences keyset
                "https:idsit.gov.bc.cadevice.$otherUuid" to arrayOf("$issuer.$otherUuid.key"),
                // Another library's EncryptedSharedPreferences
                "some_library_secure_prefs" to arrayOf(keysetKey),
                // Keyset present but not an alias: no "." before the UUID, or no UUID
                uuid to arrayOf(keysetKey),
                "https:idsit.gov.bc.cadevice.not-a-uuid" to arrayOf(keysetKey),
                // bcsc-core's own non-PIN prefs
                "com.bcsccore.test.PREFERENCE_FILE_KEY_$uuid" to arrayOf("is_email_verified"),
                "bcsc_pin_secrets" to arrayOf("$issuer.${uuid}_key"),
                "bcsc_keypair_info" to arrayOf("rsa1"),
            )
        kept.forEach { (name, keys) -> writePrefs(name, *keys) }

        assertEquals(pinAliases.size, storage.deleteAllPinPrefsFiles())

        pinAliases.forEach {
            assertFalse(
                "$it deleted",
                prefsFile(NativeCompatiblePinStorage.prefsFileName(it)).exists(),
            )
        }
        kept.forEach { (name, _) -> assertTrue("$name kept", prefsFile(name).exists()) }
    }

    @Test
    fun `deleteAllPinPrefsFiles with no prefs directory deletes nothing`() {
        File(context.dataDir, "shared_prefs").deleteRecursively()

        assertEquals(0, storage.deleteAllPinPrefsFiles())
    }
}
