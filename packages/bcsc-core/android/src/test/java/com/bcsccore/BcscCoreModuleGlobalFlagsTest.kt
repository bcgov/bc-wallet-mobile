package com.bcsccore

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.slot
import io.mockk.unmockkStatic
import io.mockk.verify
import org.junit.After
import org.junit.Before
import org.junit.Test

class BcscCoreModuleGlobalFlagsTest {
    private lateinit var mockReactContext: ReactApplicationContext
    private lateinit var mockSharedPrefs: SharedPreferences
    private lateinit var mockEditor: SharedPreferences.Editor
    private lateinit var mockPromise: Promise
    private lateinit var module: BcscCoreModule

    @Before
    fun setUp() {
        mockReactContext = mockk(relaxed = true)
        mockSharedPrefs = mockk(relaxed = true)
        mockEditor = mockk(relaxed = true)
        mockPromise = mockk(relaxed = true)

        every {
            mockReactContext.getSharedPreferences(
                "ca.bc.gov.id.servicescard.PREFERENCE_FILE_KEY",
                Context.MODE_PRIVATE,
            )
        } returns mockSharedPrefs

        every { mockSharedPrefs.edit() } returns mockEditor
        every { mockEditor.putBoolean(any(), any()) } returns mockEditor
        every { mockEditor.apply() } returns Unit

        mockkStatic(Log::class)
        every { Log.d(any(), any()) } returns 0
        every { Log.e(any(), any(), any()) } returns 0

        mockkStatic(Arguments::class)
        every { Arguments.createMap() } returns JavaOnlyMap()

        module = BcscCoreModule(mockReactContext)
    }

    @After
    fun tearDown() {
        unmockkStatic(Log::class)
        unmockkStatic(Arguments::class)
    }

    // MARK: - getAndroidGlobalFlags

    @Test
    fun `getAndroidGlobalFlags returns flag when present`() {
        every { mockSharedPrefs.contains("device_auth_never_show_again") } returns true
        every { mockSharedPrefs.getBoolean("device_auth_never_show_again", false) } returns true

        module.getAndroidGlobalFlags(mockPromise)

        val mapSlot = slot<JavaOnlyMap>()
        verify { mockPromise.resolve(capture(mapSlot)) }
        val result = mapSlot.captured
        assert(result.getBoolean("notShowDeviceAuthenticationPrepAgain"))
    }

    @Test
    fun `getAndroidGlobalFlags returns empty map when flag absent`() {
        every { mockSharedPrefs.contains("device_auth_never_show_again") } returns false

        module.getAndroidGlobalFlags(mockPromise)

        val mapSlot = slot<JavaOnlyMap>()
        verify { mockPromise.resolve(capture(mapSlot)) }
        val result = mapSlot.captured
        assert(!result.hasKey("notShowDeviceAuthenticationPrepAgain"))
    }

    @Test
    fun `getAndroidGlobalFlags returns false flag value`() {
        every { mockSharedPrefs.contains("device_auth_never_show_again") } returns true
        every { mockSharedPrefs.getBoolean("device_auth_never_show_again", false) } returns false

        module.getAndroidGlobalFlags(mockPromise)

        val mapSlot = slot<JavaOnlyMap>()
        verify { mockPromise.resolve(capture(mapSlot)) }
        val result = mapSlot.captured
        assert(!result.getBoolean("notShowDeviceAuthenticationPrepAgain"))
    }

    @Test
    fun `getAndroidGlobalFlags reads from correct SharedPreferences file`() {
        every { mockSharedPrefs.contains("device_auth_never_show_again") } returns false

        module.getAndroidGlobalFlags(mockPromise)

        verify {
            mockReactContext.getSharedPreferences(
                "ca.bc.gov.id.servicescard.PREFERENCE_FILE_KEY",
                Context.MODE_PRIVATE,
            )
        }
    }

    // MARK: - setAndroidGlobalFlags

    @Test
    fun `setAndroidGlobalFlags writes flag to SharedPreferences`() {
        val flags = JavaOnlyMap()
        flags.putBoolean("notShowDeviceAuthenticationPrepAgain", true)

        module.setAndroidGlobalFlags(flags, mockPromise)

        verify { mockEditor.putBoolean("device_auth_never_show_again", true) }
        verify { mockEditor.apply() }
        verify { mockPromise.resolve(true) }
    }

    @Test
    fun `setAndroidGlobalFlags writes false value`() {
        val flags = JavaOnlyMap()
        flags.putBoolean("notShowDeviceAuthenticationPrepAgain", false)

        module.setAndroidGlobalFlags(flags, mockPromise)

        verify { mockEditor.putBoolean("device_auth_never_show_again", false) }
        verify { mockEditor.apply() }
        verify { mockPromise.resolve(true) }
    }

    @Test
    fun `setAndroidGlobalFlags ignores unknown keys`() {
        val flags = JavaOnlyMap()
        flags.putString("unknownKey", "unknownValue")

        module.setAndroidGlobalFlags(flags, mockPromise)

        verify(exactly = 0) { mockEditor.putBoolean(any(), any()) }
        verify { mockEditor.apply() }
        verify { mockPromise.resolve(true) }
    }

    @Test
    fun `setAndroidGlobalFlags writes to correct SharedPreferences file`() {
        val flags = JavaOnlyMap()
        flags.putBoolean("notShowDeviceAuthenticationPrepAgain", true)

        module.setAndroidGlobalFlags(flags, mockPromise)

        verify {
            mockReactContext.getSharedPreferences(
                "ca.bc.gov.id.servicescard.PREFERENCE_FILE_KEY",
                Context.MODE_PRIVATE,
            )
        }
    }
}
