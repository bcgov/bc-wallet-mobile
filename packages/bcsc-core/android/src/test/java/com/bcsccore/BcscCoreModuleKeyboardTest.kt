package com.bcsccore

import android.content.ContentResolver
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.ServiceInfo
import android.provider.Settings
import android.util.Log
import android.view.inputmethod.InputMethodInfo
import android.view.inputmethod.InputMethodManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import org.junit.After
import org.junit.Before
import org.junit.Test

class BcscCoreModuleKeyboardTest {

    private lateinit var mockReactContext: ReactApplicationContext
    private lateinit var mockContentResolver: ContentResolver
    private lateinit var mockImm: InputMethodManager
    private lateinit var mockPromise: Promise
    private lateinit var module: BcscCoreModule

    @Before
    fun setUp() {
        mockReactContext = mockk(relaxed = true)
        mockContentResolver = mockk(relaxed = true)
        mockImm = mockk(relaxed = true)
        mockPromise = mockk(relaxed = true)

        every { mockReactContext.contentResolver } returns mockContentResolver
        every { mockReactContext.getSystemService(Context.INPUT_METHOD_SERVICE) } returns mockImm

        mockkStatic(Settings.Secure::class)
        mockkStatic(Log::class)
        every { Log.e(any(), any(), any()) } returns 0

        module = BcscCoreModule(mockReactContext)
    }

    @After
    fun tearDown() {
        unmockkStatic(Settings.Secure::class)
        unmockkStatic(Log::class)
    }

    private fun createInputMethodInfo(
        id: String,
        isSystemApp: Boolean,
    ): InputMethodInfo {
        val appInfo = ApplicationInfo().apply {
            flags = if (isSystemApp) ApplicationInfo.FLAG_SYSTEM else 0
        }
        val serviceInfo = ServiceInfo().apply {
            applicationInfo = appInfo
        }
        val imi = mockk<InputMethodInfo>()
        every { imi.id } returns id
        every { imi.serviceInfo } returns serviceInfo
        return imi
    }

    // MARK: - System keyboard detection

    @Test
    fun `resolves false for stock Android keyboard`() {
        val gboard = createInputMethodInfo("com.google.android.inputmethod.latin/.LatinIME", isSystemApp = true)
        every { mockImm.enabledInputMethodList } returns listOf(gboard)
        every {
            Settings.Secure.getString(mockContentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
        } returns "com.google.android.inputmethod.latin/.LatinIME"

        module.isThirdPartyKeyboardActive(mockPromise)

        verify { mockPromise.resolve(false) }
    }

    @Test
    fun `resolves false for Samsung keyboard`() {
        val samsung = createInputMethodInfo("com.samsung.android.honeyboard/.HoneyBoardService", isSystemApp = true)
        every { mockImm.enabledInputMethodList } returns listOf(samsung)
        every {
            Settings.Secure.getString(mockContentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
        } returns "com.samsung.android.honeyboard/.HoneyBoardService"

        module.isThirdPartyKeyboardActive(mockPromise)

        verify { mockPromise.resolve(false) }
    }

    @Test
    fun `resolves false for older Samsung keyboard`() {
        val samsung = createInputMethodInfo("com.sec.android.inputmethod/.SamsungIME", isSystemApp = true)
        every { mockImm.enabledInputMethodList } returns listOf(samsung)
        every {
            Settings.Secure.getString(mockContentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
        } returns "com.sec.android.inputmethod/.SamsungIME"

        module.isThirdPartyKeyboardActive(mockPromise)

        verify { mockPromise.resolve(false) }
    }

    // MARK: - Third-party keyboard detection

    @Test
    fun `resolves true for user-installed third-party keyboard`() {
        val swiftkey = createInputMethodInfo("com.touchtype.swiftkey/.SwiftkeyIME", isSystemApp = false)
        every { mockImm.enabledInputMethodList } returns listOf(swiftkey)
        every {
            Settings.Secure.getString(mockContentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
        } returns "com.touchtype.swiftkey/.SwiftkeyIME"

        module.isThirdPartyKeyboardActive(mockPromise)

        verify { mockPromise.resolve(true) }
    }

    @Test
    fun `resolves true when third-party keyboard is active among multiple enabled`() {
        val gboard = createInputMethodInfo("com.google.android.inputmethod.latin/.LatinIME", isSystemApp = true)
        val swiftkey = createInputMethodInfo("com.touchtype.swiftkey/.SwiftkeyIME", isSystemApp = false)
        every { mockImm.enabledInputMethodList } returns listOf(gboard, swiftkey)
        every {
            Settings.Secure.getString(mockContentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
        } returns "com.touchtype.swiftkey/.SwiftkeyIME"

        module.isThirdPartyKeyboardActive(mockPromise)

        verify { mockPromise.resolve(true) }
    }

    @Test
    fun `resolves false when system keyboard is active among multiple enabled`() {
        val gboard = createInputMethodInfo("com.google.android.inputmethod.latin/.LatinIME", isSystemApp = true)
        val swiftkey = createInputMethodInfo("com.touchtype.swiftkey/.SwiftkeyIME", isSystemApp = false)
        every { mockImm.enabledInputMethodList } returns listOf(gboard, swiftkey)
        every {
            Settings.Secure.getString(mockContentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
        } returns "com.google.android.inputmethod.latin/.LatinIME"

        module.isThirdPartyKeyboardActive(mockPromise)

        verify { mockPromise.resolve(false) }
    }

    // MARK: - Edge cases

    @Test
    fun `resolves false when InputMethodManager is null`() {
        every { mockReactContext.getSystemService(Context.INPUT_METHOD_SERVICE) } returns null

        module.isThirdPartyKeyboardActive(mockPromise)

        verify { mockPromise.resolve(false) }
    }

    @Test
    fun `resolves false when no enabled input methods match the default`() {
        val gboard = createInputMethodInfo("com.google.android.inputmethod.latin/.LatinIME", isSystemApp = true)
        every { mockImm.enabledInputMethodList } returns listOf(gboard)
        every {
            Settings.Secure.getString(mockContentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
        } returns "com.unknown.keyboard/.UnknownIME"

        module.isThirdPartyKeyboardActive(mockPromise)

        verify { mockPromise.resolve(false) }
    }

    @Test
    fun `resolves false when enabled input method list is empty`() {
        every { mockImm.enabledInputMethodList } returns emptyList()
        every {
            Settings.Secure.getString(mockContentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
        } returns "com.google.android.inputmethod.latin/.LatinIME"

        module.isThirdPartyKeyboardActive(mockPromise)

        verify { mockPromise.resolve(false) }
    }

    @Test
    fun `resolves false when an exception is thrown`() {
        every { mockImm.enabledInputMethodList } throws RuntimeException("service unavailable")
        every {
            Settings.Secure.getString(mockContentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
        } returns "com.google.android.inputmethod.latin/.LatinIME"

        module.isThirdPartyKeyboardActive(mockPromise)

        verify { mockPromise.resolve(false) }
    }
}
