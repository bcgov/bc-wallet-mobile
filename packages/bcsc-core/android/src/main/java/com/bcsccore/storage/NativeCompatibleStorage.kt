package com.bcsccore.storage

import android.content.Context
import android.util.Log
import com.bcsccore.fileport.encryption.AESEncryptor
import com.bcsccore.fileport.encryption.AndroidKeyStoreSource
import com.bcsccore.fileport.encryption.Encryption
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.lang.reflect.Type
import java.util.TimeZone

/**
 * Native-compatible storage that matches the ias-android storage format.
 * This enables rollback capability between bcsc-core and native ias-android.
 *
 * Storage paths match native format:
 * - Accounts: {filesDir}/{issuerName}/accounts
 * - Tokens: {filesDir}/{issuerName}/{accountUuid}/tokens
 *
 * Uses AES-GCM encryption with the same key alias ("enc1") as native.
 */
class NativeCompatibleStorage(
    private val context: Context,
) {
    companion object {
        private const val TAG = "NativeCompatibleStorage"
        private const val ACCOUNTS_FILENAME = "accounts"
        private const val TOKENS_FILENAME = "tokens"
        private const val ISSUER_FILENAME = "issuer"
        private const val AUTHORIZATION_REQUEST_FILENAME = "authorization_request"
        private const val DEFAULT_ISSUER = "prod"
    }

    private val encryption: Encryption by lazy {
        val keySource = AndroidKeyStoreSource()
        AESEncryptor(keySource)
    }

    private val gson: Gson by lazy {
        GsonBuilder()
            .registerTypeAdapter(TimeZone::class.java, TimeZoneTypeAdapter())
            .create()
    }

    // MARK: - Issuer Name Resolution

    fun saveIssuerToFile(issuer: String): Boolean {
        val file = File(context.filesDir, ISSUER_FILENAME)
        return writeEncryptedFile(file, issuer)
    }

    /**
     * Gets the issuer name from an issuer URL.
     * Matches native logic in Utils.getIssuerNameFromIssuer()
     *
     * Examples:
     * - "https://id.gov.bc.ca/device/" -> "prod"
     * - "https://idsit.gov.bc.ca/device/" -> "sit"
     * - "https://idqa.gov.bc.ca/device/" -> "qa"
     * - "https://iddev.gov.bc.ca/device/" -> "dev"
     */
    fun getIssuerNameFromIssuer(issuer: String): String {
        // Map of issuer URLs to issuer names (matches native BuildConfig.ISSUERS)
        val issuerMap =
            mapOf(
                "https://id.gov.bc.ca/device/" to "prod",
                "https://idsit.gov.bc.ca/device/" to "sit",
                "https://idqa.gov.bc.ca/device/" to "qa",
                "https://iddev.gov.bc.ca/device/" to "dev",
                "https://iddev2.gov.bc.ca/device/" to "dev2",
                "https://idpreprod.gov.bc.ca/device/" to "preprod",
                "https://idtest.gov.bc.ca/device/" to "test",
            )

        // Check direct mapping first
        issuerMap[issuer]?.let { return it }

        // Fallback: extract from URL (matches native Utils.getIssuerNameFromIssuer)
        return try {
            val startIndex = issuer.indexOf("d") + 1
            val endIndex = issuer.indexOf(".")
            if (startIndex > 0 && endIndex > startIndex) {
                issuer.substring(startIndex, endIndex)
            } else {
                DEFAULT_ISSUER // Default fallback
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not parse issuer name from: $issuer, defaulting to 'prod'")
            DEFAULT_ISSUER
        }
    }

    /**
     * Gets the current isser name by reading the issuer file.
     */
    fun getDefaultIssuerName(): String {
        val issuerFile = File(context.filesDir, ISSUER_FILENAME)
        val issuer = readEncryptedFile(issuerFile)

        if (issuer != null) {
            return getIssuerNameFromIssuer(issuer)
        }

        Log.w(TAG, "Issuer file not found or unreadable, defaulting to '$DEFAULT_ISSUER'")
        return DEFAULT_ISSUER
    }

    // MARK: - File Path Helpers

    private fun getAccountsFile(issuerName: String): File {
        val path = issuerName + File.separator + ACCOUNTS_FILENAME
        return File(context.filesDir, path)
    }

    private fun getTokensFile(
        issuerName: String,
        accountUuid: String,
    ): File {
        val path = issuerName + File.separator + accountUuid + File.separator + TOKENS_FILENAME
        return File(context.filesDir, path)
    }

    // MARK: - Low-level I/O with Encryption

    internal fun readEncryptedFile(file: File): String? {
        if (!file.exists() || !file.isFile) {
            return null
        }

        return try {
            val encryptedBytes =
                FileInputStream(file).use { fis ->
                    val data = ByteArray(file.length().toInt())
                    fis.read(data)
                    data
                }
            encryption.decrypt(encryptedBytes)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read/decrypt file: ${file.absolutePath}", e)
            null
        }
    }

    private fun writeEncryptedFile(
        file: File,
        content: String,
    ): Boolean =
        try {
            // Ensure parent directory exists
            file.parentFile?.mkdirs()

            // Encrypt and write
            val encryptedBytes = encryption.encrypt(content)
            FileOutputStream(file).use { fos ->
                fos.write(encryptedBytes)
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to encrypt/write file: ${file.absolutePath}", e)
            false
        }

    // MARK: - Account Storage (Native Compatible)

    /**
     * Saves accounts to native-compatible encrypted storage.
     * Path: {filesDir}/{issuerName}/accounts
     */
    fun saveAccounts(
        accounts: List<NativeAccount>,
        issuerName: String,
    ): Boolean {
        val file = getAccountsFile(issuerName)
        val jsonContent = gson.toJson(accounts)
        Log.d(TAG, "Saving ${accounts.size} accounts to: ${file.absolutePath}")
        return writeEncryptedFile(file, jsonContent)
    }

    /**
     * Reads accounts from native-compatible encrypted storage.
     */
    fun readAccounts(issuerName: String): List<NativeAccount>? {
        val file = getAccountsFile(issuerName)
        Log.d(TAG, "Reading accounts from: ${file.absolutePath}")

        val jsonContent = readEncryptedFile(file) ?: return null

        return try {
            val type = object : com.google.gson.reflect.TypeToken<List<NativeAccount>>() {}.type
            gson.fromJson<List<NativeAccount>>(jsonContent, type)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse accounts JSON", e)
            null
        }
    }

    /**
     * Checks if accounts file exists for the given issuer.
     */
    fun accountsExist(issuerName: String): Boolean = getAccountsFile(issuerName).exists()

    /**
     * Deletes the accounts file for the given issuer.
     */
    fun deleteAccounts(issuerName: String): Boolean {
        val file = getAccountsFile(issuerName)
        return if (file.exists()) file.delete() else true
    }

    // MARK: - Token Storage (Native Compatible)

    /**
     * Saves tokens to native-compatible encrypted storage.
     * Path: {filesDir}/{issuerName}/{accountUuid}/tokens
     */
    fun saveTokens(
        tokens: NativeTokens,
        issuerName: String,
        accountUuid: String,
    ): Boolean {
        val file = getTokensFile(issuerName, accountUuid)
        val jsonContent = gson.toJson(tokens)
        Log.d(TAG, "Saving tokens to: ${file.absolutePath}")
        return writeEncryptedFile(file, jsonContent)
    }

    /**
     * Reads tokens from native-compatible encrypted storage.
     */
    fun readTokens(
        issuerName: String,
        accountUuid: String,
    ): NativeTokens? {
        val file = getTokensFile(issuerName, accountUuid)
        Log.d(TAG, "Reading tokens from: ${file.absolutePath}")

        val jsonContent = readEncryptedFile(file) ?: return null

        return try {
            gson.fromJson(jsonContent, NativeTokens::class.java)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse tokens JSON", e)
            null
        }
    }

    /**
     * Checks if tokens file exists for the given account.
     */
    fun tokensExist(
        issuerName: String,
        accountUuid: String,
    ): Boolean = getTokensFile(issuerName, accountUuid).exists()

    /**
     * Deletes tokens and the account directory.
     */
    fun deleteTokens(
        issuerName: String,
        accountUuid: String,
    ): Boolean {
        val tokensFile = getTokensFile(issuerName, accountUuid)
        val accountDir = tokensFile.parentFile

        // Delete tokens file
        if (tokensFile.exists()) {
            tokensFile.delete()
        }

        // Delete account directory if empty
        accountDir?.let {
            if (it.exists() && it.isDirectory && (it.listFiles()?.isEmpty() == true)) {
                it.delete()
            }
        }

        return true
    }

    // MARK: - Migration Helpers

    /**
     * Attempts to read accounts from the old flat file location and migrate them.
     * Old location: {filesDir}/accounts (unencrypted JSON array)
     * New location: {filesDir}/{issuerName}/accounts (encrypted)
     */
    fun migrateFromFlatFileIfNeeded(): Boolean {
        val oldFile = File(context.filesDir, "accounts")
        if (!oldFile.exists()) {
            return false // No migration needed
        }

        Log.d(TAG, "Found old-format accounts file, attempting migration")

        return try {
            // Read old unencrypted file
            val oldContent = oldFile.readText()
            val jsonArray = org.json.JSONArray(oldContent)

            if (jsonArray.length() == 0) {
                oldFile.delete()
                return false
            }

            // Parse the first account to get issuer
            val firstAccount = jsonArray.getJSONObject(0)
            val issuer = firstAccount.optString("issuer", "")
            val issuerName =
                if (issuer.isNotEmpty()) {
                    getIssuerNameFromIssuer(issuer)
                } else {
                    getDefaultIssuerName()
                }

            // Convert to native format
            val accounts = mutableListOf<NativeAccount>()
            for (i in 0 until jsonArray.length()) {
                val accountJson = jsonArray.getJSONObject(i)
                val account =
                    NativeAccount(
                        uuid = accountJson.optString("uuid", accountJson.optString("id", "")),
                        nickName = accountJson.optString("nickName", accountJson.optString("nickname", null)),
                        issuer = accountJson.optString("issuer", ""),
                        clientId = accountJson.optString("clientId", accountJson.optString("clientID", "")),
                        createdAt = accountJson.optLong("createdAt", System.currentTimeMillis()),
                        penalty =
                            NativePenalty(
                                penaltyAttempts =
                                    accountJson.optJSONObject("penalty")?.optInt("penaltyAttempts", 0) ?: 0,
                            ),
                        accountSecurityType =
                            parseSecurityType(
                                accountJson.optString(
                                    "accountSecurityType",
                                    accountJson.optString("securityMethod", "DeviceSecurity"),
                                ),
                            ),
                    )
                accounts.add(account)
            }

            // Save in new encrypted format
            if (saveAccounts(accounts, issuerName)) {
                Log.d(TAG, "Successfully migrated ${accounts.size} accounts to native format")
                oldFile.delete() // Remove old file
                true
            } else {
                Log.e(TAG, "Failed to save migrated accounts")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Migration failed", e)
            false
        }
    }

    private fun parseSecurityType(value: String): NativeAccountSecurityType =
        when (value) {
            "DeviceSecurity", "device_authentication" -> NativeAccountSecurityType.DeviceSecurity
            "PinNoDeviceAuth", "app_pin_no_device_authn" -> NativeAccountSecurityType.PinNoDeviceAuth
            "PinWithDeviceAuth", "app_pin_has_device_authn" -> NativeAccountSecurityType.PinWithDeviceAuth
            else -> NativeAccountSecurityType.DeviceSecurity
        }

    // MARK: - Authorization Request Storage

    private fun getAuthorizationRequestFile(
        issuerName: String,
        accountUuid: String,
    ): File {
        val path = issuerName + File.separator + accountUuid + File.separator + AUTHORIZATION_REQUEST_FILENAME
        return File(context.filesDir, path)
    }

    /**
     * Saves authorization request to native-compatible encrypted storage.
     * Path: {filesDir}/{issuerName}/{accountUuid}/authorization_request
     */
    fun saveAuthorizationRequest(
        authRequest: NativeAuthorizationRequest,
        issuerName: String,
        accountUuid: String,
    ): Boolean {
        val file = getAuthorizationRequestFile(issuerName, accountUuid)
        val jsonContent = gson.toJson(authRequest)
        Log.d(TAG, "Saving authorization request to: ${file.absolutePath}")
        return writeEncryptedFile(file, jsonContent)
    }

    /**
     * Reads authorization request from native-compatible encrypted storage.
     */
    fun readAuthorizationRequest(
        issuerName: String,
        accountUuid: String,
    ): NativeAuthorizationRequest? {
        val file = getAuthorizationRequestFile(issuerName, accountUuid)
        Log.d(TAG, "Reading authorization request from: ${file.absolutePath}")

        val jsonContent = readEncryptedFile(file) ?: return null

        return try {
            gson.fromJson(jsonContent, NativeAuthorizationRequest::class.java)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse authorization request JSON", e)
            null
        }
    }

    /**
     * Checks if authorization request file exists for the given account.
     */
    fun authorizationRequestExists(
        issuerName: String,
        accountUuid: String,
    ): Boolean = getAuthorizationRequestFile(issuerName, accountUuid).exists()

    /**
     * Deletes the authorization request file for the given account.
     */
    fun deleteAuthorizationRequest(
        issuerName: String,
        accountUuid: String,
    ): Boolean {
        val file = getAuthorizationRequestFile(issuerName, accountUuid)
        return if (file.exists()) file.delete() else true
    }

    /**
     * Attempts to read authorization request from v3 Provider file and migrate it.
     * V3 stored AuthorizationRequest nested in Provider->ClientRegistration.
     *
     * @param issuerName The issuer name
     * @param accountUuid The account UUID
     * @return The extracted NativeAuthorizationRequest or null if not found/failed
     */
    fun readAuthorizationRequestFromV3Provider(
        issuerName: String,
        accountUuid: String,
    ): NativeAuthorizationRequest? {
        // V3 stores provider at: {filesDir}/{issuerName}/{accountUuid}/provider
        val providerPath = issuerName + File.separator + accountUuid + File.separator + "provider"
        val providerFile = File(context.filesDir, providerPath)

        if (!providerFile.exists()) {
            Log.d(TAG, "V3 provider file not found at: ${providerFile.absolutePath}")
            return null
        }

        Log.d(TAG, "Attempting to read v3 provider file: ${providerFile.absolutePath}")

        val jsonContent = readEncryptedFile(providerFile) ?: return null

        return try {
            // Parse the nested structure: Provider -> ClientRegistration -> AuthorizationRequest
            val jsonObject = org.json.JSONObject(jsonContent)
            val clientReg = jsonObject.optJSONObject("clientRegistration") ?: return null
            val authReqJson = clientReg.optJSONObject("authorizationRequest") ?: return null

            // Convert to our model
            NativeAuthorizationRequest(
                deviceCode = authReqJson.optString("deviceCode", null),
                userCode = authReqJson.optString("userCode", null),
                birthDate = authReqJson.optString("birth_date", null),
                csn = authReqJson.optString("csn", null),
                verifiedEmail = authReqJson.optString("verified_email", null),
                firstName = authReqJson.optString("firstName", null),
                lastName = authReqJson.optString("lastName", null),
                middleNames = authReqJson.optString("middleNames", null),
                residentialAddress = authReqJson.optString("residentialAddress", null),
                issuer = authReqJson.optString("issuer", null),
                verificationOptions = authReqJson.optString("verification_options", null),
                verificationUri = authReqJson.optString("verification_uri", null),
                verificationUriVideo = authReqJson.optString("verification_uri_video", null),
                backCheckVerificationId = authReqJson.optString("backCheckVerificationId", null),
                evidenceUploadUri = authReqJson.optString("evidence_upload_uri", null),
                // Note: Complex objects like Address and Date fields would need more parsing
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to extract authorization request from v3 provider", e)
            null
        }
    }
}
