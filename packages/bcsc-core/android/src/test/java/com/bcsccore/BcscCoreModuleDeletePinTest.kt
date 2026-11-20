package com.bcsccore

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.io.File

/**
 * deletePIN removes the alias's whole PIN prefs file through the real PinService and PIN storage. Robolectric has no
 * AndroidKeyStore, so the file is plain prefs; the module's context delegates prefs calls to the test application.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class BcscCoreModuleDeletePinTest {
    private val app = RuntimeEnvironment.getApplication()
    private lateinit var module: BcscCoreModule

    private val issuer = "https://idsit.gov.bc.ca/device/"
    private val uuid = "123e4567-e89b-42d3-a456-426614174000"
    private val fileName = "https:idsit.gov.bc.cadevice.$uuid"

    @Before
    fun setUp() {
        val context = mockk<ReactApplicationContext>(relaxed = true)
        every { context.dataDir } returns app.dataDir
        every { context.getSharedPreferences(any(), any()) } answers {
            app.getSharedPreferences(firstArg(), secondArg())
        }
        every { context.deleteSharedPreferences(any()) } answers { app.deleteSharedPreferences(firstArg()) }
        module = BcscCoreModule(context)
    }

    private fun prefsFile(name: String) = File(app.dataDir, "shared_prefs/$name.xml")

    @Test
    fun `deletePIN deletes the alias prefs file and leaves other accounts' files`() {
        val otherFileName = "https:idsit.gov.bc.cadevice.0f8fad5b-d9cb-469f-a165-70867728950e"
        listOf(fileName, otherFileName).forEach {
            app
                .getSharedPreferences(it, Context.MODE_PRIVATE)
                .edit()
                .putString("x", "y")
                .commit()
        }
        val promise = mockk<Promise>(relaxed = true)

        module.deletePIN(uuid, issuer, promise)

        verify(exactly = 1) { promise.resolve(true) }
        assertFalse(prefsFile(fileName).exists())
        assertTrue(prefsFile(otherFileName).exists())
    }

    @Test
    fun `deletePIN succeeds when no PIN is stored`() {
        val promise = mockk<Promise>(relaxed = true)

        module.deletePIN(uuid, issuer, promise)

        verify(exactly = 1) { promise.resolve(true) }
        assertFalse(prefsFile(fileName).exists())
    }
}
