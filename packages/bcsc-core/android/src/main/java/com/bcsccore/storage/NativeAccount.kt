package com.bcsccore.storage

import com.google.gson.annotations.SerializedName

/**
 * Native-compatible Account model that matches ias-android's Account data class.
 * This ensures Gson serialization produces compatible JSON.
 */
data class NativeAccount(
    @SerializedName("uuid")
    val uuid: String,
    @SerializedName("nickName")
    val nickName: String? = null,
    @SerializedName("issuer")
    val issuer: String,
    @SerializedName("clientId")
    val clientId: String,
    @SerializedName("createdAt")
    val createdAt: Long = System.currentTimeMillis(),
    @SerializedName("penalty")
    val penalty: NativePenalty = NativePenalty(),
    @SerializedName("accountSecurityType")
    val accountSecurityType: NativeAccountSecurityType = NativeAccountSecurityType.DeviceSecurity,
)

/**
 * Native-compatible Penalty model.
 */
data class NativePenalty(
    @SerializedName("penaltyAttempts")
    val penaltyAttempts: Int = 0,
    @SerializedName("penaltyEndTime")
    val penaltyEndTime: Long = 0L,
)

/**
 * Native-compatible AccountSecurityType enum.
 * The @SerializedName ensures Gson serializes the enum name directly.
 */
enum class NativeAccountSecurityType(
    val type: String,
) {
    @SerializedName("DeviceSecurity")
    DeviceSecurity("DeviceSecurity"),

    @SerializedName("PinNoDeviceAuth")
    PinNoDeviceAuth("PinNoDeviceAuth"),

    @SerializedName("PinWithDeviceAuth")
    PinWithDeviceAuth("PinWithDeviceAuth"),
}
