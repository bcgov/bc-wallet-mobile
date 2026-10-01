package com.bcsccore.authentication.device

import android.content.Intent
import android.util.Log
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import com.bcsccore.BcscCoreModule
import com.bcsccore.util.GuardedPromise
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
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class DeviceAuthenticationErrorMappingTest {
    private class FakeDeviceAuthenticationService(
        private val result: DeviceAuthenticationResult,
    ) : DeviceAuthenticationService {
        override fun canPerformDeviceAuthentication() = true

        override fun canPerformBiometricAuthentication() = true

        override fun getAvailableBiometricType() = BiometricType.FINGERPRINT

        override fun performDeviceAuthentication(
            activity: FragmentActivity,
            title: String,
            subtitle: String,
            callback: (DeviceAuthenticationResult) -> Unit,
        ) = callback(result)

        override fun createConfirmDeviceCredentialIntent(title: String): Intent? = null
    }

    private lateinit var mockReactContext: ReactApplicationContext
    private lateinit var mockActivity: FragmentActivity
    private lateinit var mockPromise: Promise

    @Before
    fun setUp() {
        mockReactContext = mockk(relaxed = true)
        mockActivity = mockk(relaxed = true)
        mockPromise = mockk(relaxed = true)
        every { mockReactContext.currentActivity } returns mockActivity

        mockkStatic(Log::class)
        every { Log.d(any<String>(), any<String>()) } returns 0
        every { Log.w(any<String>(), any<String>()) } returns 0
        every { Log.e(any<String>(), any<String>()) } returns 0
        every { Log.e(any<String>(), any<String>(), any()) } returns 0

        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }
    }

    @After
    fun tearDown() {
        unmockkStatic(Log::class)
        unmockkStatic(Arguments::class)
    }

    private fun moduleWith(result: DeviceAuthenticationResult) =
        BcscCoreModule(mockReactContext, deviceAuthenticationServiceOverride = FakeDeviceAuthenticationService(result))

    // MARK: - mapAuthenticationError

    @Test
    fun `user canceled and negative button map to Cancelled when device is unlocked`() {
        listOf(BiometricPrompt.ERROR_USER_CANCELED, BiometricPrompt.ERROR_NEGATIVE_BUTTON).forEach { code ->
            val result = mapAuthenticationError(code, "Canceled", deviceLocked = false)

            assertEquals(DeviceAuthenticationResult.Cancelled(code, "Canceled", false), result)
        }
    }

    @Test
    fun `user canceled while device is locked maps to Error`() {
        val result =
            mapAuthenticationError(BiometricPrompt.ERROR_USER_CANCELED, "Authentication canceled", deviceLocked = true)

        assertEquals(DeviceAuthenticationResult.Error(10, "Authentication canceled", true), result)
    }

    @Test
    fun `negative button stays Cancelled even when device is locked`() {
        val result = mapAuthenticationError(BiometricPrompt.ERROR_NEGATIVE_BUTTON, "Use PIN", deviceLocked = true)

        assertEquals(DeviceAuthenticationResult.Cancelled(13, "Use PIN", true), result)
    }

    @Test
    fun `canceled, lockout, permanent lockout and no biometrics map to Error keeping code and message`() {
        listOf(
            BiometricPrompt.ERROR_CANCELED,
            BiometricPrompt.ERROR_LOCKOUT,
            BiometricPrompt.ERROR_LOCKOUT_PERMANENT,
            BiometricPrompt.ERROR_NO_BIOMETRICS,
        ).forEach { code ->
            val result = mapAuthenticationError(code, "message $code", deviceLocked = false)

            assertEquals(DeviceAuthenticationResult.Error(code, "message $code", false), result)
        }
    }

    // MARK: - failure map

    @Test
    fun `failure map for a cancel carries reason, code, message and deviceLocked`() {
        val map =
            BcscCoreModule(
                mockReactContext,
            ).deviceAuthFailureMap("cancelled", 10, "Authentication canceled", false)

        assertFalse(map.getBoolean("success"))
        assertEquals("cancelled", map.getString("failureReason"))
        assertEquals(10, map.getInt("errorCode"))
        assertEquals("Authentication canceled", map.getString("errorMessage"))
        assertFalse(map.getBoolean("deviceLocked"))
    }

    @Test
    fun `failure map omits errorCode when there is none`() {
        val map = BcscCoreModule(mockReactContext).deviceAuthFailureMap("error", null, "Could not start prompt", false)

        assertFalse(map.hasKey("errorCode"))
        assertEquals("error", map.getString("failureReason"))
        assertEquals("Could not start prompt", map.getString("errorMessage"))
    }

    // MARK: - unlockWithDeviceSecurity bridge contract

    private fun unlock(result: DeviceAuthenticationResult) {
        moduleWith(
            result,
        ).runDeviceSecurityUnlock(mockActivity, "account-id", "title", "subtitle", GuardedPromise(mockPromise))
    }

    @Test
    fun `unlock resolves the complete failure payload for Cancelled`() {
        unlock(DeviceAuthenticationResult.Cancelled(10, "Authentication canceled", false))

        val captured = slot<JavaOnlyMap>()
        verify(exactly = 1) { mockPromise.resolve(capture(captured)) }
        assertFalse(captured.captured.getBoolean("success"))
        assertEquals("cancelled", captured.captured.getString("failureReason"))
        assertEquals(10, captured.captured.getInt("errorCode"))
        assertEquals("Authentication canceled", captured.captured.getString("errorMessage"))
        assertFalse(captured.captured.getBoolean("deviceLocked"))
    }

    @Test
    fun `unlock resolves the complete failure payload for Error`() {
        unlock(DeviceAuthenticationResult.Error(10, "Authentication canceled", true))

        val captured = slot<JavaOnlyMap>()
        verify(exactly = 1) { mockPromise.resolve(capture(captured)) }
        assertFalse(captured.captured.getBoolean("success"))
        assertEquals("error", captured.captured.getString("failureReason"))
        assertEquals(10, captured.captured.getInt("errorCode"))
        assertEquals("Authentication canceled", captured.captured.getString("errorMessage"))
        assertTrue(captured.captured.getBoolean("deviceLocked"))
    }

    @Test
    fun `unlock does not settle the promise on an intermediate failure`() {
        unlock(DeviceAuthenticationResult.Failed)

        verify(exactly = 0) { mockPromise.resolve(any()) }
        verify(exactly = 0) { mockPromise.reject(any<String>(), any<String>()) }
    }

    // MARK: - performDeviceAuthentication bridge contract

    @Test
    fun `performDeviceAuthentication rejects E_DEVICE_AUTH_CANCELLED for Cancelled`() {
        moduleWith(
            DeviceAuthenticationResult.Cancelled(13, "Use PIN", false),
        ).performDeviceAuthentication("reason", mockPromise)

        verify(exactly = 1) { mockPromise.reject("E_DEVICE_AUTH_CANCELLED", match<String> { it.contains("code=13") }) }
    }

    @Test
    fun `performDeviceAuthentication rejects E_DEVICE_AUTH_ERROR with the code for Error`() {
        moduleWith(DeviceAuthenticationResult.Error(5, "Fingerprint operation canceled.", false))
            .performDeviceAuthentication("reason", mockPromise)

        verify(exactly = 1) {
            mockPromise.reject(
                "E_DEVICE_AUTH_ERROR",
                match<String> { it.contains("code=5") && it.contains("Fingerprint operation canceled.") },
            )
        }
    }

    @Test
    fun `performDeviceAuthentication does not settle the promise on an intermediate failure`() {
        moduleWith(DeviceAuthenticationResult.Failed).performDeviceAuthentication("reason", mockPromise)

        verify(exactly = 0) { mockPromise.resolve(any()) }
        verify(exactly = 0) { mockPromise.reject(any<String>(), any<String>()) }
    }

    @Test
    fun `performDeviceAuthentication resolves true on success`() {
        moduleWith(DeviceAuthenticationResult.Success).performDeviceAuthentication("reason", mockPromise)

        verify(exactly = 1) { mockPromise.resolve(true) }
    }
}
