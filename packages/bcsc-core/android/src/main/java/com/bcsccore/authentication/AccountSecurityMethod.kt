package com.bcsccore.authentication

enum class AccountSecurityMethod(
    val value: String,
) {
    PIN_NO_DEVICE_AUTH("app_pin_no_device_authn"),
    PIN_WITH_DEVICE_AUTH("app_pin_has_device_authn"),
    DEVICE_AUTH("device_authentication"),
    ;

    companion object {
        fun fromString(value: String): AccountSecurityMethod? = values().find { it.value == value }

        fun getCurrentPINMethod(hasDeviceAuth: Boolean): AccountSecurityMethod =
            if (hasDeviceAuth) {
                PIN_WITH_DEVICE_AUTH
            } else {
                PIN_NO_DEVICE_AUTH
            }
    }

    val isPIN: Boolean
        get() = this == PIN_NO_DEVICE_AUTH || this == PIN_WITH_DEVICE_AUTH
}
