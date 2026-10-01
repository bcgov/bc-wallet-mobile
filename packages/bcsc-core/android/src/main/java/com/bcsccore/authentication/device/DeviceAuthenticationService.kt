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

    /** biometric failure (e.g. wrong finger) — the prompt stays open. */
    object Failed : DeviceAuthenticationResult()

    /** user deliberately dismissed the prompt. */
    object Cancelled : DeviceAuthenticationResult()

    /**
     * Terminal failure that is NOT a user cancel (lockout, system cancel, hardware unavailable,
     * prompt could not be shown, ...). [errorCode] is the BiometricPrompt ERROR_* constant, or
     * null when the prompt threw before it could report one.
     */
    data class Error(
        val errorCode: Int?,
        val errorMessage: String,
    ) : DeviceAuthenticationResult() {
        /** Log/report-friendly description: "ERROR_LOCKOUT (7): Too many attempts". */
        fun describe(): String =
            if (errorCode == null) errorMessage else "${biometricErrorName(errorCode)} ($errorCode): $errorMessage"
    }
}

/** Human-readable name for a BiometricPrompt ERROR_* code */
fun biometricErrorName(errorCode: Int): String =
    when (errorCode) {
        androidx.biometric.BiometricPrompt.ERROR_HW_UNAVAILABLE -> "ERROR_HW_UNAVAILABLE"
        androidx.biometric.BiometricPrompt.ERROR_UNABLE_TO_PROCESS -> "ERROR_UNABLE_TO_PROCESS"
        androidx.biometric.BiometricPrompt.ERROR_TIMEOUT -> "ERROR_TIMEOUT"
        androidx.biometric.BiometricPrompt.ERROR_NO_SPACE -> "ERROR_NO_SPACE"
        androidx.biometric.BiometricPrompt.ERROR_CANCELED -> "ERROR_CANCELED"
        androidx.biometric.BiometricPrompt.ERROR_LOCKOUT -> "ERROR_LOCKOUT"
        androidx.biometric.BiometricPrompt.ERROR_VENDOR -> "ERROR_VENDOR"
        androidx.biometric.BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> "ERROR_LOCKOUT_PERMANENT"
        androidx.biometric.BiometricPrompt.ERROR_USER_CANCELED -> "ERROR_USER_CANCELED"
        androidx.biometric.BiometricPrompt.ERROR_NO_BIOMETRICS -> "ERROR_NO_BIOMETRICS"
        androidx.biometric.BiometricPrompt.ERROR_HW_NOT_PRESENT -> "ERROR_HW_NOT_PRESENT"
        androidx.biometric.BiometricPrompt.ERROR_NEGATIVE_BUTTON -> "ERROR_NEGATIVE_BUTTON"
        androidx.biometric.BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL -> "ERROR_NO_DEVICE_CREDENTIAL"
        else -> "ERROR_UNKNOWN"
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
                                when (errorCode) {
                                    androidx.biometric.BiometricPrompt.ERROR_USER_CANCELED,
                                    androidx.biometric.BiometricPrompt.ERROR_NEGATIVE_BUTTON,
                                    -> {
                                        callback(DeviceAuthenticationResult.Cancelled)
                                    }

                                    else -> {
                                        callback(DeviceAuthenticationResult.Error(errorCode, errString.toString()))
                                    }
                                }
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
                // e.g. IllegalStateException when the FragmentManager has already saved state
                callback(
                    DeviceAuthenticationResult.Error(
                        null,
                        "Failed to show biometric prompt: ${e.javaClass.simpleName}: ${e.message}",
                    ),
                )
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
