package com.bcsccore.storage

import com.google.gson.annotations.SerializedName
import java.util.Date

/**
 * Address information for the user.
 * Compatible with v3 native app Address model.
 */
data class NativeAddress(
    @SerializedName("street_address")
    val streetAddress: String? = null,
    @SerializedName("locality")
    val locality: String? = null,
    @SerializedName("postal_code")
    val postalCode: String? = null,
    @SerializedName("country")
    val country: String? = null,
    @SerializedName("region")
    val region: String? = null,
)

/**
 * Request status enum matching v3's RequestStatus.
 */
enum class NativeRequestStatus(
    val value: Int,
) {
    INITIALIZED(0),
    REQUESTED(1),
    AUTHORIZED(2),
    COMPLETED(3),
    CANCELLED(4),
    ERROR(5),
    ;

    companion object {
        fun fromValue(value: Int): NativeRequestStatus = values().find { it.value == value } ?: INITIALIZED
    }
}

/**
 * Authorization method enum matching v3's AuthorizationMethod.
 */
enum class NativeAuthorizationMethod(
    val value: Int,
) {
    NONE(0),
    COUNTER(1),
    FACE(2),
    VIDEO_CALL(3),
    BACK_CHECK(4),
    SELF_VERIFY(5),
    ;

    companion object {
        fun fromValue(value: Int): NativeAuthorizationMethod = values().find { it.value == value } ?: NONE
    }
}

/**
 * AuthorizationRequest model compatible with v3 native app storage.
 *
 * On Android v3, this is stored nested inside Provider->ClientRegistration.
 * For v4, we store it as a separate encrypted file for simplicity while
 * maintaining the same data structure for migration compatibility.
 */
data class NativeAuthorizationRequest(
    // Device/user codes
    @SerializedName("deviceCode")
    val deviceCode: String? = null,
    @SerializedName("userCode")
    val userCode: String? = null,
    // User identity info
    @SerializedName("birth_date")
    val birthDate: String? = null, // ISO date string in v3 Android
    @SerializedName("csn")
    val csn: String? = null, // Card Serial Number
    @SerializedName("verified_email")
    val verifiedEmail: String? = null,
    // User profile info
    @SerializedName("firstName")
    val firstName: String? = null,
    @SerializedName("lastName")
    val lastName: String? = null,
    @SerializedName("middleNames")
    val middleNames: String? = null,
    @SerializedName("residentialAddress")
    val residentialAddress: String? = null, // JSON string of address
    @SerializedName("address")
    val address: NativeAddress? = null,
    // Request metadata
    @SerializedName("requestStatus")
    val requestStatus: NativeRequestStatus = NativeRequestStatus.INITIALIZED,
    @SerializedName("authorizationMethod")
    val authorizationMethod: NativeAuthorizationMethod = NativeAuthorizationMethod.NONE,
    @SerializedName("issuer")
    val issuer: String? = null,
    @SerializedName("expiry")
    val expiry: Date? = null,
    @SerializedName("authorizationExpiry")
    val authorizationExpiry: Date? = null,
    // Verification options
    @SerializedName("verification_options")
    val verificationOptions: String? = null,
    @SerializedName("verification_uri")
    val verificationUri: String? = null,
    @SerializedName("verification_uri_video")
    val verificationUriVideo: String? = null,
    // BackCheck verification
    @SerializedName("backCheckSubmittedDate")
    val backCheckSubmittedDate: Date? = null,
    @SerializedName("backCheckVerificationId")
    val backCheckVerificationId: String? = null,
    // Evidence upload
    @SerializedName("evidence_upload_uri")
    val evidenceUploadUri: String? = null,
    // Identification process type
    @SerializedName("cardProcess")
    val cardProcess: String? = null,
)
