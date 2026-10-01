package com.bcsccore.authentication.device

import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Lifecycle
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
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

    @Test
    fun `cancelled describe includes the cancel code`() {
        val result =
            DeviceAuthenticationResult.Cancelled(BiometricPrompt.ERROR_USER_CANCELED, "Authentication canceled by user")

        assertEquals("ERROR_USER_CANCELED (10): Authentication canceled by user", result.describe())
    }

    private fun activity(
        isFinishing: Boolean = false,
        isDestroyed: Boolean = false,
        isStateSaved: Boolean = false,
        lifecycleState: Lifecycle.State = Lifecycle.State.RESUMED,
    ): FragmentActivity =
        mockk {
            every { this@mockk.isFinishing } returns isFinishing
            every { this@mockk.isDestroyed } returns isDestroyed
            every { supportFragmentManager.isStateSaved } returns isStateSaved
            every { lifecycle.currentState } returns lifecycleState
        }

    @Test
    fun `promptBlockedReason is null when the prompt can be shown`() {
        assertNull(promptBlockedReason(activity()))
    }

    @Test
    fun `promptBlockedReason reports a saved fragment manager instead of hanging silently`() {
        val reason = promptBlockedReason(activity(isStateSaved = true, lifecycleState = Lifecycle.State.CREATED))

        assertEquals(
            "Prompt not shown: lifecycle=CREATED, stateSaved=true, finishing=false, destroyed=false",
            reason,
        )
    }

    @Test
    fun `promptBlockedReason reports a finishing or destroyed activity`() {
        assertNotNull(promptBlockedReason(activity(isFinishing = true, lifecycleState = Lifecycle.State.STARTED)))
        assertNotNull(promptBlockedReason(activity(isDestroyed = true, lifecycleState = Lifecycle.State.DESTROYED)))
    }
}
