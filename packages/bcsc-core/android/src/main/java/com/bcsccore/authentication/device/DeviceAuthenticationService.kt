package com.bcsccore.authentication.device

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
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

enum class DeviceAuthenticationResult {
    SUCCESS,
    FAILED,
    CANCELLED,
    ERROR,
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
                                        callback(DeviceAuthenticationResult.CANCELLED)
                                    }

                                    else -> {
                                        callback(DeviceAuthenticationResult.ERROR)
                                    }
                                }
                            }

                            override fun onAuthenticationSucceeded(
                                result: androidx.biometric.BiometricPrompt.AuthenticationResult,
                            ) {
                                super.onAuthenticationSucceeded(result)
                                callback(DeviceAuthenticationResult.SUCCESS)
                            }

                            override fun onAuthenticationFailed() {
                                super.onAuthenticationFailed()
                                callback(DeviceAuthenticationResult.FAILED)
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
                callback(DeviceAuthenticationResult.ERROR)
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
