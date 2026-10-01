package com.bcsccore.authentication.device

import androidx.biometric.BiometricPrompt
import org.junit.Assert.assertEquals
import org.junit.Test

class DeviceAuthenticationResultTest {
    @Test
    fun `describe includes the named error code and message`() {
        val result = DeviceAuthenticationResult.Error(BiometricPrompt.ERROR_LOCKOUT, "Too many attempts")

        assertEquals("ERROR_LOCKOUT (7): Too many attempts", result.describe())
    }

    @Test
    fun `describe falls back to the message when there is no error code`() {
        val result =
            DeviceAuthenticationResult.Error(
                null,
                "Failed to show biometric prompt: IllegalStateException: boom",
            )

        assertEquals("Failed to show biometric prompt: IllegalStateException: boom", result.describe())
    }

    @Test
    fun `biometricErrorName names system cancel distinctly from user cancel`() {
        assertEquals("ERROR_CANCELED", biometricErrorName(BiometricPrompt.ERROR_CANCELED))
        assertEquals("ERROR_USER_CANCELED", biometricErrorName(BiometricPrompt.ERROR_USER_CANCELED))
    }

    @Test
    fun `biometricErrorName returns unknown for unrecognised codes`() {
        assertEquals("ERROR_UNKNOWN", biometricErrorName(999))
    }
}
