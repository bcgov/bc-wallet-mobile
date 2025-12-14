package com.bcsccore.storage

import com.google.gson.annotations.SerializedName
import java.util.Date

/**
 * Native-compatible Tokens model that matches ias-android's Tokens class.
 * This ensures Gson serialization produces compatible JSON.
 */
data class NativeTokens(
    @SerializedName("issuer")
    val issuer: String,
    @SerializedName("idToken")
    val idToken: NativeIdToken? = null,
    @SerializedName("accessToken")
    val accessToken: NativeToken? = null,
    @SerializedName("refreshToken")
    val refreshToken: NativeToken? = null,
    @SerializedName("fetchedAt")
    val fetchedAt: Long = System.currentTimeMillis(),
)

/**
 * Native-compatible Token model that matches ias-android's Token class.
 */
data class NativeToken(
    @SerializedName("id")
    val id: String,
    @SerializedName("type")
    val type: NativeTokenType,
    @SerializedName("token")
    val token: String,
    @SerializedName("created")
    val created: Date? = null,
    @SerializedName("expiry")
    val expiry: Date? = null,
)

/**
 * Native-compatible TokenType enum.
 */
enum class NativeTokenType {
    @SerializedName("ACCESS")
    ACCESS,

    @SerializedName("REFRESH")
    REFRESH,
}

/**
 * Native-compatible IdToken model.
 * This is a simplified version - the native IdToken has many more fields
 * but we only need the essential ones for storage compatibility.
 */
data class NativeIdToken(
    @SerializedName("sub")
    val sub: String? = null,
    @SerializedName("iss")
    val iss: String? = null,
    @SerializedName("aud")
    val aud: String? = null,
    @SerializedName("exp")
    val exp: Long? = null,
    @SerializedName("iat")
    val iat: Long? = null,
    @SerializedName("jti")
    val jti: String? = null,
    // Raw token string for cases where we need to pass through
    @SerializedName("rawToken")
    val rawToken: String? = null,
)
