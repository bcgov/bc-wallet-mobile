package com.bcsccore.authentication.device

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.biometric.BiometricManager
import androidx.fragment.app.FragmentActivity

enum class BiometricType(
    val value: String,
) {
    NONE("none"),
    FINGERPRINT("fingerprint"),
    FACE("face"),
    IRIS("iris"),
}

sealed class DeviceAuthenticationResult {
    object Success : DeviceAuthenticationResult()

    object Failed : DeviceAuthenticationResult()

    data class Cancelled(
        val errorCode: Int,
        val errorMessage: String,
        val deviceLocked: Boolean,
    ) : DeviceAuthenticationResult()

    data class Error(
        val errorCode: Int?,
        val errorMessage: String,
        val deviceLocked: Boolean,
    ) : DeviceAuthenticationResult()
}

/**
 * Only an explicit user dismissal is a cancel. ERROR_USER_CANCELED also arrives when the OS
 * lock screen takes over the prompt, so it counts as a cancel only while the device is unlocked.
 */
internal fun mapAuthenticationError(
    errorCode: Int,
    errString: CharSequence,
    deviceLocked: Boolean,
): DeviceAuthenticationResult {
    val message = errString.toString()
    return when {
        errorCode == androidx.biometric.BiometricPrompt.ERROR_NEGATIVE_BUTTON -> {
            DeviceAuthenticationResult.Cancelled(errorCode, message, deviceLocked)
        }

        errorCode == androidx.biometric.BiometricPrompt.ERROR_USER_CANCELED && !deviceLocked -> {
            DeviceAuthenticationResult.Cancelled(errorCode, message, deviceLocked)
        }

        else -> {
            DeviceAuthenticationResult.Error(errorCode, message, deviceLocked)
        }
    }
}

interface DeviceAuthenticationService {
    fun canPerformDeviceAuthentication(): Boolean

    fun canPerformBiometricAuthentication(): Boolean

    fun getAvailableBiometricType(): BiometricType

    fun performDeviceAuthentication(
        activity: FragmentActivity,
        title: String,
        subtitle: String = "",
        callback: (DeviceAuthenticationResult) -> Unit,
    )

    fun createConfirmDeviceCredentialIntent(title: String): Intent?
}

class DeviceAuthenticationServiceImpl(
    private val context: Context,
) : DeviceAuthenticationService {
    companion object {
        private const val TAG = "DeviceAuthenticationService"
    }

    private val keyguardManager: KeyguardManager by lazy {
        context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    }

    private val biometricManager: BiometricManager by lazy {
        BiometricManager.from(context)
    }

    override fun canPerformDeviceAuthentication(): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            keyguardManager.isDeviceSecure
        } else {
            keyguardManager.isKeyguardSecure
        }

    override fun canPerformBiometricAuthentication(): Boolean =
        when (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)) {
            BiometricManager.BIOMETRIC_SUCCESS -> true
            else -> false
        }

    override fun getAvailableBiometricType(): BiometricType =
        when (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)) {
            BiometricManager.BIOMETRIC_SUCCESS -> {
                // Android doesn't provide a direct way to determine the exact biometric type
                // We return a generic fingerprint type for available biometrics
                BiometricType.FINGERPRINT
            }

            else -> {
                BiometricType.NONE
            }
        }

    override fun performDeviceAuthentication(
        activity: FragmentActivity,
        title: String,
        subtitle: String,
        callback: (DeviceAuthenticationResult) -> Unit,
    ) {
        // BiometricPrompt must be created and used on the main UI thread
        activity.runOnUiThread {
            try {
                val biometricPrompt =
                    androidx.biometric.BiometricPrompt(
                        activity,
                        androidx.core.content.ContextCompat
                            .getMainExecutor(context),
                        object : androidx.biometric.BiometricPrompt.AuthenticationCallback() {
                            override fun onAuthenticationError(
                                errorCode: Int,
                                errString: CharSequence,
                            ) {
                                super.onAuthenticationError(errorCode, errString)
                                val deviceLocked = keyguardManager.isDeviceLocked
                                val result = mapAuthenticationError(errorCode, errString, deviceLocked)
                                Log.i(
                                    TAG,
                                    "onAuthenticationError code=$errorCode deviceLocked=$deviceLocked -> " +
                                        result.javaClass.simpleName,
                                )
                                callback(result)
                            }

                            override fun onAuthenticationSucceeded(
                                result: androidx.biometric.BiometricPrompt.AuthenticationResult,
                            ) {
                                super.onAuthenticationSucceeded(result)
                                callback(DeviceAuthenticationResult.Success)
                            }

                            override fun onAuthenticationFailed() {
                                super.onAuthenticationFailed()
                                // onAuthenticationFailed is an intermediate callback — the
                                // BiometricPrompt stays open and the user can retry. Only
                                // onAuthenticationSucceeded and onAuthenticationError are
                                // terminal, so we intentionally do NOT invoke the callback here.
                                Log.d(TAG, "Biometric attempt failed, awaiting retry")
                            }
                        },
                    )

                val promptInfo =
                    androidx.biometric.BiometricPrompt.PromptInfo
                        .Builder()
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setAllowedAuthenticators(
                            BiometricManager.Authenticators.BIOMETRIC_WEAK or
                                BiometricManager.Authenticators.DEVICE_CREDENTIAL,
                        ).build()

                biometricPrompt.authenticate(promptInfo)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start biometric prompt", e)
                callback(DeviceAuthenticationResult.Error(null, e.message ?: e.javaClass.simpleName, false))
            }
        }
    }

    override fun createConfirmDeviceCredentialIntent(title: String): Intent? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            keyguardManager.createConfirmDeviceCredentialIntent(title, null)
        } else {
            null
        }
}
