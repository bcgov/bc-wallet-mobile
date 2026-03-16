package com.bcsccore.storage

import com.google.gson.annotations.SerializedName

/**
 * V3-compatible data class for client metadata (saved services).
 *
 * Matches the v3 ias-android ClientMetadata model's JSON format.
 * On disk, the file contains a JSON array of these objects, encrypted with AES-GCM.
 * File path: {issuerName}/{accountUUID}/clientmetadata
 */
data class NativeClientMetadata(
    @SerializedName("client_ref_id") val clientRefId: String? = null,
    @SerializedName("client_name") val clientName: String? = null,
    @SerializedName("application_type") val applicationType: String? = null,
    @SerializedName("client_uri") val clientUri: String? = null,
    @SerializedName("initiate_login_uri") val initiateLoginUri: String? = null,
    @SerializedName("client_description") val clientDescription: String? = null,
    @SerializedName("policy_uri") val policyUri: String? = null,
    @SerializedName("claims_description") val claimsDescription: String? = null,
    @SerializedName("service_listing_sort_order") val serviceListingSortOrder: Int? = null,
    @SerializedName("suppress_confirmation_info") val suppressConfirmationInfo: Boolean = false,
    @SerializedName("suppress_bookmark_prompt") val suppressBookmarkPrompt: Boolean = false,
    val isBookmarked: Boolean = false,
    val dateAdded: Long = 0,
    val lastUsed: Long = 0,
)
