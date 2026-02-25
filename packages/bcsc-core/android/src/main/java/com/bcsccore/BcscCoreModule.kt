package com.bcsccore

// Android imports
import android.app.NotificationChannel
import android.app.NotificationManager
import android.bluetooth.BluetoothAdapter
import android.content.Context
import android.os.Build
import android.provider.Settings
import android.security.keystore.KeyProperties
import android.util.Log
import android.view.inputmethod.InputMethodManager
import androidx.core.app.NotificationCompat
import androidx.fragment.app.FragmentActivity

// React Native imports
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule

// Java/Kotlin standard library imports
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileWriter
import java.io.IOException
import java.security.KeyPair
import java.security.KeyStore
import java.security.KeyStoreException
import java.security.NoSuchAlgorithmException
import java.security.PrivateKey
import java.security.PublicKey
import java.security.UnrecoverableEntryException
import java.security.cert.Certificate
import java.text.SimpleDateFormat
import java.util.Base64
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import javax.crypto.SecretKey
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

// JWT/Nimbus imports
import com.nimbusds.jose.EncryptionMethod
import com.nimbusds.jose.JWEAlgorithm
import com.nimbusds.jose.JWEHeader
import com.nimbusds.jose.JWEObject
import com.nimbusds.jose.Payload
import com.nimbusds.jose.crypto.RSADecrypter
import com.nimbusds.jose.crypto.RSAEncrypter
import com.nimbusds.jose.crypto.RSASSAVerifier
import com.nimbusds.jose.jwk.JWK
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT

// BCSC KeyPair package imports
import com.bcsccore.keypair.core.exceptions.BcscException
import com.bcsccore.keypair.core.exceptions.KeypairGenerationException
import com.bcsccore.keypair.core.interfaces.BcscKeyPairSource
import com.bcsccore.keypair.core.interfaces.KeyPairInfoSource
import com.bcsccore.keypair.core.models.BcscKeyPair
import com.bcsccore.keypair.core.models.KeyPairInfo
import com.bcsccore.keypair.repos.key.BcscKeyPairRepo
import com.bcsccore.keypair.repos.keypairinfo.SimpleKeyPairInfoSource

// BCSC File Port imports
import com.bcsccore.fileport.FileReader
import com.bcsccore.fileport.FileReaderFactory
import com.bcsccore.fileport.decryption.DecryptedFileData
import com.bcsccore.fileport.decryption.DecryptedFileReader
import com.bcsccore.fileport.decryption.DecryptionException
import com.facebook.react.bridge.Dynamic

// Authentication service imports
import com.bcsccore.authentication.device.DeviceAuthenticationService
import com.bcsccore.authentication.device.DeviceAuthenticationServiceImpl
import com.bcsccore.authentication.device.DeviceAuthenticationResult
import com.bcsccore.authentication.PinService

// Native-compatible storage imports
import com.bcsccore.storage.NativeCompatibleStorage
import com.bcsccore.storage.NativeAccount
import com.bcsccore.storage.NativeAccountSecurityType
import com.bcsccore.storage.NativePenalty
import com.bcsccore.storage.NativeTokens
import com.bcsccore.storage.NativeToken
import com.bcsccore.storage.NativeTokenType
import com.bcsccore.storage.NativeIdToken
import com.bcsccore.storage.NativeAuthorizationRequest
import com.bcsccore.storage.NativeAddress
import com.bcsccore.storage.NativeRequestStatus
import com.bcsccore.storage.NativeAuthorizationMethod

/**
 * BC Services Card React Native Module
 *
 * Provides secure key management, token handling, and authentication services
 * for BC Services Card integration in React Native applications.
 */
@ReactModule(name = BcscCoreModule.NAME)
class BcscCoreModule(
    reactContext: ReactApplicationContext,
) : BcscCoreSpec(reactContext) {
    companion object {
        const val NAME = "BcscCore"

        // Token type constants
        private const val TOKEN_TYPE_ACCESS = 0
        private const val TOKEN_TYPE_REFRESH = 1
        private const val TOKEN_TYPE_REGISTRATION = 2

        // JWT expiration in seconds
        private const val JWT_EXPIRATION_SECONDS = 3600 // 1 hour

        // Notification channel constants
        private const val NOTIFICATION_CHANNEL_ID = "bcsc_foreground_notifications"
        private const val NOTIFICATION_CHANNEL_NAME = "BCSC Notifications"
    }

    override fun getName(): String = NAME

    // Track if notification channel has been created (only needs to happen once)
    @Volatile
    private var notificationChannelCreated = false

    // Initialize the BC Services Card KeyPair functionality
    private val keyPairSource: BcscKeyPairSource by lazy {
        val keyPairInfoSource = SimpleKeyPairInfoSource(reactApplicationContext)
        BcscKeyPairRepo(keyPairInfoSource)
    }

    // Initialize native-compatible storage for rollback support
    private val nativeStorage: NativeCompatibleStorage by lazy {
        NativeCompatibleStorage(reactApplicationContext)
    }

    @ReactMethod
    override fun getKeyPair(
        keyAlias: String,
        promise: Promise,
    ) {
        try {
            // Use the bcsc-keypair-port to get the key pair
            val bcscKeyPair = keyPairSource.getBcscKeyPair(keyAlias)

            if (bcscKeyPair == null) {
                promise.reject("E_KEY_NOT_FOUND", "Key pair with alias '$keyAlias' not found.")
                return
            }

            // Convert to React Native response format
            val keyPair: WritableMap = Arguments.createMap()
            keyPair.putString("id", bcscKeyPair.getKeyInfo().getAlias())

            // Handle public key
            val javaKeyPair = bcscKeyPair.getKeyPair()
            if (javaKeyPair?.public != null) {
                javaKeyPair.public.encoded?.let { publicEncoded ->
                    keyPair.putString("public", publicEncoded.toBase64String())
                }
            }

            // Handle private key availability
            if (javaKeyPair?.private != null) {
                keyPair.putString("privateKeyAvailable", "true")
                // Note: Private key data typically cannot be extracted from Android KeyStore
                // This is by design for security
            } else {
                keyPair.putString("privateKeyAvailable", "false")
            }

            promise.resolve(keyPair)
        } catch (e: BcscException) {
            promise.reject("E_BCSC_KEY_ERROR", "Error retrieving key pair using bcsc-keypair-port: ${e.devMessage}", e)
        } catch (e: Exception) {
            promise.reject("E_KEY_ERROR", "Unexpected error retrieving key pair: ${e.message}", e)
        }
    }

    @ReactMethod
    override fun getAllKeys(promise: Promise) {
        try {
            // Check if KeyStore is available
            if (!keyPairSource.isAvailable()) {
                promise.reject("E_KEYSTORE_UNAVAILABLE", "Android KeyStore is not available on this device")
                return
            }

            // Get the current key pair (this will create one if none exists)
            val currentKeyPair = keyPairSource.getCurrentBcscKeyPair()

            val privateKeys: WritableArray = Arguments.createArray()
            val keyInfo: WritableMap = Arguments.createMap()

            // Add the current key pair info
            val info = currentKeyPair.getKeyInfo()
            keyInfo.putString("id", info.getAlias())
            keyInfo.putString("keyType", "RSA") // bcsc-keypair-port uses RSA keys
            keyInfo.putInt("keySize", 4096) // bcsc-keypair-port uses 4096-bit RSA keys
            keyInfo.putDouble("created", info.getCreatedAt().toDouble())

            privateKeys.pushMap(keyInfo)

            promise.resolve(privateKeys)
        } catch (e: BcscException) {
            promise.reject("E_BCSC_KEYSTORE_ERROR", "Error accessing bcsc keystore: ${e.devMessage}", e)
        } catch (e: Exception) {
            promise.reject("E_KEYSTORE_ERROR", "Unexpected error accessing keystore: ${e.message}", e)
        }
    }

    @ReactMethod
    override fun getToken(
        tokenType: Int,
        promise: Promise,
    ) {
        Log.d(NAME, "getToken called with tokenType: $tokenType")

        // First, get the account to obtain the account ID
        val account = getAccountSync()
        if (account == null) {
            Log.w(NAME, "getToken - Cannot get account, returning null")
            promise.resolve(null)
            return
        }

        val accountId = account.getString("id")
        if (accountId == null || accountId.isEmpty()) {
            Log.w(NAME, "getToken - Account ID is null or empty, returning null")
            promise.resolve(null)
            return
        }

        Log.d(NAME, "getToken - Using account ID: $accountId")

        // Attempt to read and decrypt the token file using bcsc-file-port
        try {
            val fileReader: FileReader = FileReaderFactory.createSimpleFileReader(reactApplicationContext)

            // Get and log the base storage directory
            val baseDir = fileReader.getStorageDirectory()
            Log.d(NAME, "Base files directory: ${baseDir.absolutePath}")

            // List all available files for debugging
            val availableFiles = fileReader.listFiles()
            Log.d(
                NAME,
                "Available files in base directory (${availableFiles.size} files): ${availableFiles.joinToString(
                    ", ",
                )}",
            )

            val issuer = account.getString("issuer")
            if (issuer.isNullOrEmpty()) {
                Log.w(NAME, "getToken - Account issuer is null or empty, cannot determine environment")
                promise.resolve(null)
                return
            }

            // Use DecryptedFileReader to read and decrypt the token file
            val decryptedFileReader = DecryptedFileReader(reactApplicationContext)
            val issuerName = nativeStorage.getDefaultIssuerName()
            val relativePath = "$issuerName/$accountId/tokens"
            val tokenFilePath = "${baseDir.absolutePath}/$relativePath"
            Log.d(NAME, "Full token file path: $tokenFilePath")

            try {
                val decryptedFileData: DecryptedFileData? = decryptedFileReader.readDecryptedFile(relativePath)

                if (decryptedFileData != null) {
                    Log.d(
                        NAME,
                        "Successfully read and decrypted token file using bcsc-file-port from path: $tokenFilePath",
                    )
                    Log.d(NAME, "Decrypted content size: ${decryptedFileData.decryptedSize} bytes")
                    Log.d(NAME, "Content appears to be JSON: ${decryptedFileData.isJson()}")

                    if (decryptedFileData.isJson()) {
                        try {
                            val jsonObject = JSONObject(decryptedFileData.decryptedContent)

                            when (tokenType) {
                                TOKEN_TYPE_ACCESS -> { // Access Token
                                    if (jsonObject.has("accessToken")) {
                                        val accessTokenObj = jsonObject.getJSONObject("accessToken")
                                        val token = createTokenFromJson(accessTokenObj, tokenType)
                                        Log.d(NAME, "Returning access token with id: ${accessTokenObj.optString("id")}")
                                        promise.resolve(token)
                                        return
                                    }
                                }

                                TOKEN_TYPE_REFRESH -> { // Refresh Token
                                    if (jsonObject.has("refreshToken")) {
                                        val refreshTokenObj = jsonObject.getJSONObject("refreshToken")
                                        val token = createTokenFromJson(refreshTokenObj, tokenType)
                                        Log.d(
                                            NAME,
                                            "Returning refresh token with id: ${refreshTokenObj.optString("id")}",
                                        )
                                        promise.resolve(token)
                                        return
                                    }
                                }

                                TOKEN_TYPE_REGISTRATION -> { // Registration Token (idToken)
                                    if (jsonObject.has("idToken")) {
                                        val idTokenObj = jsonObject.getJSONObject("idToken")
                                        val token = createRegistrationTokenFromJson(idTokenObj, tokenType)
                                        Log.d(NAME, "Returning registration token (idToken)")
                                        promise.resolve(token)
                                        return
                                    }
                                }
                            }

                            Log.d(NAME, "Token type $tokenType not found in decrypted JSON")
                            promise.resolve(null)
                        } catch (e: Exception) {
                            Log.e(NAME, "Failed to parse decrypted JSON content: ${e.message}", e)
                            promise.resolve(null)
                        }
                    } else {
                        Log.d(NAME, "Decrypted content is not valid JSON")
                        promise.resolve(null)
                    }
                } else {
                    Log.d(
                        NAME,
                        "Failed to read token file using bcsc-file-port from path: $tokenFilePath - file not found or empty",
                    )
                    promise.resolve(null)
                }
            } catch (e: DecryptionException) {
                Log.e(NAME, "Failed to decrypt token file from path: $tokenFilePath - ${e.message}", e)
                promise.resolve(null)
            }
        } catch (e: Exception) {
            Log.e(NAME, "Exception occurred while reading/decrypting token file using bcsc-file-port: ${e.message}", e)
            promise.resolve(null)
        }
    }

    // MARK: - Token creation helper methods

    private fun createTokenFromJson(
        tokenObj: JSONObject,
        tokenType: Int,
    ): WritableMap {
        val token: WritableMap = Arguments.createMap()
        token.putString("id", tokenObj.optString("id", "unknown"))
        token.putInt("type", tokenType)
        token.putString("token", tokenObj.optString("token", ""))

        // Parse timestamps from various possible formats
        val createdStr = tokenObj.optString("created", "")
        val expiryStr = tokenObj.optString("expiry", "")

        if (createdStr.isNotEmpty()) {
            val createdTimestamp = parseFlexibleDateToTimestamp(createdStr)
            if (createdTimestamp > 0) {
                token.putDouble("created", createdTimestamp)
            }
        }

        if (expiryStr.isNotEmpty()) {
            val expiryTimestamp = parseFlexibleDateToTimestamp(expiryStr)
            if (expiryTimestamp > 0) {
                token.putDouble("expiry", expiryTimestamp)
            }
        }

        return token
    }

    private fun createRegistrationTokenFromJson(
        idTokenObj: JSONObject,
        tokenType: Int,
    ): WritableMap {
        val token: WritableMap = Arguments.createMap()

        // Check if this is stored as rawToken (our new format)
        if (idTokenObj.has("rawToken")) {
            val rawToken = idTokenObj.getString("rawToken")
            token.putString("id", "registration-token")
            token.putInt("type", tokenType)
            token.putString("token", rawToken)
            Log.d(NAME, "Retrieved registration token from rawToken field")
        } else {
            // Legacy format with jti, iat, exp
            token.putString("id", idTokenObj.optString("jti", "unknown"))
            token.putInt("type", tokenType)
            // For registration token, we use the entire idToken object as a JSON string
            token.putString("token", idTokenObj.toString())

            // Parse iat (issued at) and exp (expiry) from idToken
            val iat = idTokenObj.optLong("iat", 0)
            val exp = idTokenObj.optLong("exp", 0)

            if (iat > 0) {
                token.putDouble("created", iat.toDouble())
            }

            if (exp > 0) {
                token.putDouble("expiry", exp.toDouble())
            }
        }

        return token
    }

    /**
     * Parses a date string in various formats and converts it to a Unix timestamp in seconds.
     * Supports ISO 8601 and US date formats.
     */
    private fun parseFlexibleDateToTimestamp(dateString: String): Double {
        if (dateString.isEmpty()) return 0.0

        return try {
            // Supported date formats in order of preference
            val formats =
                arrayOf(
                    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US), // ISO with milliseconds
                    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US), // ISO without milliseconds
                    SimpleDateFormat("MMM dd, yyyy h:mm:ss a", Locale.US), // US format: "Jun 26, 2025 3:39:55 PM"
                    SimpleDateFormat("MMM d, yyyy h:mm:ss a", Locale.US), // Alternative US format
                    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS", Locale.US), // ISO without Z
                    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US), // ISO without Z and milliseconds
                )

            for (format in formats) {
                try {
                    format.timeZone = TimeZone.getTimeZone("UTC")
                    val date = format.parse(dateString)
                    if (date != null) {
                        val timestamp = date.time / 1000.0 // Convert to seconds
                        Log.d(NAME, "Successfully parsed date '$dateString' to timestamp: $timestamp")
                        return timestamp
                    }
                } catch (e: Exception) {
                    // Continue to next format
                }
            }

            Log.w(NAME, "Failed to parse date with any known format: $dateString")
            0.0
        } catch (e: Exception) {
            Log.w(NAME, "Exception parsing date: $dateString", e)
            0.0
        }
    }

    /**
     * Saves a token to secure native-compatible encrypted storage.
     * Matches TypeScript: setToken(tokenType: number, token: string, expiry?: number): Promise<boolean>
     */
    @ReactMethod
    override fun setToken(
        tokenType: Int,
        token: String,
        expiry: Double?,
        promise: Promise,
    ) {
        Log.d(NAME, "setToken called with tokenType: $tokenType")

        try {
            // Get the account to obtain issuer and account ID
            val account = getAccountSync()
            if (account == null) {
                promise.reject("E_ACCOUNT_NOT_FOUND", "Account not found")
                return
            }

            val accountId = account.getString("id")
            val issuer = account.getString("issuer")

            if (accountId.isNullOrEmpty() || issuer.isNullOrEmpty()) {
                promise.reject("E_ACCOUNT_INVALID", "Account ID or issuer is null or empty")
                return
            }

            val issuerName = nativeStorage.getIssuerNameFromIssuer(issuer)
            val clientId = account.getString("clientID") ?: accountId

            // Read existing tokens or create new container
            var existingTokens = nativeStorage.readTokens(issuerName, accountId)

            // Create the token ID matching iOS format
            val tokenId = "$clientId/tokens/$tokenType/1"

            // Create expiry date if provided
            val expiryDate =
                if (expiry != null && expiry > 0) {
                    Date((expiry * 1000).toLong())
                } else {
                    null
                }

            // Create the new token
            val newToken =
                NativeToken(
                    id = tokenId,
                    type =
                        when (tokenType) {
                            TOKEN_TYPE_ACCESS -> NativeTokenType.ACCESS

                            TOKEN_TYPE_REFRESH -> NativeTokenType.REFRESH

                            // Default, though Registration tokens have different handling
                            else -> NativeTokenType.ACCESS
                        },
                    token = token,
                    created = Date(),
                    expiry = expiryDate,
                )

            // Update the tokens container based on token type
            val updatedTokens =
                when (tokenType) {
                    TOKEN_TYPE_ACCESS -> {
                        existingTokens?.copy(accessToken = newToken)
                            ?: NativeTokens(issuer = issuer, accessToken = newToken)
                    }

                    TOKEN_TYPE_REFRESH -> {
                        existingTokens?.copy(refreshToken = newToken)
                            ?: NativeTokens(issuer = issuer, refreshToken = newToken)
                    }

                    TOKEN_TYPE_REGISTRATION -> {
                        // For registration token, we store it in idToken with rawToken field
                        val idToken = NativeIdToken(rawToken = token)
                        existingTokens?.copy(idToken = idToken)
                            ?: NativeTokens(issuer = issuer, idToken = idToken)
                    }

                    else -> {
                        promise.reject("E_INVALID_TOKEN_TYPE", "Invalid token type: $tokenType")
                        return
                    }
                }

            // Save to encrypted storage
            val success = nativeStorage.saveTokens(updatedTokens, issuerName, accountId)

            if (success) {
                Log.d(NAME, "setToken: Successfully saved token of type $tokenType")
                promise.resolve(true)
            } else {
                promise.reject("E_TOKEN_SAVE_FAILED", "Failed to save token to encrypted storage")
            }
        } catch (e: Exception) {
            Log.e(NAME, "setToken: Error saving token", e)
            promise.reject("E_TOKEN_SAVE_ERROR", "Error saving token: ${e.message}", e)
        }
    }

    /**
     * Deletes a token from secure native-compatible encrypted storage.
     * Matches TypeScript: deleteToken(tokenType: number): Promise<boolean>
     */
    @ReactMethod
    override fun deleteToken(
        tokenType: Int,
        promise: Promise,
    ) {
        Log.d(NAME, "deleteToken called with tokenType: $tokenType")

        try {
            // Get the account to obtain issuer and account ID
            val account = getAccountSync()
            if (account == null) {
                // No account means no tokens to delete
                promise.resolve(true)
                return
            }

            val accountId = account.getString("id")
            val issuer = account.getString("issuer")

            if (accountId.isNullOrEmpty() || issuer.isNullOrEmpty()) {
                // No valid account, nothing to delete
                promise.resolve(true)
                return
            }

            val issuerName = nativeStorage.getIssuerNameFromIssuer(issuer)

            // Read existing tokens
            val existingTokens = nativeStorage.readTokens(issuerName, accountId)

            if (existingTokens == null) {
                // No tokens exist, nothing to delete
                Log.d(NAME, "deleteToken: No tokens found for account")
                promise.resolve(true)
                return
            }

            // Update the tokens container by removing the specified token type
            val updatedTokens =
                when (tokenType) {
                    TOKEN_TYPE_ACCESS -> {
                        existingTokens.copy(accessToken = null)
                    }

                    TOKEN_TYPE_REFRESH -> {
                        existingTokens.copy(refreshToken = null)
                    }

                    TOKEN_TYPE_REGISTRATION -> {
                        existingTokens.copy(idToken = null)
                    }

                    else -> {
                        promise.reject("E_INVALID_TOKEN_TYPE", "Invalid token type: $tokenType")
                        return
                    }
                }

            // Check if all tokens are now null, if so delete the entire file
            if (updatedTokens.accessToken == null &&
                updatedTokens.refreshToken == null &&
                updatedTokens.idToken == null
            ) {
                nativeStorage.deleteTokens(issuerName, accountId)
                Log.d(NAME, "deleteToken: Deleted all tokens for account")
            } else {
                // Save updated tokens with the removed entry
                nativeStorage.saveTokens(updatedTokens, issuerName, accountId)
                Log.d(NAME, "deleteToken: Removed token of type $tokenType")
            }

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "deleteToken: Error deleting token", e)
            promise.reject("E_TOKEN_DELETE_ERROR", "Error deleting token: ${e.message}", e)
        }
    }

    @ReactMethod
    override fun setIssuer(
        issuer: String,
        promise: Promise,
    ) {
        Log.d(NAME, "setIssuer called with issuer: $issuer")
        try {
            nativeStorage.saveIssuerToFile(issuer)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "setIssuer: Error saving issuer to file: ${e.message}", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    override fun getIssuer(promise: Promise) {
        Log.d(NAME, "getIssuer called")
        try {
            val issuerFile = File(reactApplicationContext.filesDir, "issuer")
            if (!issuerFile.exists()) {
                // No issuer file exists, return null
                promise.resolve(null)
                return
            }

            val issuer = nativeStorage.readEncryptedFile(issuerFile)
            promise.resolve(issuer)
        } catch (e: Exception) {
            Log.e(NAME, "getIssuer: Error reading issuer from file: ${e.message}", e)
            promise.resolve(null)
        }
    }

    @ReactMethod
    override fun setAccount(
        account: ReadableMap,
        promise: Promise,
    ) {
        try {
            // Validate required fields
            if (!account.hasKey("issuer") || !account.hasKey("clientID") || !account.hasKey("securityMethod")) {
                promise.reject("E_INVALID_PARAMETERS", "Account must have issuer, clientID, and securityMethod fields")
                return
            }

            val issuer = account.getString("issuer")
            val clientID = account.getString("clientID")
            val securityMethod = account.getString("securityMethod")

            if (issuer.isNullOrEmpty() || clientID.isNullOrEmpty() || securityMethod.isNullOrEmpty()) {
                promise.reject("E_INVALID_PARAMETERS", "Account issuer, clientID, and securityMethod cannot be empty")
                return
            }

            try {
                // Get issuer name for native-compatible storage path
                val issuerName = nativeStorage.getIssuerNameFromIssuer(issuer)
                Log.d(NAME, "setAccount - Using issuer name: $issuerName")

                // Try to load existing account
                val existingAccounts = nativeStorage.readAccounts(issuerName)
                val existingAccount = existingAccounts?.firstOrNull()

                val accountId: String
                val createdAt: Long

                if (existingAccount != null) {
                    // Update existing account - preserve ID and creation timestamp
                    Log.d(NAME, "setAccount - Updating existing account with id: ${existingAccount.uuid}")
                    accountId = existingAccount.uuid
                    createdAt = existingAccount.createdAt
                } else {
                    // Create new account
                    accountId = UUID.randomUUID().toString()
                    createdAt = System.currentTimeMillis()
                    Log.d(NAME, "setAccount - Creating new account with generated id: $accountId")
                }

                // Map securityMethod to native AccountSecurityType
                val accountSecurityType =
                    when (securityMethod) {
                        "device_authentication" -> NativeAccountSecurityType.DeviceSecurity
                        "app_pin_no_device_authn" -> NativeAccountSecurityType.PinNoDeviceAuth
                        "app_pin_has_device_authn" -> NativeAccountSecurityType.PinWithDeviceAuth
                        else -> NativeAccountSecurityType.DeviceSecurity
                    }

                // Get optional nickname
                val nickname =
                    when {
                        account.hasKey("displayName") -> account.getString("displayName")
                        account.hasKey("nickname") -> account.getString("nickname")
                        else -> null
                    }

                // Get optional penalty info
                val failedAttempts =
                    if (account.hasKey("failedAttemptCount")) {
                        account.getInt("failedAttemptCount")
                    } else {
                        0
                    }

                // Create native-compatible account object
                val nativeAccount =
                    NativeAccount(
                        uuid = accountId,
                        nickName = nickname,
                        issuer = issuer,
                        clientId = clientID,
                        createdAt = createdAt,
                        penalty = NativePenalty(penaltyAttempts = failedAttempts),
                        accountSecurityType = accountSecurityType,
                    )

                // Save using native-compatible encrypted storage
                // Native app stores accounts as a list (for multi-account support)
                val accounts = listOf(nativeAccount)

                if (nativeStorage.saveAccounts(accounts, issuerName)) {
                    Log.d(NAME, "setAccount - Successfully saved account to native-compatible storage")
                    promise.resolve(null)
                } else {
                    Log.e(NAME, "setAccount - Failed to save account to native-compatible storage")
                    promise.reject("E_STORAGE_ERROR", "Failed to save account to native-compatible storage")
                }
            } catch (e: Exception) {
                Log.e(NAME, "setAccount - Exception occurred while saving account: ${e.message}", e)
                promise.reject("E_FILE_ACCESS_ERROR", "Failed to save account: ${e.message}")
            }
        } catch (e: Exception) {
            Log.e(NAME, "setAccount - Unexpected error: ${e.message}", e)
            promise.reject("E_UNEXPECTED_ERROR", "Unexpected error while setting account: ${e.message}")
        }
    }

    @ReactMethod
    override fun getAccount(promise: Promise) {
        Log.d(NAME, "getAccount called")

        // Try to read from native-compatible storage first (based on default issuer name)
        try {
            val issuerName = nativeStorage.getDefaultIssuerName()
            Log.d(NAME, "getAccount - Trying native storage with issuer name: $issuerName")

            val accounts = nativeStorage.readAccounts(issuerName)
            if (accounts != null && accounts.isNotEmpty()) {
                val nativeAccount = accounts.first()
                Log.d(NAME, "getAccount - Found account in native storage: ${nativeAccount.uuid}")

                // Convert to WritableMap for React Native
                val account = convertNativeAccountToWritableMap(nativeAccount)
                promise.resolve(account)
                return
            }

            Log.d(NAME, "getAccount - No accounts found in native storage for issuer: $issuerName")
        } catch (e: Exception) {
            Log.w(NAME, "getAccount - Error reading from native storage: ${e.message}")
        }

        // Fallback: try reading from old flat file format (for migration)
        try {
            val fileReader: FileReader = FileReaderFactory.createSimpleFileReader(reactApplicationContext)
            val relativePath = "accounts"
            val accountFileBytes = fileReader.readFile(relativePath)

            if (accountFileBytes != null && accountFileBytes.isNotEmpty()) {
                val accountFileContent = String(accountFileBytes, Charsets.UTF_8)
                Log.d(NAME, "getAccount - Found old-format accounts file, parsing...")

                try {
                    val jsonArray = org.json.JSONArray(accountFileContent)
                    if (jsonArray.length() > 0) {
                        val accountObj = jsonArray.getJSONObject(0)
                        Log.d(NAME, "getAccount - Found account in old format: ${accountObj.optString("uuid")}")

                        // Parse the account data
                        val account = createNativeAccountFromJson(accountObj)
                        promise.resolve(account)
                        return
                    }
                } catch (e: Exception) {
                    Log.w(NAME, "getAccount - Failed to parse old-format accounts: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.w(NAME, "getAccount - Error reading old-format accounts: ${e.message}")
        }

        // No account found in any storage
        Log.d(NAME, "getAccount - No account found in any storage")
        promise.resolve(null)
    }

    /**
     * Converts a NativeAccount to a WritableMap for React Native.
     */
    private fun convertNativeAccountToWritableMap(nativeAccount: NativeAccount): WritableMap {
        val account: WritableMap = Arguments.createMap()

        account.putString("id", nativeAccount.uuid)
        account.putString("issuer", nativeAccount.issuer)
        account.putString("clientID", nativeAccount.clientId)

        // Map AccountSecurityType to securityMethod
        val securityMethod =
            when (nativeAccount.accountSecurityType) {
                NativeAccountSecurityType.DeviceSecurity -> "device_authentication"
                NativeAccountSecurityType.PinNoDeviceAuth -> "app_pin_no_device_authn"
                NativeAccountSecurityType.PinWithDeviceAuth -> "app_pin_has_device_authn"
            }
        account.putString("securityMethod", securityMethod)

        // Optional fields
        nativeAccount.nickName?.let { nickname ->
            account.putString("displayName", nickname)
            account.putString("nickname", nickname)
        }

        account.putInt("failedAttemptCount", nativeAccount.penalty.penaltyAttempts)
        account.putBoolean("didPostNicknameToServer", false)

        return account
    }

    /**
     * Converts a JSON account object to a NativeAccount WritableMap.
     * Maps JSON fields to the NativeAccount interface specification.
     * Used for reading old-format accounts during migration.
     */
    private fun createNativeAccountFromJson(accountObj: JSONObject): WritableMap {
        val account: WritableMap = Arguments.createMap()

        // Map JSON fields to NativeAccount interface fields
        account.putString("id", accountObj.optString("uuid", "unknown")) // uuid -> id
        account.putString("issuer", accountObj.optString("issuer", ""))
        account.putString("clientID", accountObj.optString("clientId", "")) // clientId -> clientID

        // Map accountSecurityType to securityMethod enum values
        val securityType = accountObj.optString("accountSecurityType", "")
        val securityMethod =
            when (securityType) {
                "DeviceSecurity" -> "device_authentication"
                "PinNoDeviceAuth" -> "app_pin_no_device_authn"
                "PinWithDeviceAuth" -> "app_pin_has_device_authn"
                else -> "device_authentication" // Default fallback
            }
        account.putString("securityMethod", securityMethod)

        // Optional fields
        val nickName = accountObj.optString("nickName", "")
        if (nickName.isNotEmpty()) {
            account.putString("displayName", nickName)
            account.putString("nickname", nickName)
        }

        // Parse penalty information
        val penaltyObj = accountObj.optJSONObject("penalty")
        val failedAttempts = penaltyObj?.optInt("penaltyAttempts", 0) ?: 0
        account.putInt("failedAttemptCount", failedAttempts)

        // Default values for fields not available in JSON
        account.putBoolean("didPostNicknameToServer", false)

        Log.d(
            NAME,
            "Created account: id=${account.getString("id")}, " +
                "issuer=${account.getString("issuer")}, " +
                "clientID=${account.getString("clientID")}, " +
                "securityMethod=${account.getString("securityMethod")}",
        )

        return account
    }

    /**
     * Synchronously gets the device ID for use in JWT claims.
     * Uses the same method as the async getDeviceId but returns directly.
     */
    private fun getDeviceIdSync(): String =
        try {
            val deviceId =
                Settings.Secure.getString(
                    reactApplicationContext.contentResolver,
                    Settings.Secure.ANDROID_ID,
                )

            if (deviceId.isNullOrEmpty()) {
                UUID.randomUUID().toString()
            } else {
                deviceId
            }
        } catch (e: Exception) {
            UUID.randomUUID().toString()
        }

    private fun dynamicToAny(dynamic: Dynamic): Any? =
        when (dynamic.type) {
            ReadableType.Null -> {
                null
            }

            ReadableType.Boolean -> {
                dynamic.asBoolean()
            }

            ReadableType.Number -> {
                dynamic.asDouble()
            }

            ReadableType.String -> {
                dynamic.asString()
            }

            ReadableType.Map -> {
                val map = dynamic.asMap()
                map?.let {
                    val result = mutableMapOf<String, Any?>()
                    val iterator = it.keySetIterator()
                    while (iterator.hasNextKey()) {
                        val key = iterator.nextKey()
                        result[key] = dynamicToAny(it.getDynamic(key))
                    }
                    result
                }
            }

            ReadableType.Array -> {
                val arr = dynamic.asArray()
                arr?.let {
                    val result = mutableListOf<Any?>()
                    for (i in 0 until it.size()) {
                        result.add(dynamicToAny(it.getDynamic(i)))
                    }
                    result
                }
            }
        }

    @ReactMethod
    override fun getDeviceId(promise: Promise) {
        try {
            // Use the same device ID method as ias-android
            val deviceId =
                Settings.Secure.getString(
                    reactApplicationContext.contentResolver,
                    Settings.Secure.ANDROID_ID,
                )

            if (deviceId.isNullOrEmpty()) {
                // Fallback to a generated UUID if ANDROID_ID is not available
                val fallbackId = UUID.randomUUID().toString()
                Log.w(NAME, "ANDROID_ID not available, using fallback UUID: $fallbackId")
                promise.resolve(fallbackId)
            } else {
                Log.d(NAME, "Retrieved device ID from ANDROID_ID")
                promise.resolve(deviceId)
            }
        } catch (e: Exception) {
            Log.e(NAME, "Error getting device ID: ${e.message}", e)
            // Fallback to UUID on any error
            val fallbackId = UUID.randomUUID().toString()
            promise.resolve(fallbackId)
        }
    }

    @ReactMethod
    override fun getRefreshTokenRequestBody(
        issuer: String,
        clientID: String,
        refreshToken: String,
        promise: Promise,
    ) {
        // Validate all parameters are provided
        if (issuer.isEmpty() || clientID.isEmpty() || refreshToken.isEmpty()) {
            promise.reject(
                "E_INVALID_PARAMETERS",
                "All parameters (issuer, clientID, refreshToken) are required and cannot be empty.",
            )
            return
        }

        try {
            // Create JWT assertion for OAuth2 client credentials
            val now = Date()
            val expiration = Date(now.time + JWT_EXPIRATION_SECONDS * 1000)

            val claimsSet =
                JWTClaimsSet
                    .Builder()
                    .audience(issuer)
                    .issuer(clientID)
                    .subject(clientID)
                    .issueTime(now)
                    .expirationTime(expiration)
                    .jwtID(UUID.randomUUID().toString())
                    .build()

            // Sign the JWT assertion
            val clientAssertion = keyPairSource.signAndSerializeClaimsSet(claimsSet)

            // Format OAuth2 request body for refresh token
            val assertionType = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
            val grantType = "refresh_token"

            // Use the actual refresh token provided as parameter
            val body =
                "grant_type=$grantType&client_id=$clientID&client_assertion_type=$assertionType" +
                    "&client_assertion=$clientAssertion&refresh_token=$refreshToken"

            Log.d(
                NAME,
                "getRefreshTokenRequestBody: Successfully created request body with issuer: $issuer, clientID: $clientID",
            )
            promise.resolve(body)
        } catch (e: BcscException) {
            Log.e(NAME, "getRefreshTokenRequestBody: BCSC error: ${e.devMessage}", e)
            promise.reject(
                "E_BCSC_REFRESH_TOKEN_ERROR",
                "Error creating refresh token request with bcsc-keypair-port: ${e.devMessage}",
                e,
            )
        } catch (e: Exception) {
            Log.e(NAME, "getRefreshTokenRequestBody: Unexpected error: ${e.message}", e)
            promise.reject("E_REFRESH_TOKEN_ERROR", "Unexpected error creating refresh token request: ${e.message}", e)
        }
    }

    @ReactMethod
    override fun signPairingCode(
        code: String,
        issuer: String,
        clientID: String,
        fcmDeviceToken: String,
        deviceToken: String?,
        promise: Promise,
    ) {
        try {
            // Use empty string if deviceToken is not provided
            val actualDeviceToken = deviceToken ?: ""

            // FIXME: Do we need this currentKeyPair? is the call doing something important but we don't need the ouput?
            // Get the current (newest) key pair for signing
            val currentKeyPair = keyPairSource.getCurrentBcscKeyPair()

            // Build JWT claims set for pairing code signing
            val claimsSet =
                JWTClaimsSet
                    .Builder()
                    .audience(issuer)
                    .issuer(clientID)
                    .issueTime(Date())
                    .claim("challenge", code)
                    .claim("challenge_source", "remote_pairing_code") // Assuming this enum value
                    .claim("apns_token", actualDeviceToken)
                    .claim("fcm_device_token", fcmDeviceToken)
                    // Add device information claims
                    .claim("system_name", "Android")
                    .claim("system_version", Build.VERSION.RELEASE)
                    .claim("device_model", Build.MODEL)
                    .claim("device_id", getDeviceIdSync()) // Use proper device ID
                    .claim("device_token", actualDeviceToken)
                    .claim("device_name", getDeviceName())
                    .claim("mobile_id_version", getAppVersion())
                    .claim("mobile_id_build", getAppBuildNumber())
                    .claim("has_other_accounts", false) // This could be made dynamic
                    .build()

            // Sign the JWT using bcsc-keypair-port
            val signedJWT = keyPairSource.signAndSerializeClaimsSet(claimsSet)

            Log.d(
                NAME,
                "signPairingCode: Successfully signed pairing code with issuer: $issuer, clientID: $clientID",
            )
            promise.resolve(signedJWT)
        } catch (e: BcscException) {
            Log.e(NAME, "signPairingCode: BCSC signing error: ${e.devMessage}", e)
            promise.reject(
                "E_BCSC_SIGNING_ERROR",
                "Error signing pairing code with bcsc-keypair-port: ${e.devMessage}",
                e,
            )
        } catch (e: Exception) {
            Log.e(NAME, "signPairingCode: Unexpected error: ${e.message}", e)
            promise.reject("E_SIGNING_ERROR", "Unexpected error signing pairing code: ${e.message}", e)
        }
    }

    @ReactMethod
    override fun getDynamicClientRegistrationBody(
        fcmDeviceToken: String,
        deviceToken: String?,
        attestation: String?,
        nickname: String?,
        promise: Promise,
    ) {
        try {
            // Use empty string if deviceToken is not provided
            val actualDeviceToken = deviceToken ?: ""

            // Get or create the current key pair
            val currentKeyPair = keyPairSource.getCurrentBcscKeyPair()

            // Convert the public key to JWK format
            val publicKeyJWK = keyPairSource.convertBcscKeyPairToJWK(currentKeyPair)

            // Create device info JWT claims
            val deviceInfoClaimsBuilder =
                JWTClaimsSet
                    .Builder()
                    .claim("app_set_id", getAppSetId())
                    .claim("system_name", "Android")
                    .claim("system_version", Build.VERSION.RELEASE)
                    .claim("device_model", Build.MODEL)
                    .claim("device_id", getDeviceIdSync())
                    .claim("device_token", actualDeviceToken)
                    .claim("device_name", getDeviceName())
                    .claim("fcm_device_token", fcmDeviceToken)
                    .claim("mobile_id_version", getAppVersion())
                    .claim("mobile_id_build", getAppBuildNumber())
                    .claim("has_other_accounts", false)

            // Add attestation if provided
            if (attestation != null && attestation.isNotEmpty()) {
                deviceInfoClaimsBuilder.claim("attestation", attestation)
            }

            val deviceInfoClaims = deviceInfoClaimsBuilder.build()

            // Create unsigned device info JWT with "none" algorithm (similar to iOS implementation)
            val deviceInfoJWTAsString = createUnsignedJWT(deviceInfoClaims)

            // Use nickname if provided, otherwise fall back to device name
            val clientName = if (!nickname.isNullOrEmpty()) nickname else getDeviceName()

            // Create the dynamic client registration body structure using JSONObject for proper serialization
            val registrationBodyJson =
                JSONObject().apply {
                    put("client_name", clientName)
                    put(
                        "redirect_uris",
                        JSONArray().apply {
                            put("http://localhost:8080/")
                        },
                    )
                    put(
                        "grant_types",
                        JSONArray().apply {
                            put("authorization_code")
                        },
                    )
                    put("token_endpoint_auth_method", "private_key_jwt")
                    put(
                        "jwks",
                        JSONObject().apply {
                            put(
                                "keys",
                                JSONArray().apply {
                                    // Add the JWK with proper base64url-encoded RSA parameters
                                    put(
                                        JSONObject().apply {
                                            val rsaKey = publicKeyJWK.toRSAKey()
                                            put("kty", publicKeyJWK.keyType.value)
                                            // RSAKey.getPublicExponent() and getModulus() return Base64URL objects
                                            // Base64URL.toString() gives base64url string
                                            put("e", rsaKey.publicExponent.toString())
                                            // Base64URL.toString() gives base64url string
                                            put("n", rsaKey.modulus.toString())
                                            put("kid", publicKeyJWK.keyID ?: "rsa1")
                                            put("alg", publicKeyJWK.algorithm?.name ?: "RS512")
                                        },
                                    )
                                },
                            )
                        },
                    )
                    put("device_info", deviceInfoJWTAsString)
                    put("application_type", "native")
                }

            // Convert to serialized JSON string
            val registrationBodyAsString = registrationBodyJson.toString()

            Log.d(NAME, "getDynamicClientRegistrationBody: Successfully created DCR body")
            promise.resolve(registrationBodyAsString)
        } catch (e: KeypairGenerationException) {
            Log.e(NAME, "getDynamicClientRegistrationBody: Keypair generation error: ${e.devMessage}", e)
            promise.reject(
                "E_KEYPAIR_GENERATION_FAILED",
                "Failed to generate or retrieve key pair for client registration: ${e.devMessage}",
                e,
            )
        } catch (e: BcscException) {
            Log.e(NAME, "getDynamicClientRegistrationBody: BCSC error: ${e.devMessage}", e)
            promise.reject(
                "E_BCSC_DCR_ERROR",
                "Error creating dynamic client registration with bcsc-keypair-port: ${e.devMessage}",
                e,
            )
        } catch (e: Exception) {
            Log.e(NAME, "getDynamicClientRegistrationBody: Unexpected error: ${e.message}", e)
            promise.reject("E_DCR_ERROR", "Unexpected error creating dynamic client registration: ${e.message}", e)
        }
    }

    @ReactMethod
    override fun getDeviceCodeRequestBody(
        deviceCode: String,
        clientId: String,
        issuer: String,
        confirmationCode: String,
        promise: Promise,
    ) {
        // Validate all parameters are provided
        if (deviceCode.isEmpty() || clientId.isEmpty() || issuer.isEmpty() || confirmationCode.isEmpty()) {
            promise.reject(
                "E_INVALID_PARAMETERS",
                "All parameters (deviceCode, clientId, issuer, confirmationCode) are required and cannot be empty.",
            )
            return
        }

        Log.d(NAME, "getDeviceCodeRequestBody called with clientId: $clientId, issuer: $issuer")

        try {
            // Create JWT assertion for OAuth2 device code request (similar to iOS implementation)
            val now = Date()
            val expiration = Date(now.time + JWT_EXPIRATION_SECONDS * 1000)

            val claimsSet =
                JWTClaimsSet
                    .Builder()
                    .audience(issuer)
                    .issuer(clientId)
                    .subject(clientId)
                    .issueTime(now)
                    .expirationTime(expiration)
                    .jwtID(UUID.randomUUID().toString())
                    .claim("code", confirmationCode) // Add confirmation code as additional claim
                    .build()

            // Sign the JWT assertion using bcsc-keypair-port
            val clientAssertion = keyPairSource.signAndSerializeClaimsSet(claimsSet)

            // Format OAuth2 device code request body (matching iOS implementation)
            val grantType = "urn:ietf:params:oauth:grant-type:device_code"
            val assertionType = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"

            val body =
                "grant_type=$grantType&device_code=$deviceCode&code=$confirmationCode" +
                    "&client_id=$clientId&client_assertion_type=$assertionType&client_assertion=$clientAssertion"

            Log.d(NAME, "getDeviceCodeRequestBody: Successfully created device code request body")
            promise.resolve(body)
        } catch (e: BcscException) {
            Log.e(NAME, "getDeviceCodeRequestBody: BCSC error: ${e.devMessage}", e)
            promise.reject(
                "E_BCSC_DEVICE_CODE_ERROR",
                "Error creating device code request with bcsc-keypair-port: ${e.devMessage}",
                e,
            )
        } catch (e: Exception) {
            Log.e(NAME, "getDeviceCodeRequestBody: Unexpected error: ${e.message}", e)
            promise.reject("E_DEVICE_CODE_ERROR", "Unexpected error creating device code request: ${e.message}", e)
        }
    }

    @ReactMethod
    override fun createPreVerificationJWT(
        deviceCode: String,
        clientID: String,
        promise: Promise,
    ) {
        try {
            // Create JWT claims set for evidence request (matching iOS implementation)
            val claimsSet =
                JWTClaimsSet
                    .Builder()
                    .claim("device_code", deviceCode)
                    .claim("client_id", clientID)
                    .build()

            // Sign the JWT using bcsc-keypair-port
            val signedJWT = keyPairSource.signAndSerializeClaimsSet(claimsSet)

            Log.d(NAME, "createPreVerificationJWT: Successfully created pre-verification JWT")
            promise.resolve(signedJWT)
        } catch (e: BcscException) {
            Log.e(NAME, "createPreVerificationJWT: BCSC signing error: ${e.devMessage}", e)
            promise.reject(
                "E_BCSC_EVIDENCE_JWT_ERROR",
                "Error creating pre-verification JWT with bcsc-keypair-port: ${e.devMessage}",
                e,
            )
        } catch (e: Exception) {
            Log.e(NAME, "createPreVerificationJWT: Unexpected error: ${e.message}", e)
            promise.reject("E_EVIDENCE_JWT_ERROR", "Unexpected error creating pre-verification JWT: ${e.message}", e)
        }
    }

    @ReactMethod
    override fun createSignedJWT(
        claims: ReadableMap,
        promise: Promise,
    ) {
        try {
            // Create JWT claims from the ReadableMap
            val claimsSetBuilder = JWTClaimsSet.Builder()

            val iterator = claims.keySetIterator()

            while (iterator.hasNextKey()) {
                val key = iterator.nextKey()
                val dynamic = claims.getDynamic(key)
                claimsSetBuilder.claim(key, dynamicToAny(dynamic))
            }

            val claimsSet = claimsSetBuilder.build()

            // Sign the JWT using bcsc-keypair-port
            val signedJWT = keyPairSource.signAndSerializeClaimsSet(claimsSet)

            Log.d(NAME, "createSignedJWT: Successfully created JWT")
            promise.resolve(signedJWT)
        } catch (e: BcscException) {
            Log.e(NAME, "createSignedJWT: BCSC signing error: ${e.devMessage}", e)
            promise.reject("E_BCSC_CREATE_JWT_ERROR", "Error creating JWT with bcsc-keypair-port: ${e.devMessage}", e)
        } catch (e: Exception) {
            Log.e(NAME, "createSignedJWT: Unexpected error: ${e.message}", e)
            promise.reject("E_BCSC_CREATE_JWT_ERROR", "Unexpected error creating JWT: ${e.message}", e)
        }
    }

    @ReactMethod
    override fun hashBase64(
        base64: String,
        promise: Promise,
    ) {
        try {
            // Decode base64 string to bytes (similar to iOS implementation)
            val data = android.util.Base64.decode(base64, android.util.Base64.DEFAULT)

            // Create SHA-256 hash
            val digest = java.security.MessageDigest.getInstance("SHA-256")
            val hashBytes = digest.digest(data)

            // Convert hash bytes to hexadecimal string (similar to iOS implementation)
            val hashString = hashBytes.joinToString("") { "%02x".format(it) }

            Log.d(NAME, "hashBase64: Successfully hashed base64 string")
            promise.resolve(hashString)
        } catch (e: IllegalArgumentException) {
            Log.e(NAME, "hashBase64: Invalid base64 input: ${e.message}", e)
            promise.reject("E_INVALID_BASE64", "Input is not valid base64", e)
        } catch (e: java.security.NoSuchAlgorithmException) {
            Log.e(NAME, "hashBase64: SHA-256 algorithm not available: ${e.message}", e)
            promise.reject("E_HASH_ALGORITHM_ERROR", "SHA-256 hashing algorithm not available", e)
        } catch (e: Exception) {
            Log.e(NAME, "hashBase64: Unexpected error: ${e.message}", e)
            promise.reject("E_HASH_ERROR", "Unexpected error hashing base64: ${e.message}", e)
        }
    }

    @ReactMethod
    override fun decodePayload(
        jweString: String,
        promise: Promise,
    ) {
        try {
            // Get the current (latest) key pair for decryption
            val currentKeyPair = keyPairSource.getCurrentBcscKeyPair()

            if (currentKeyPair.getKeyPair()?.private == null) {
                promise.reject("E_NO_KEYS_FOUND", "No private key available for decryption")
                return
            }

            // Parse the JWE object
            val jweObject = JWEObject.parse(jweString)

            // Create RSA decrypter with the private key
            val rsaDecrypter = RSADecrypter(currentKeyPair.getKeyPair()!!.private)

            // Decrypt the JWE to get the JWT payload
            jweObject.decrypt(rsaDecrypter)
            val jwtPayload = jweObject.payload.toString()

            // Parse the JWT to extract and decode the payload (claims)
            val jwtSegments = jwtPayload.split(".")
            if (jwtSegments.size < 2) {
                promise.reject("E_INVALID_JWT", "Invalid JWT format in decrypted payload")
                return
            }

            // Get the payload segment (second segment) and decode it
            var base64Payload = jwtSegments[1]

            // Add padding if necessary (base64url to base64 conversion)
            val requiredLength = (4 * kotlin.math.ceil(base64Payload.length / 4.0)).toInt()
            val paddingLength = requiredLength - base64Payload.length
            if (paddingLength > 0) {
                base64Payload += "=".repeat(paddingLength)
            }

            // Convert base64url to base64 (replace URL-safe characters)
            base64Payload = base64Payload.replace("-", "+").replace("_", "/")

            // Decode the base64 payload
            val decodedBytes = android.util.Base64.decode(base64Payload, android.util.Base64.DEFAULT)
            val decodedPayload = String(decodedBytes, Charsets.UTF_8)

            Log.d(NAME, "decodePayload: Successfully decoded JWE payload")
            promise.resolve(decodedPayload)
        } catch (e: BcscException) {
            Log.e(NAME, "decodePayload: BCSC key error: ${e.devMessage}", e)
            promise.reject("E_BCSC_DECODE_ERROR", "Error accessing key for JWE decryption: ${e.devMessage}", e)
        } catch (e: java.text.ParseException) {
            Log.e(NAME, "decodePayload: JWE parse error: ${e.message}", e)
            promise.reject("E_JWE_PARSE_ERROR", "Invalid JWE format", e)
        } catch (e: com.nimbusds.jose.JOSEException) {
            Log.e(NAME, "decodePayload: JWE decryption error: ${e.message}", e)
            promise.reject("E_JWE_DECRYPT_ERROR", "Failed to decrypt JWE", e)
        } catch (e: IllegalArgumentException) {
            Log.e(NAME, "decodePayload: Base64 decode error: ${e.message}", e)
            promise.reject("E_BASE64_DECODE_ERROR", "Failed to decode base64 payload", e)
        } catch (e: Exception) {
            Log.e(NAME, "decodePayload: Unexpected error: ${e.message}", e)
            promise.reject("E_PAYLOAD_DECODE_ERROR", "Unable to decode payload", e)
        }
    }

    @ReactMethod
    override fun createQuickLoginJWT(
        accessToken: String,
        clientId: String,
        issuer: String,
        clientRefId: String,
        key: ReadableMap,
        fcmDeviceToken: String,
        deviceToken: String?,
        promise: Promise,
    ) {
        try {
            // Validate required parameters
            if (accessToken.isEmpty() || clientId.isEmpty() || issuer.isEmpty() || clientRefId.isEmpty()) {
                promise.reject(
                    "E_INVALID_PARAMETERS",
                    "All required parameters (accessToken, clientId, issuer, clientRefId, fcmDeviceToken) cannot be empty.",
                )
                return
            }

            // Validate that key parameter is a valid JWK structure (matching iOS implementation)
            if (!key.hasKey("n") || !key.hasKey("e") || !key.hasKey("kty")) {
                promise.reject(
                    "E_INVALID_JWK",
                    "Key parameter must be a valid JWK with n, e, and kty fields for encryption.",
                )
                return
            }

            // Use empty string if deviceToken is not provided
            val actualDeviceToken = deviceToken ?: ""

            Log.d(
                NAME,
                "createQuickLoginJWT called with clientId: $clientId, issuer: $issuer, " +
                    "clientRefId: $clientRefId",
            )

            // Create signed JWT following iOS pattern (makeSignedJWTForAccountLogin)
            val signedJWT =
                try {
                    createSignedJWTForAccountLogin(
                        accessToken,
                        clientId,
                        issuer,
                        clientRefId,
                        fcmDeviceToken,
                        actualDeviceToken,
                    )
                } catch (e: Exception) {
                    Log.e(NAME, "createQuickLoginJWT: Failed to create signed JWT: ${e.message}")
                    promise.reject("E_JWT_CREATION_FAILED", "Failed to create signed JWT: ${e.message}", e)
                    return
                }

            // Convert JWK ReadableMap to RSA public key for encryption (matching iOS)
            val publicKey =
                try {
                    convertJWKToRSAPublicKey(key)
                } catch (e: Exception) {
                    Log.e(NAME, "createQuickLoginJWT: Failed to convert JWK to public key: ${e.message}")
                    promise.reject("E_JWK_TO_KEY_FAILED", "Failed to convert JWK to RSA public key: ${e.message}", e)
                    return
                }

            // Encrypt the signed JWT with the provided public key (matching iOS encryptJWTWithPublicKey)
            val encryptedJWT =
                try {
                    encryptJWTWithRSAPublicKey(signedJWT, publicKey)
                } catch (e: Exception) {
                    Log.e(NAME, "createQuickLoginJWT: Failed to encrypt JWT: ${e.message}")
                    promise.reject("E_JWT_ENCRYPTION_FAILED", "Failed to encrypt JWT: ${e.message}", e)
                    return
                }

            Log.d(NAME, "createQuickLoginJWT: Successfully created and encrypted quick login JWT")
            promise.resolve(encryptedJWT)
        } catch (e: BcscException) {
            Log.e(NAME, "createQuickLoginJWT: BCSC error: ${e.devMessage}", e)
            promise.reject("E_BCSC_QUICK_LOGIN_ERROR", "Error creating quick login JWT: ${e.devMessage}", e)
        } catch (e: Exception) {
            Log.e(NAME, "createQuickLoginJWT: Unexpected error: ${e.message}", e)
            promise.reject("E_QUICK_LOGIN_ERROR", "Unexpected error creating quick login JWT: ${e.message}", e)
        }
    }

    /**
     * Creates a signed JWT for account login following iOS QuickLoginProtocol pattern
     * This matches the makeSignedJWTForAccountLogin method in iOS
     */
    private fun createSignedJWTForAccountLogin(
        accessToken: String,
        clientId: String,
        issuer: String,
        clientRefId: String,
        fcmDeviceToken: String,
        deviceToken: String,
    ): String {
        // Generate random UUID for JWT ID (matching iOS pattern)
        val randomUUID = UUID.randomUUID().toString().lowercase()
        val seconds = Date().time / 1000 // Unix timestamp in seconds

        // Calculate HMAC nonce (matching iOS AssertionFactory.commonCryptoHMAC)
        val hmacNonce = createAssertionFactoryHMAC(accessToken, randomUUID, clientId.lowercase())

        // Build JWT claims following BCSC pattern
        val claimsSet =
            JWTClaimsSet
                .Builder()
                .audience(issuer)
                .issuer(clientId.lowercase()) // Match iOS lowercasing
                .claim("client_ref_id", clientRefId)
                .claim("nonce", hmacNonce)
                .issueTime(Date(seconds * 1000)) // Convert back to Date
                .jwtID(randomUUID)
                // Add device information claims (matching iOS addDeviceInfoClaims)
                .claim("system_name", "Android")
                .claim("system_version", Build.VERSION.RELEASE)
                .claim("device_model", Build.MODEL)
                .claim("device_id", UUID.randomUUID().toString())
                .claim("device_token", deviceToken)
                .claim("fcm_device_token", fcmDeviceToken)
                .claim("mobile_id_version", getAppVersion())
                .claim("mobile_id_build", getAppBuildNumber())
                .claim("app_set_id", getAppSetId())
                .claim("has_other_accounts", false)
                .build()

        // Sign the JWT using current key pair (matching iOS signJWT)
        return keyPairSource.signAndSerializeClaimsSet(claimsSet)
    }

    /**
     * Creates HMAC nonce matching iOS AssertionFactory.commonCryptoHMAC
     */
    private fun createAssertionFactoryHMAC(
        accessToken: String,
        jwtId: String,
        clientId: String,
    ): String {
        val accessTokenBytes = accessToken.toByteArray(Charsets.UTF_8)
        val clientIdBytes = clientId.toByteArray(Charsets.UTF_8)
        val jwtIdBytes = jwtId.toByteArray(Charsets.UTF_8)

        val secretKeySpec = SecretKeySpec(accessTokenBytes, "HmacSHA256")
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(secretKeySpec)

        // Update with client ID and JWT ID bytes (matching iOS CCHmacUpdate pattern)
        mac.update(clientIdBytes)
        mac.update(jwtIdBytes)

        val hmacBytes = mac.doFinal()
        return android.util.Base64.encodeToString(hmacBytes, android.util.Base64.NO_WRAP)
    }

    /**
     * Converts JWK ReadableMap to RSA PublicKey for encryption
     * Matches iOS JWK.jwkToSecKey functionality
     */
    private fun convertJWKToRSAPublicKey(jwk: ReadableMap): java.security.PublicKey {
        val modulusBase64 = jwk.getString("n") ?: throw IllegalArgumentException("JWK missing modulus (n)")
        val exponentBase64 = jwk.getString("e") ?: throw IllegalArgumentException("JWK missing exponent (e)")
        val keyType = jwk.getString("kty") ?: throw IllegalArgumentException("JWK missing key type (kty)")

        if (keyType != "RSA") {
            throw IllegalArgumentException("Only RSA keys are supported, got: $keyType")
        }

        // Decode base64url components (matching iOS RSA component handling)
        val modulusBytes =
            android.util.Base64.decode(
                modulusBase64.replace("-", "+").replace("_", "/"),
                android.util.Base64.DEFAULT,
            )
        val exponentBytes =
            android.util.Base64.decode(
                exponentBase64.replace("-", "+").replace("_", "/"),
                android.util.Base64.DEFAULT,
            )

        // Create RSA public key from components
        val modulus = java.math.BigInteger(1, modulusBytes)
        val exponent = java.math.BigInteger(1, exponentBytes)

        val keySpec = java.security.spec.RSAPublicKeySpec(modulus, exponent)
        val keyFactory = java.security.KeyFactory.getInstance("RSA")
        return keyFactory.generatePublic(keySpec)
    }

    /**
     * Encrypts JWT using JWE with RSA-OAEP-256 + A256GCM following ias-android pattern
     * This matches the encryptSignedJWT method in ias-android QuickLoginUseCase
     */
    private fun encryptJWTWithRSAPublicKey(
        jwt: String,
        publicKey: java.security.PublicKey,
    ): String {
        try {
            // Convert java.security.PublicKey to Nimbus RSAKey for JWE encryption
            val rsaKey =
                RSAKey
                    .Builder(publicKey as java.security.interfaces.RSAPublicKey)
                    .build()

            // Create JWE header with RSA-OAEP-256 algorithm and A256GCM encryption method
            // This matches the ias-android implementation
            val header =
                JWEHeader
                    .Builder(JWEAlgorithm.RSA_OAEP_256, EncryptionMethod.A256GCM)
                    .build()

            // Create JWE object with the signed JWT as payload
            val jweObject = JWEObject(header, Payload(jwt))

            // Encrypt using RSA encrypter (hybrid encryption - RSA for key, AES for content)
            val encrypter = RSAEncrypter(rsaKey)
            jweObject.encrypt(encrypter)

            // Serialize to JWE compact format
            return jweObject.serialize()
        } catch (e: Exception) {
            throw RuntimeException("Failed to create JWE encrypted JWT: ${e.message}", e)
        }
    }

    private fun removeAccountFromFile(accountId: String) {
        try {
            val accountsFile = File(reactApplicationContext.filesDir, "accounts")
            if (!accountsFile.exists()) {
                Log.d(NAME, "removeAccountFromFile - Accounts file does not exist")
                return
            }
            val existingContent = accountsFile.readText()
            Log.d(NAME, "removeAccountFromFile - Current accounts file content: $existingContent")

            val accountsArray = JSONArray(existingContent)
            val updatedAccountsArray = JSONArray()

            // Copy all accounts except where UUID == accountId
            var removedCount = 0
            for (i in 0 until accountsArray.length()) {
                val accountObj = accountsArray.getJSONObject(i)
                val uuid = accountObj.optString("uuid", "")

                if (uuid != accountId) {
                    updatedAccountsArray.put(accountObj)
                } else {
                    removedCount++
                    Log.d(NAME, "removeAccountFromFile - Found and removing account with UUID: $uuid")
                }
            }

            // Write back updated accounts array
            FileWriter(accountsFile).use { writer ->
                writer.write(updatedAccountsArray.toString())
                writer.flush()
            }

            Log.d(
                NAME,
                "removeAccountFromFile - Removed $removedCount account(s), " +
                    "${updatedAccountsArray.length()} account(s) remaining",
            )
        } catch (e: Exception) {
            Log.w(NAME, "removeAccountFromFile - Error removing account from file: ${e.message}", e)
        }
    }

    /**
     * Method to remove the current account.
     * Removes the current account from the accounts file by accountId
     */
    @ReactMethod
    override fun removeAccount(promise: Promise) {
        Log.d(NAME, "removeAccount - Starting account removal process")
        val account: WritableMap?
        try {
            account = getAccountSync()
        } catch (e: Exception) {
            Log.e(NAME, "removeAccount - Error retrieving account: ${e.message}", e)
            promise.reject("E_GET_ACCOUNT_ERROR", "Failed to retrieve account: ${e.message}", e)
            return
        }
        val accountId = account?.getString("id")
        if (accountId != null) {
            try {
                Log.d(NAME, "removeAccount - Removing data for account ID: $accountId")

                // TODO (bm): remove old method call once we are happy with native compatible approach
                // Remove from old flat file format (old v4, leaving here for reference for now)
                removeAccountFromFile(accountId)

                // Remove from native-compatible storage
                try {
                    val issuerName = nativeStorage.getDefaultIssuerName()
                    Log.d(NAME, "removeAccount - Attempting to delete native storage for issuer: $issuerName")

                    // Delete the entire issuer directory (contains all accounts and their data)
                    val issuerDir = File(reactApplicationContext.filesDir, issuerName)
                    if (issuerDir.exists() && issuerDir.isDirectory) {
                        val deleted = issuerDir.deleteRecursively()
                        Log.d(NAME, "removeAccount - Native storage deletion result: $deleted")
                    } else {
                        Log.d(
                            NAME,
                            "removeAccount - Native storage directory does not exist: ${issuerDir.absolutePath}",
                        )
                    }
                } catch (e: Exception) {
                    Log.w(NAME, "removeAccount - Error deleting native storage: ${e.message}", e)
                }

                Log.d(NAME, "removeAccount - Successfully removed account data")
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(NAME, "removeAccount - Error removing account: ${e.message}", e)
                promise.reject("E_REMOVE_ACCOUNT_ERROR", "Failed to remove account: ${e.message}", e)
            }
        } else {
            Log.d(NAME, "removeAccount - No account found to remove")
            promise.resolve(null)
        }
    }

    // MARK: - Account management methods

    /**
     * Helper method to get account data synchronously (without Promise)
     * This is used internally by getToken to get the account ID
     */
    private fun getAccountSync(): WritableMap? {
        Log.d(NAME, "getAccountSync called")

        // Try native-compatible storage first
        try {
            val issuerName = nativeStorage.getDefaultIssuerName()
            val accounts = nativeStorage.readAccounts(issuerName)

            if (accounts != null && accounts.isNotEmpty()) {
                val nativeAccount = accounts.first()
                Log.d(NAME, "getAccountSync - Found account in native storage: ${nativeAccount.uuid}")
                return convertNativeAccountToWritableMap(nativeAccount)
            }
        } catch (e: Exception) {
            Log.w(NAME, "getAccountSync - Error reading from native storage: ${e.message}")
        }

        // Fallback: try old flat file format
        try {
            val fileReader: FileReader = FileReaderFactory.createSimpleFileReader(reactApplicationContext)
            val relativePath = "accounts"
            val accountFileBytes = fileReader.readFile(relativePath)

            if (accountFileBytes != null && accountFileBytes.isNotEmpty()) {
                val accountFileContent = String(accountFileBytes, Charsets.UTF_8)

                try {
                    val jsonArray = org.json.JSONArray(accountFileContent)
                    if (jsonArray.length() > 0) {
                        val accountObj = jsonArray.getJSONObject(0)
                        Log.d(NAME, "getAccountSync - Found account in old format: ${accountObj.optString("uuid")}")
                        return createNativeAccountFromJson(accountObj)
                    }
                } catch (e: Exception) {
                    Log.w(NAME, "getAccountSync - Failed to parse old format: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.w(NAME, "getAccountSync - Error reading old format: ${e.message}")
        }

        Log.d(NAME, "getAccountSync - No account found")
        return null
    }

    /**
     * Creates an unsigned JWT with "none" algorithm (similar to iOS implementation)
     * This matches the iOS behavior for device info JWTs
     */
    private fun createUnsignedJWT(claimsSet: JWTClaimsSet): String =
        try {
            // Create JWT header with "none" algorithm
            val header =
                mapOf(
                    "alg" to "none",
                    "typ" to "JWT",
                )

            // Convert header and payload to JSON and then base64url encode
            val headerJson = JSONObject(header).toString()
            val payloadJson = claimsSet.toString()

            val headerBase64 = headerJson.toByteArray(Charsets.UTF_8).toBase64UrlString()
            val payloadBase64 = payloadJson.toByteArray(Charsets.UTF_8).toBase64UrlString()

            // For "none" algorithm, signature is empty
            "$headerBase64.$payloadBase64."
        } catch (e: Exception) {
            Log.e(NAME, "Failed to create unsigned JWT: ${e.message}", e)
            throw e
        }

    /**
     * Convert ByteArray to base64url encoded string (URL-safe base64 without padding)
     */
    private fun ByteArray.toBase64UrlString(): String =
        android.util.Base64.encodeToString(
            this,
            android.util.Base64.URL_SAFE or android.util.Base64.NO_PADDING or android.util.Base64.NO_WRAP,
        )

    // Extension function to convert ByteArray to Base64 String
    private fun ByteArray.toBase64String(): String =
        android.util.Base64.encodeToString(this, android.util.Base64.NO_WRAP)

    /**
     * Gets the app version name from the package info
     */
    private fun getAppVersion(): String {
        return try {
            val packageInfo =
                reactApplicationContext.packageManager.getPackageInfo(
                    reactApplicationContext.packageName,
                    0,
                )
            packageInfo.versionName ?: "0.0.0"
        } catch (e: Exception) {
            Log.w(NAME, "Could not get app version: ${e.message}")
            return "0.0.0"
        }
    }

    /**
     * Gets the app build number (version code) from the package info
     */
    private fun getAppBuildNumber(): String {
        return try {
            val packageInfo =
                reactApplicationContext.packageManager.getPackageInfo(
                    reactApplicationContext.packageName,
                    0,
                )
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                packageInfo.longVersionCode.toString()
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toString()
            }
        } catch (e: Exception) {
            Log.w(NAME, "Could not get app build number: ${e.message}")
            return "0"
        }
    }

    /**
     * Gets the device name from Android system settings
     */
    private fun getDeviceName(): String =
        try {
            // Try to get the user-set device name from Settings.Global
            val deviceName =
                android.provider.Settings.Global.getString(
                    reactApplicationContext.contentResolver,
                    android.provider.Settings.Global.DEVICE_NAME,
                )

            // Fall back to Build.MODEL if device name is not set
            deviceName?.takeIf { it.isNotEmpty() } ?: Build.MODEL
        } catch (e: Exception) {
            Log.w(NAME, "Could not get device name: ${e.message}")
            // Final fallback to Build.MODEL
            Build.MODEL
        }

    /**
     * Gets the Android App Set ID for app attribution
     * This is used for privacy-preserving analytics and attribution
     */
    private fun getAppSetId(): String =
        try {
            // For Android App Set ID, we need to use Google Play Services
            // Since this requires additional dependencies and async operations,
            // we'll generate a consistent UUID based on the package name as a fallback
            val packageName = reactApplicationContext.packageName

            // Create a consistent UUID based on package name using a hash
            // This ensures the same ID is generated each time for the same app
            val seedString = "app_set_id_$packageName"
            val hash = seedString.hashCode()

            // Generate UUID from hash to ensure consistency
            val mostSigBits = hash.toLong() shl 32 or (hash.toLong() and 0xFFFFFFFFL)
            val leastSigBits = hash.toLong() shl 32 or (hash.toLong() and 0xFFFFFFFFL)
            val uuid = UUID(mostSigBits, leastSigBits)

            uuid.toString()
        } catch (e: Exception) {
            Log.w(NAME, "Could not generate app set ID: ${e.message}")
            // Final fallback to a default UUID
            "00000000-0000-0000-0000-000000000000"
        }

    // MARK: - Authentication Methods

    /**
     * Sets a PIN for the current account.
     * Matches TypeScript: setPIN(pin: string): Promise<PINSetupResult>
     */
    @ReactMethod
    override fun setPIN(
        pin: String,
        promise: Promise,
    ) {
        try {
            val issuerName = nativeStorage.getDefaultIssuerName()
            val existingAccounts = nativeStorage.readAccounts(issuerName)

            if (existingAccounts == null || existingAccounts.isEmpty()) {
                promise.reject("E_ACCOUNT_NOT_FOUND", "No account found")
                return
            }

            val account = existingAccounts.first()
            val accountID = account.uuid

            // Set PIN and get the hash back (user-created PIN, not auto-generated)
            val hash = pinService.setPINReturningHash(accountID, pin, isAutoGenerated = false)

            val result = Arguments.createMap()
            result.putBoolean("success", true)
            result.putString("walletKey", hash)
            result.putBoolean("isAutoGenerated", false)

            Log.d(NAME, "setPIN: Successfully set PIN for account $accountID")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(NAME, "setPIN error: ${e.message}", e)
            promise.reject("E_SET_PIN_ERROR", "Error setting PIN: ${e.message}", e)
        }
    }

    /**
     * Verifies a PIN for the current account.
     * Matches TypeScript: verifyPIN(pin: string): Promise<PINVerificationResult>
     * Returns: { success: boolean, locked: boolean, remainingTime: number, walletKey?: string, title?: string, message?: string }
     */
    @ReactMethod
    override fun verifyPIN(
        pin: String,
        promise: Promise,
    ) {
        try {
            val issuerName = nativeStorage.getDefaultIssuerName()
            val existingAccounts = nativeStorage.readAccounts(issuerName)

            if (existingAccounts == null || existingAccounts.isEmpty()) {
                promise.reject("E_ACCOUNT_NOT_FOUND", "No account found")
                return
            }

            val account = existingAccounts.first()
            val accountID = account.uuid
            val currentTimeMillis = System.currentTimeMillis()

            // Check if account is currently locked
            val remainingPenaltyTime = getRemainingPenaltyTime(account.penalty, currentTimeMillis)
            if (remainingPenaltyTime > 0) {
                val result = Arguments.createMap()
                result.putBoolean("success", false)
                result.putBoolean("locked", true)
                result.putInt("remainingTime", (remainingPenaltyTime / 1000).toInt()) // Convert to seconds
                result.putString("title", "Too Many Attempts")
                result.putString("message", "Please wait before trying again")
                Log.d(NAME, "verifyPIN: Account locked, remaining time: ${remainingPenaltyTime}ms")
                promise.resolve(result)
                return
            }

            // Validate PIN and get hash if successful
            val validationResult = pinService.validatePINReturningHash(accountID, pin)

            val result = Arguments.createMap()
            result.putBoolean("success", validationResult.first)

            if (validationResult.first) {
                // Reset penalty on successful verification
                val updatedAccount =
                    account.copy(
                        penalty = NativePenalty(penaltyAttempts = 0, penaltyEndTime = 0L),
                    )
                nativeStorage.saveAccounts(listOf(updatedAccount), issuerName)

                result.putBoolean("locked", false)
                result.putInt("remainingTime", 0)

                // Include the wallet key (hash) on successful verification
                validationResult.second?.let { hash ->
                    result.putString("walletKey", hash)
                }
                Log.d(NAME, "verifyPIN: Success, penalty reset")
            } else {
                // Increment failed attempts and calculate penalty
                val newFailedAttempts = account.penalty.penaltyAttempts + 1
                val penaltyDuration = calculatePenaltyDuration(newFailedAttempts)
                val penaltyEndTime = if (penaltyDuration > 0) currentTimeMillis + penaltyDuration else 0L

                val updatedAccount =
                    account.copy(
                        penalty =
                            NativePenalty(
                                penaltyAttempts = newFailedAttempts,
                                penaltyEndTime = penaltyEndTime,
                            ),
                    )
                nativeStorage.saveAccounts(listOf(updatedAccount), issuerName)

                val (title, message) = getPenaltyMessage(newFailedAttempts, penaltyDuration)

                if (penaltyDuration > 0) {
                    result.putBoolean("locked", true)
                    result.putInt("remainingTime", (penaltyDuration / 1000).toInt())
                } else {
                    result.putBoolean("locked", false)
                    result.putInt("remainingTime", 0)
                }

                result.putString("title", title)
                result.putString("message", message)

                Log.d(NAME, "verifyPIN: Failed, attempts=$newFailedAttempts, penalty=${penaltyDuration}ms")
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(NAME, "verifyPIN error: ${e.message}", e)
            promise.reject("E_VERIFY_PIN_ERROR", "Error verifying PIN: ${e.message}", e)
        }
    }

    /**
     * Deletes the PIN for the current account.
     * Matches TypeScript: deletePIN(): Promise<boolean>
     */
    @ReactMethod
    override fun deletePIN(promise: Promise) {
        try {
            val issuerName = nativeStorage.getDefaultIssuerName()
            val existingAccounts = nativeStorage.readAccounts(issuerName)

            if (existingAccounts == null || existingAccounts.isEmpty()) {
                promise.reject("E_ACCOUNT_NOT_FOUND", "No account found")
                return
            }

            val account = existingAccounts.first()
            val accountID = account.uuid

            pinService.removePIN(accountID)
            Log.d(NAME, "deletePIN: Successfully deleted PIN for account $accountID")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "deletePIN error: ${e.message}", e)
            promise.reject("E_DELETE_PIN_ERROR", "Error deleting PIN: ${e.message}", e)
        }
    }

    /**
     * Checks if a PIN is set for the current account.
     * Matches TypeScript: hasPINSet(): Promise<boolean>
     */
    @ReactMethod
    override fun hasPINSet(promise: Promise) {
        try {
            val issuerName = nativeStorage.getDefaultIssuerName()
            val existingAccounts = nativeStorage.readAccounts(issuerName)

            if (existingAccounts == null || existingAccounts.isEmpty()) {
                promise.reject("E_ACCOUNT_NOT_FOUND", "No account found")
                return
            }

            val account = existingAccounts.first()
            val accountID = account.uuid

            val hasPin = pinService.hasPIN(accountID)
            Log.d(NAME, "hasPINSet for account $accountID: $hasPin")
            promise.resolve(hasPin)
        } catch (e: Exception) {
            Log.e(NAME, "hasPINSet error: ${e.message}", e)
            promise.reject("E_HAS_PIN_SET_ERROR", "Error checking PIN status: ${e.message}", e)
        }
    }

    /**
     * Performs device authentication (biometric or passcode).
     * Matches TypeScript: performDeviceAuthentication(reason?: string): Promise<boolean>
     */
    @ReactMethod
    override fun performDeviceAuthentication(
        reason: String?,
        promise: Promise,
    ) {
        try {
            val title = reason ?: "Authentication Required"
            val subtitle = "Please authenticate to continue"

            val activity = reactApplicationContext.currentActivity
            if (activity == null || activity !is androidx.fragment.app.FragmentActivity) {
                promise.reject("E_NO_ACTIVITY", "No FragmentActivity available for authentication")
                return
            }

            deviceAuthenticationService.performDeviceAuthentication(
                activity,
                title,
                subtitle,
            ) { result ->
                when (result) {
                    DeviceAuthenticationResult.SUCCESS -> {
                        Log.d(NAME, "performDeviceAuthentication: success")
                        promise.resolve(true)
                    }

                    DeviceAuthenticationResult.CANCELLED -> {
                        Log.d(NAME, "performDeviceAuthentication: cancelled")
                        promise.reject("E_DEVICE_AUTH_CANCELLED", "Device authentication was cancelled by user")
                    }

                    DeviceAuthenticationResult.FAILED,
                    DeviceAuthenticationResult.ERROR,
                    -> {
                        Log.e(NAME, "performDeviceAuthentication: failed")
                        promise.reject("E_DEVICE_AUTH_ERROR", "Device authentication failed")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(NAME, "performDeviceAuthentication error: ${e.message}", e)
            promise.reject("E_DEVICE_AUTH_ERROR", "Error initiating device authentication: ${e.message}", e)
        }
    }

    /**
     * Checks if device authentication is available.
     * Matches TypeScript: canPerformDeviceAuthentication(): Promise<boolean>
     */
    @ReactMethod
    override fun canPerformDeviceAuthentication(promise: Promise) {
        try {
            val canAuth = deviceAuthenticationService.canPerformDeviceAuthentication()
            Log.d(NAME, "canPerformDeviceAuthentication: $canAuth")
            promise.resolve(canAuth)
        } catch (e: Exception) {
            Log.e(NAME, "canPerformDeviceAuthentication error: ${e.message}", e)
            promise.reject("E_CAN_DEVICE_AUTH_ERROR", "Error checking device authentication: ${e.message}", e)
        }
    }

    /**
     * Gets the available biometric type.
     * Matches TypeScript: getAvailableBiometricType(): Promise<BiometricType>
     * Returns: 'none', 'touchID', 'faceID', or 'opticID'
     * Note: On Android, we map fingerprint to 'touchID' and face to 'faceID'
     */
    @ReactMethod
    override fun getAvailableBiometricType(promise: Promise) {
        try {
            val biometricManager = androidx.biometric.BiometricManager.from(reactApplicationContext)
            val canAuthenticate =
                biometricManager.canAuthenticate(
                    androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG or
                        androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK,
                )

            val biometricType =
                when (canAuthenticate) {
                    androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS -> {
                        // Android doesn't easily distinguish between fingerprint and face
                        // We default to 'touchID' for fingerprint-capable devices
                        // In practice, most Android devices use fingerprint
                        if (reactApplicationContext.packageManager.hasSystemFeature("android.hardware.fingerprint")) {
                            "touchID"
                        } else if (reactApplicationContext.packageManager.hasSystemFeature(
                                "android.hardware.biometrics.face",
                            )
                        ) {
                            "faceID"
                        } else {
                            "touchID" // Default to touchID for other biometric types
                        }
                    }

                    else -> {
                        "none"
                    }
                }

            Log.d(NAME, "getAvailableBiometricType: $biometricType")
            promise.resolve(biometricType)
        } catch (e: Exception) {
            Log.e(NAME, "getAvailableBiometricType error: ${e.message}", e)
            promise.resolve("none")
        }
    }

    /**
     * Checks if biometric authentication (not including passcode) is available.
     * Matches TypeScript: canPerformBiometricAuthentication(): Promise<boolean>
     */
    @ReactMethod
    override fun canPerformBiometricAuthentication(promise: Promise) {
        try {
            val biometricManager = androidx.biometric.BiometricManager.from(reactApplicationContext)
            val canAuthenticate =
                biometricManager.canAuthenticate(
                    androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG or
                        androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK,
                )
            val canAuth = canAuthenticate == androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS
            Log.d(NAME, "canPerformBiometricAuthentication: $canAuth")
            promise.resolve(canAuth)
        } catch (e: Exception) {
            Log.e(NAME, "canPerformBiometricAuthentication error: ${e.message}", e)
            promise.resolve(false)
        }
    }

    /**
     * Sets the security method for the specified account.
     * Matches TypeScript: setAccountSecurityMethod(accountID: string, securityMethod: AccountSecurityMethod): Promise<boolean>
     */
    @ReactMethod
    override fun setAccountSecurityMethod(
        securityMethod: String,
        promise: Promise,
    ) {
        try {
            // Validate security method
            val validMethods = listOf("device_authentication", "app_pin_no_device_authn", "app_pin_has_device_authn")
            if (securityMethod !in validMethods) {
                promise.reject("E_INVALID_SECURITY_METHOD", "Invalid security method: $securityMethod")
                return
            }

            // Map security method to native type
            val accountSecurityType =
                when (securityMethod) {
                    "device_authentication" -> NativeAccountSecurityType.DeviceSecurity
                    "app_pin_no_device_authn" -> NativeAccountSecurityType.PinNoDeviceAuth
                    "app_pin_has_device_authn" -> NativeAccountSecurityType.PinWithDeviceAuth
                    else -> NativeAccountSecurityType.DeviceSecurity
                }

            // Get issuer name (same as used for reading/writing accounts)
            val issuerName = nativeStorage.getDefaultIssuerName()

            // Read existing accounts to get full data
            val existingAccounts = nativeStorage.readAccounts(issuerName)
            if (existingAccounts == null || existingAccounts.isEmpty()) {
                promise.reject("E_NO_ACCOUNT", "No account found in storage")
                return
            }

            val account = existingAccounts.first()
            val accountID = account.uuid

            // Update the account with new security type
            val updatedAccount = account.copy(accountSecurityType = accountSecurityType)
            val updatedAccounts = listOf(updatedAccount)

            // Save updated accounts
            if (nativeStorage.saveAccounts(updatedAccounts, issuerName)) {
                Log.d(
                    NAME,
                    "setAccountSecurityMethod: Updated security method to $securityMethod for account $accountID",
                )
                promise.resolve(true)
            } else {
                promise.reject("E_STORAGE_ERROR", "Failed to save updated account")
            }
        } catch (e: Exception) {
            Log.e(NAME, "setAccountSecurityMethod error: ${e.message}", e)
            promise.reject("E_SET_SECURITY_METHOD_ERROR", "Error setting account security method: ${e.message}", e)
        }
    }

    /**
     * Gets the security method for the current account.
     * Matches TypeScript: getAccountSecurityMethod(): Promise<AccountSecurityMethod>
     */
    @ReactMethod
    override fun getAccountSecurityMethod(promise: Promise) {
        try {
            val issuerName = nativeStorage.getDefaultIssuerName()
            val existingAccounts = nativeStorage.readAccounts(issuerName)

            if (existingAccounts == null || existingAccounts.isEmpty()) {
                promise.resolve("device_authentication") // Default
                return
            }

            val account = existingAccounts.first()

            val securityMethod =
                when (account.accountSecurityType) {
                    NativeAccountSecurityType.DeviceSecurity -> "device_authentication"
                    NativeAccountSecurityType.PinNoDeviceAuth -> "app_pin_no_device_authn"
                    NativeAccountSecurityType.PinWithDeviceAuth -> "app_pin_has_device_authn"
                }

            Log.d(NAME, "getAccountSecurityMethod for account ${account.uuid}: $securityMethod")
            promise.resolve(securityMethod)
        } catch (e: Exception) {
            Log.e(NAME, "getAccountSecurityMethod error: ${e.message}", e)
            promise.reject("E_GET_SECURITY_METHOD_ERROR", "Error getting account security method: ${e.message}", e)
        }
    }

    /**
     * Checks if the current account is currently locked due to failed PIN attempts.
     * Matches TypeScript: isAccountLocked(): Promise<AccountLockStatus>
     * Returns: { locked: boolean, remainingTime: number }
     */
    @ReactMethod
    override fun isAccountLocked(promise: Promise) {
        try {
            val issuerName = nativeStorage.getDefaultIssuerName()
            val existingAccounts = nativeStorage.readAccounts(issuerName)

            if (existingAccounts == null || existingAccounts.isEmpty()) {
                // No account means no lock
                val result = Arguments.createMap()
                result.putBoolean("locked", false)
                result.putInt("remainingTime", 0)
                promise.resolve(result)
                return
            }

            val account = existingAccounts.first()
            val currentTimeMillis = System.currentTimeMillis()
            val remainingPenaltyTime = getRemainingPenaltyTime(account.penalty, currentTimeMillis)

            val result = Arguments.createMap()
            if (remainingPenaltyTime > 0) {
                result.putBoolean("locked", true)
                result.putInt("remainingTime", (remainingPenaltyTime / 1000).toInt()) // Convert to seconds
                Log.d(NAME, "isAccountLocked: locked=true, remainingTime=${remainingPenaltyTime}ms")
            } else {
                result.putBoolean("locked", false)
                result.putInt("remainingTime", 0)
                Log.d(NAME, "isAccountLocked: locked=false")
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(NAME, "isAccountLocked error: ${e.message}", e)
            promise.reject("E_IS_ACCOUNT_LOCKED_ERROR", "Error checking account lock status: ${e.message}", e)
        }
    }

    // MARK: - Device Security Methods (for biometric/device authentication)

    /**
     * Sets up device security by generating a random PIN internally,
     * storing its hash behind biometric auth, and returning the wallet key.
     * Call this during onboarding when user chooses device security.
     * Matches TypeScript: setupDeviceSecurity(): Promise<PINSetupResult>
     */
    @ReactMethod
    override fun setupDeviceSecurity(promise: Promise) {
        try {
            val issuerName = nativeStorage.getDefaultIssuerName()
            val existingAccounts = nativeStorage.readAccounts(issuerName)

            if (existingAccounts == null || existingAccounts.isEmpty()) {
                promise.reject("E_ACCOUNT_NOT_FOUND", "No account found")
                return
            }

            val account = existingAccounts.first()
            val accountID = account.uuid

            // Generate a cryptographically secure random 6-digit PIN
            val secureRandom = java.security.SecureRandom()
            val pinDigits = StringBuilder()
            for (i in 0 until 6) {
                val digit = secureRandom.nextInt(10)
                pinDigits.append(digit)
            }
            val pin = pinDigits.toString()

            // Set PIN with isAutoGenerated flag set to true, and get the hash back
            val hash = pinService.setupDeviceSecurityPIN(accountID, pin)

            val result = Arguments.createMap()
            result.putBoolean("success", true)
            result.putString("walletKey", hash)
            result.putBoolean("isAutoGenerated", true)

            Log.d(NAME, "setupDeviceSecurity: Successfully set up device security for account $accountID")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(NAME, "setupDeviceSecurity error: ${e.message}", e)
            promise.reject("E_SETUP_DEVICE_SECURITY_ERROR", "Error setting up device security: ${e.message}", e)
        }
    }

    /**
     * Unlocks using device security (biometric/passcode) and returns the wallet key.
     * Call this on app unlock when account uses device security method.
     * Matches TypeScript: unlockWithDeviceSecurity(reason?: string): Promise<DeviceSecurityUnlockResult>
     */
    @ReactMethod
    override fun unlockWithDeviceSecurity(
        reason: String?,
        promise: Promise,
    ) {
        try {
            val issuerName = nativeStorage.getDefaultIssuerName()
            val existingAccounts = nativeStorage.readAccounts(issuerName)

            if (existingAccounts == null || existingAccounts.isEmpty()) {
                promise.reject("E_ACCOUNT_NOT_FOUND", "No account found")
                return
            }

            val account = existingAccounts.first()
            val accountID = account.uuid

            val activity = reactApplicationContext.currentActivity
            if (activity == null || activity !is FragmentActivity) {
                promise.reject("E_NO_ACTIVITY", "No FragmentActivity available for authentication")
                return
            }

            // Perform device authentication
            val title = reason ?: "Authentication Required"
            val subtitle = "Please authenticate to unlock"

            deviceAuthenticationService.performDeviceAuthentication(
                activity,
                title,
                subtitle,
            ) { authResult: DeviceAuthenticationResult ->
                when (authResult) {
                    DeviceAuthenticationResult.SUCCESS -> {
                        try {
                            // Get the stored PIN hash
                            val hashResult = pinService.getPINHash(accountID)

                            if (hashResult != null) {
                                val result = Arguments.createMap()
                                result.putBoolean("success", true)
                                result.putString("walletKey", hashResult.first)
                                promise.resolve(result)
                            } else {
                                // No PIN hash found - this is a v3 migration scenario
                                // User had device security but no random PIN. Generate one now.
                                val secureRandom = java.security.SecureRandom()
                                val pinDigits = StringBuilder()
                                for (i in 0 until 6) {
                                    pinDigits.append(secureRandom.nextInt(10))
                                }
                                val pin = pinDigits.toString()

                                val hash = pinService.setupDeviceSecurityPIN(accountID, pin)

                                val result = Arguments.createMap()
                                result.putBoolean("success", true)
                                result.putString("walletKey", hash)
                                result.putBoolean("migrated", true)
                                promise.resolve(result)
                            }
                        } catch (e: Exception) {
                            promise.reject("E_UNLOCK_DEVICE_SECURITY_ERROR", "Error during unlock: ${e.message}", e)
                        }
                    }

                    DeviceAuthenticationResult.CANCELLED -> {
                        val result = Arguments.createMap()
                        result.putBoolean("success", false)
                        promise.resolve(result)
                    }

                    DeviceAuthenticationResult.FAILED,
                    DeviceAuthenticationResult.ERROR,
                    -> {
                        val result = Arguments.createMap()
                        result.putBoolean("success", false)
                        promise.resolve(result)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(NAME, "unlockWithDeviceSecurity error: ${e.message}", e)
            promise.reject("E_UNLOCK_DEVICE_SECURITY_ERROR", "Error unlocking with device security: ${e.message}", e)
        }
    }

    /**
     * Checks if the stored PIN was auto-generated (for device security) or user-created.
     * Matches TypeScript: isPINAutoGenerated(): Promise<boolean>
     */
    @ReactMethod
    override fun isPINAutoGenerated(promise: Promise) {
        try {
            // Get the account to obtain the account ID
            val account = getAccountSync()
            if (account == null) {
                promise.reject("E_ACCOUNT_NOT_FOUND", "Account not found")
                return
            }

            val accountID = account.getString("id")
            if (accountID.isNullOrEmpty()) {
                promise.reject("E_INVALID_ACCOUNT", "Account ID is null or empty")
                return
            }

            val isAutoGenerated = pinService.isPINAutoGenerated(accountID)
            Log.d(NAME, "isPINAutoGenerated for account $accountID: $isAutoGenerated")
            promise.resolve(isAutoGenerated)
        } catch (e: Exception) {
            Log.e(NAME, "isPINAutoGenerated error: ${e.message}", e)
            promise.reject("E_IS_PIN_AUTO_GENERATED_ERROR", "Error checking if PIN is auto-generated: ${e.message}", e)
        }
    }

    // MARK: - Authorization Request Storage Methods

    /**
     * Gets the stored authorization request data.
     * Reads from encrypted storage, compatible with v3 migration.
     * Matches TypeScript: getAuthorizationRequest(): Promise<NativeAuthorizationRequest | null>
     */
    @ReactMethod
    override fun getAuthorizationRequest(promise: Promise) {
        try {
            // Get the account to obtain issuer and account ID
            val account = getAccountSync()
            if (account == null) {
                // No account yet - return null (not an error)
                promise.resolve(null)
                return
            }

            val accountId = account.getString("id")
            val issuer = account.getString("issuer")

            if (accountId.isNullOrEmpty() || issuer.isNullOrEmpty()) {
                promise.resolve(null)
                return
            }

            val issuerName = nativeStorage.getIssuerNameFromIssuer(issuer)

            // First try to read from our v4 storage location
            var authRequest = nativeStorage.readAuthorizationRequest(issuerName, accountId)

            // If not found, try to read from v3 Provider file for migration
            if (authRequest == null) {
                Log.d(NAME, "getAuthorizationRequest: Trying v3 provider migration")
                authRequest = nativeStorage.readAuthorizationRequestFromV3Provider(issuerName, accountId)

                // If found in v3, migrate to v4 storage
                if (authRequest != null) {
                    Log.d(NAME, "getAuthorizationRequest: Migrating v3 authorization request to v4 storage")
                    nativeStorage.saveAuthorizationRequest(authRequest, issuerName, accountId)
                }
            }

            if (authRequest == null) {
                promise.resolve(null)
                return
            }

            // Convert to WritableMap for React Native
            val result =
                Arguments.createMap().apply {
                    authRequest.deviceCode?.let { putString("deviceCode", it) }
                    authRequest.userCode?.let { putString("userCode", it) }
                    authRequest.csn?.let { putString("csn", it) }
                    authRequest.verifiedEmail?.let { putString("verifiedEmail", it) }
                    authRequest.firstName?.let { putString("firstName", it) }
                    authRequest.lastName?.let { putString("lastName", it) }
                    authRequest.middleNames?.let { putString("middleNames", it) }
                    authRequest.issuer?.let { putString("audience", it) }
                    authRequest.verificationOptions?.let { putString("verificationOptions", it) }
                    authRequest.verificationUriVideo?.let { putString("verificationURIVideo", it) }
                    authRequest.backCheckVerificationId?.let { putString("backCheckVerificationId", it) }
                    authRequest.evidenceUploadUri?.let { putString("evidenceUploadURI", it) }
                    putInt("status", authRequest.requestStatus.value)
                    putInt("method", authRequest.authorizationMethod.value)

                    // Convert birthDate string to timestamp if present
                    authRequest.birthDate?.let {
                        try {
                            // ISO date format
                            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                            val date = sdf.parse(it)
                            if (date != null) {
                                putDouble("birthdate", date.time / 1000.0)
                            }
                        } catch (e: Exception) {
                            // If parsing fails, skip
                        }
                    }

                    // Convert dates to timestamps
                    authRequest.expiry?.let { putDouble("expiry", it.time / 1000.0) }
                    authRequest.authorizationExpiry?.let { putDouble("authorizationExpiry", it.time / 1000.0) }
                    authRequest.backCheckSubmittedDate?.let { putDouble("backCheckSubmittedDate", it.time / 1000.0) }

                    // Convert address
                    authRequest.address?.let { addr ->
                        val addressMap =
                            Arguments.createMap().apply {
                                addr.streetAddress?.let { putString("streetAddress", it) }
                                addr.locality?.let { putString("locality", it) }
                                addr.postalCode?.let { putString("postalCode", it) }
                                addr.country?.let { putString("country", it) }
                                addr.region?.let { putString("region", it) }
                            }
                        putMap("address", addressMap)
                    }

                    // Card process
                    authRequest.cardProcess?.let { putString("cardProcess", it) }
                }

            Log.d(NAME, "getAuthorizationRequest: Successfully read authorization request")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(NAME, "getAuthorizationRequest error: ${e.message}", e)
            promise.reject("E_GET_AUTH_REQUEST_ERROR", "Error getting authorization request: ${e.message}", e)
        }
    }

    /**
     * Saves authorization request data to encrypted storage.
     * Matches TypeScript: setAuthorizationRequest(data: NativeAuthorizationRequest): Promise<boolean>
     */
    @ReactMethod
    override fun setAuthorizationRequest(
        data: ReadableMap,
        promise: Promise,
    ) {
        try {
            // Get the account to obtain issuer and account ID
            val account = getAccountSync()
            if (account == null) {
                promise.reject("E_ACCOUNT_NOT_FOUND", "Account not found")
                return
            }

            val accountId = account.getString("id")
            val issuer = account.getString("issuer")

            if (accountId.isNullOrEmpty() || issuer.isNullOrEmpty()) {
                promise.reject("E_ACCOUNT_INVALID", "Account ID or issuer is null or empty")
                return
            }

            val issuerName = nativeStorage.getIssuerNameFromIssuer(issuer)

            // Convert ReadableMap to NativeAuthorizationRequest
            val authRequest =
                NativeAuthorizationRequest(
                    deviceCode = if (data.hasKey("deviceCode")) data.getString("deviceCode") else null,
                    userCode = if (data.hasKey("userCode")) data.getString("userCode") else null,
                    birthDate =
                        if (data.hasKey("birthdate")) {
                            data.getDouble("birthdate").takeIf { !it.isNaN() }?.let {
                                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                                sdf.format(Date((it * 1000).toLong()))
                            }
                        } else {
                            null
                        },
                    csn = if (data.hasKey("csn")) data.getString("csn") else null,
                    verifiedEmail = if (data.hasKey("verifiedEmail")) data.getString("verifiedEmail") else null,
                    firstName = if (data.hasKey("firstName")) data.getString("firstName") else null,
                    lastName = if (data.hasKey("lastName")) data.getString("lastName") else null,
                    middleNames = if (data.hasKey("middleNames")) data.getString("middleNames") else null,
                    issuer = if (data.hasKey("audience")) data.getString("audience") else null,
                    requestStatus =
                        if (data.hasKey(
                                "status",
                            )
                        ) {
                            NativeRequestStatus.fromValue(data.getInt("status"))
                        } else {
                            NativeRequestStatus.INITIALIZED
                        },
                    authorizationMethod =
                        if (data.hasKey(
                                "method",
                            )
                        ) {
                            NativeAuthorizationMethod.fromValue(
                                data.getInt("method"),
                            )
                        } else {
                            NativeAuthorizationMethod.NONE
                        },
                    verificationOptions =
                        if (data.hasKey(
                                "verificationOptions",
                            )
                        ) {
                            data.getString("verificationOptions")
                        } else {
                            null
                        },
                    verificationUriVideo =
                        if (data.hasKey(
                                "verificationURIVideo",
                            )
                        ) {
                            data.getString("verificationURIVideo")
                        } else {
                            null
                        },
                    backCheckVerificationId =
                        if (data.hasKey(
                                "backCheckVerificationId",
                            )
                        ) {
                            data.getString("backCheckVerificationId")
                        } else {
                            null
                        },
                    evidenceUploadUri =
                        if (data.hasKey(
                                "evidenceUploadURI",
                            )
                        ) {
                            data.getString("evidenceUploadURI")
                        } else {
                            null
                        },
                    expiry =
                        if (data.hasKey("expiry")) {
                            data.getDouble("expiry").takeIf { !it.isNaN() }?.let {
                                Date(
                                    (
                                        it *
                                            1000
                                    ).toLong(),
                                )
                            }
                        } else {
                            null
                        },
                    authorizationExpiry =
                        if (data.hasKey("authorizationExpiry")) {
                            data.getDouble("authorizationExpiry").takeIf { !it.isNaN() }?.let {
                                Date((it * 1000).toLong())
                            }
                        } else {
                            null
                        },
                    backCheckSubmittedDate =
                        if (data.hasKey("backCheckSubmittedDate")) {
                            data.getDouble("backCheckSubmittedDate").takeIf { !it.isNaN() }?.let {
                                Date((it * 1000).toLong())
                            }
                        } else {
                            null
                        },
                    address =
                        if (data.hasKey("address")) {
                            data.getMap("address")?.let { addrMap ->
                                NativeAddress(
                                    streetAddress = addrMap.getString("streetAddress"),
                                    locality = addrMap.getString("locality"),
                                    postalCode = addrMap.getString("postalCode"),
                                    country = addrMap.getString("country"),
                                    region = addrMap.getString("region"),
                                )
                            }
                        } else {
                            null
                        },
                    cardProcess = if (data.hasKey("cardProcess")) data.getString("cardProcess") else null,
                )

            // Save to encrypted storage
            val success = nativeStorage.saveAuthorizationRequest(authRequest, issuerName, accountId)

            if (success) {
                Log.d(NAME, "setAuthorizationRequest: Successfully saved authorization request")
                promise.resolve(true)
            } else {
                promise.reject("E_SAVE_FAILED", "Failed to save authorization request to encrypted storage")
            }
        } catch (e: Exception) {
            Log.e(NAME, "setAuthorizationRequest error: ${e.message}", e)
            promise.reject("E_SET_AUTH_REQUEST_ERROR", "Error saving authorization request: ${e.message}", e)
        }
    }

    /**
     * Deletes the stored authorization request data.
     * Matches TypeScript: deleteAuthorizationRequest(): Promise<boolean>
     */
    @ReactMethod
    override fun deleteAuthorizationRequest(promise: Promise) {
        try {
            // Get the account to obtain issuer and account ID
            val account = getAccountSync()
            if (account == null) {
                // No account, so nothing to delete
                promise.resolve(true)
                return
            }

            val accountId = account.getString("id")
            val issuer = account.getString("issuer")

            if (accountId.isNullOrEmpty() || issuer.isNullOrEmpty()) {
                promise.resolve(true)
                return
            }

            val issuerName = nativeStorage.getIssuerNameFromIssuer(issuer)
            val success = nativeStorage.deleteAuthorizationRequest(issuerName, accountId)

            Log.d(NAME, "deleteAuthorizationRequest: ${if (success) "Successfully deleted" else "Failed to delete"}")
            promise.resolve(success)
        } catch (e: Exception) {
            Log.e(NAME, "deleteAuthorizationRequest error: ${e.message}", e)
            promise.reject("E_DELETE_AUTH_REQUEST_ERROR", "Error deleting authorization request: ${e.message}", e)
        }
    }

    // MARK: - Account Flags Storage Methods

    /**
     * Gets account flags from SharedPreferences.
     * Compatible with v3 native app storage location.
     * Matches TypeScript: getAccountFlags(): Promise<Record<string, any>>
     */
    @ReactMethod
    override fun getAccountFlags(promise: Promise) {
        try {
            val account = getAccountSync()
            if (account == null) {
                // No account yet - return empty map
                promise.resolve(Arguments.createMap())
                return
            }

            val accountId = account.getString("id")
            if (accountId.isNullOrEmpty()) {
                promise.resolve(Arguments.createMap())
                return
            }

            // Read from account-specific SharedPreferences (v3 compatible)
            val prefsName = "${reactApplicationContext.packageName}.PREFERENCE_FILE_KEY_$accountId"
            val prefs = reactApplicationContext.getSharedPreferences(prefsName, Context.MODE_PRIVATE)

            val result = Arguments.createMap()

            // Read known flags
            if (prefs.contains("is_email_verified")) {
                result.putBoolean("isEmailVerified", prefs.getBoolean("is_email_verified", false))
            }
            if (prefs.contains("is_email_verification_skipped")) {
                result.putBoolean(
                    "userSkippedEmailVerification",
                    prefs.getBoolean("is_email_verification_skipped", false),
                )
            }
            if (prefs.contains("email_address")) {
                result.putString("emailAddress", prefs.getString("email_address", null))
            }
            if (prefs.contains("user_submitted_verification_video")) {
                result.putBoolean(
                    "userSubmittedVerificationVideo",
                    prefs.getBoolean("user_submitted_verification_video", false),
                )
            }

            Log.d(NAME, "getAccountFlags: Successfully read account flags")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(NAME, "getAccountFlags error: ${e.message}", e)
            promise.reject("E_GET_ACCOUNT_FLAGS_ERROR", "Error getting account flags: ${e.message}", e)
        }
    }

    /**
     * Sets account flags in SharedPreferences.
     * Compatible with v3 native app storage location.
     * Matches TypeScript: setAccountFlags(flags: Record<string, any>): Promise<boolean>
     */
    @ReactMethod
    override fun setAccountFlags(
        flags: ReadableMap,
        promise: Promise,
    ) {
        try {
            val account = getAccountSync()
            if (account == null) {
                promise.reject("E_ACCOUNT_NOT_FOUND", "Account not found")
                return
            }

            val accountId = account.getString("id")
            if (accountId.isNullOrEmpty()) {
                promise.reject("E_ACCOUNT_INVALID", "Account ID is null or empty")
                return
            }

            // Write to account-specific SharedPreferences (v3 compatible)
            val prefsName = "${reactApplicationContext.packageName}.PREFERENCE_FILE_KEY_$accountId"
            val prefs = reactApplicationContext.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            val editor = prefs.edit()

            // Map JS keys to v3 native keys
            val keyIterator = flags.keySetIterator()
            while (keyIterator.hasNextKey()) {
                val key = keyIterator.nextKey()
                when (key) {
                    "isEmailVerified" -> {
                        editor.putBoolean("is_email_verified", flags.getBoolean(key))
                    }

                    "userSkippedEmailVerification" -> {
                        editor.putBoolean("is_email_verification_skipped", flags.getBoolean(key))
                    }

                    "emailAddress" -> {
                        val value = flags.getString(key)
                        if (value != null) {
                            editor.putString("email_address", value)
                        } else {
                            editor.remove("email_address")
                        }
                    }

                    "userSubmittedVerificationVideo" -> {
                        editor.putBoolean("user_submitted_verification_video", flags.getBoolean(key))
                    }
                    // Add more flag mappings as needed
                }
            }

            editor.apply()

            Log.d(NAME, "setAccountFlags: Successfully saved account flags")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "setAccountFlags error: ${e.message}", e)
            promise.reject("E_SET_ACCOUNT_FLAGS_ERROR", "Error setting account flags: ${e.message}", e)
        }
    }

    /**
     * Deletes all account flags from SharedPreferences.
     * Matches TypeScript: deleteAccountFlags(): Promise<boolean>
     */
    @ReactMethod
    override fun deleteAccountFlags(promise: Promise) {
        try {
            val account = getAccountSync()
            if (account == null) {
                // No account, so nothing to delete
                promise.resolve(true)
                return
            }

            val accountId = account.getString("id")
            if (accountId.isNullOrEmpty()) {
                promise.resolve(true)
                return
            }

            // Clear account-specific SharedPreferences
            val prefsName = "${reactApplicationContext.packageName}.PREFERENCE_FILE_KEY_$accountId"
            val prefs = reactApplicationContext.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            prefs.edit().clear().apply()

            Log.d(NAME, "deleteAccountFlags: Successfully cleared account flags")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "deleteAccountFlags error: ${e.message}", e)
            promise.reject("E_DELETE_ACCOUNT_FLAGS_ERROR", "Error deleting account flags: ${e.message}", e)
        }
    }

    // ============================================================================
    // MARK: - Evidence Metadata Storage Methods
    // ============================================================================

    /**
     * Gets evidence metadata from storage.
     * Evidence metadata contains user's collected evidence during verification flow.
     * Stored as JSON array in SharedPreferences, per-account.
     * Matches TypeScript: getEvidenceMetadata(): Promise<EvidenceMetadata[]>
     */
    @ReactMethod
    override fun getEvidenceMetadata(promise: Promise) {
        try {
            val account = getAccountSync()
            if (account == null) {
                // No account, return empty array
                promise.resolve(Arguments.createArray())
                return
            }

            val accountId = account.getString("id")
            if (accountId.isNullOrEmpty()) {
                promise.resolve(Arguments.createArray())
                return
            }

            // Read from account-specific SharedPreferences
            val prefsName = "${reactApplicationContext.packageName}.PREFERENCE_FILE_KEY_$accountId"
            val prefs = reactApplicationContext.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            val evidenceJson = prefs.getString("evidence_metadata", null)

            if (evidenceJson == null) {
                // No evidence metadata stored yet - return empty array
                Log.d(NAME, "getEvidenceMetadata: No evidence metadata found")
                promise.resolve(Arguments.createArray())
                return
            }

            // Parse JSON array and convert to WritableArray
            val jsonArray = JSONArray(evidenceJson)
            val result = Arguments.createArray()

            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.getJSONObject(i)
                val map = Arguments.createMap()

                // Convert each evidence metadata object
                item.keys().forEach { key ->
                    when (val value = item.get(key)) {
                        is String -> map.putString(key, value)
                        is Int -> map.putInt(key, value)
                        is Double -> map.putDouble(key, value)
                        is Boolean -> map.putBoolean(key, value)
                        is JSONObject -> map.putMap(key, convertJsonToMap(value))
                        is JSONArray -> map.putArray(key, convertJsonToArray(value))
                        JSONObject.NULL -> map.putNull(key)
                    }
                }
                result.pushMap(map)
            }

            Log.d(NAME, "getEvidenceMetadata: Successfully read evidence metadata")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(NAME, "getEvidenceMetadata error: ${e.message}", e)
            promise.reject("E_GET_EVIDENCE_METADATA_ERROR", "Error getting evidence metadata: ${e.message}", e)
        }
    }

    /**
     * Sets evidence metadata in storage.
     * Stores user's collected evidence during verification flow.
     * Stored as JSON array in SharedPreferences, per-account.
     * Matches TypeScript: setEvidenceMetadata(evidence: EvidenceMetadata[]): Promise<boolean>
     */
    @ReactMethod
    override fun setEvidenceMetadata(
        evidence: ReadableArray,
        promise: Promise,
    ) {
        try {
            val account = getAccountSync()
            if (account == null) {
                promise.reject("E_ACCOUNT_NOT_FOUND", "Account not found")
                return
            }

            val accountId = account.getString("id")
            if (accountId.isNullOrEmpty()) {
                promise.reject("E_ACCOUNT_INVALID", "Account ID is null or empty")
                return
            }

            // Convert ReadableArray to JSON string
            val jsonArray = JSONArray()
            for (i in 0 until evidence.size()) {
                val item = evidence.getMap(i)
                if (item != null) {
                    jsonArray.put(convertMapToJson(item))
                }
            }

            // Write to account-specific SharedPreferences
            val prefsName = "${reactApplicationContext.packageName}.PREFERENCE_FILE_KEY_$accountId"
            val prefs = reactApplicationContext.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            prefs.edit().putString("evidence_metadata", jsonArray.toString()).apply()

            Log.d(NAME, "setEvidenceMetadata: Successfully saved evidence metadata")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "setEvidenceMetadata error: ${e.message}", e)
            promise.reject("E_SET_EVIDENCE_METADATA_ERROR", "Error setting evidence metadata: ${e.message}", e)
        }
    }

    /**
     * Deletes all evidence metadata from storage.
     * Clears user's collected evidence (used on verification completion or reset).
     * Matches TypeScript: deleteEvidenceMetadata(): Promise<boolean>
     */
    @ReactMethod
    override fun deleteEvidenceMetadata(promise: Promise) {
        try {
            val account = getAccountSync()
            if (account == null) {
                // No account, so nothing to delete
                promise.resolve(true)
                return
            }

            val accountId = account.getString("id")
            if (accountId.isNullOrEmpty()) {
                promise.resolve(true)
                return
            }

            // Remove from account-specific SharedPreferences
            val prefsName = "${reactApplicationContext.packageName}.PREFERENCE_FILE_KEY_$accountId"
            val prefs = reactApplicationContext.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            prefs.edit().remove("evidence_metadata").apply()

            Log.d(NAME, "deleteEvidenceMetadata: Successfully deleted evidence metadata")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "deleteEvidenceMetadata error: ${e.message}", e)
            promise.reject("E_DELETE_EVIDENCE_METADATA_ERROR", "Error deleting evidence metadata: ${e.message}", e)
        }
    }

    // ============================================================================
    // MARK: - Credential Storage Methods
    // ============================================================================

    /**
     * Gets credential information from native storage.
     * Android: Stored within Provider → ClientRegistration in secure storage
     * Compatible with v3 native app storage for verification state detection.
     * Matches TypeScript: getCredential(): Promise<Record<string, unknown> | null>
     */
    @ReactMethod
    override fun getCredential(promise: Promise) {
        try {
            val sharedPreferences =
                reactApplicationContext.getSharedPreferences(
                    reactApplicationContext.packageName,
                    Context.MODE_PRIVATE,
                )

            val providerJson = sharedPreferences.getString("provider", null)
            if (providerJson == null) {
                Log.d(NAME, "getCredential: No provider data found")
                promise.resolve(null)
                return
            }

            val providerData = JSONObject(providerJson)
            if (!providerData.has("clientRegistration")) {
                Log.d(NAME, "getCredential: No clientRegistration found in provider")
                promise.resolve(null)
                return
            }

            val clientRegistration = providerData.getJSONObject("clientRegistration")
            if (!clientRegistration.has("credential")) {
                Log.d(NAME, "getCredential: No credential found in clientRegistration")
                promise.resolve(null)
                return
            }

            val credentialJson = clientRegistration.getJSONObject("credential")

            // Convert JSON to WritableMap for React Native
            val credentialMap = Arguments.createMap()
            credentialJson.keys().forEach { key ->
                val value = credentialJson.get(key)
                when (value) {
                    is String -> credentialMap.putString(key, value)
                    is Int -> credentialMap.putInt(key, value)
                    is Double -> credentialMap.putDouble(key, value)
                    is Boolean -> credentialMap.putBoolean(key, value)
                    is Long -> credentialMap.putDouble(key, value.toDouble())
                    JSONObject.NULL -> credentialMap.putNull(key)
                    else -> credentialMap.putString(key, value.toString())
                }
            }

            Log.d(NAME, "getCredential: Successfully retrieved credential")
            promise.resolve(credentialMap)
        } catch (e: Exception) {
            Log.e(NAME, "getCredential error: \${e.message}", e)
            promise.reject("E_GET_CREDENTIAL_ERROR", "Error getting credential: \${e.message}", e)
        }
    }

    /**
     * Sets credential information in native storage.
     * Android: Stores within Provider → ClientRegistration in secure storage
     * Compatible with v3 native app storage for verification state detection.
     * Matches TypeScript: setCredential(credential: Record<string, unknown>): Promise<boolean>
     */
    @ReactMethod
    override fun setCredential(
        credentialData: ReadableMap,
        promise: Promise,
    ) {
        try {
            val sharedPreferences =
                reactApplicationContext.getSharedPreferences(
                    reactApplicationContext.packageName,
                    Context.MODE_PRIVATE,
                )

            // Get or create provider data
            val providerJson = sharedPreferences.getString("provider", null)
            val providerData =
                if (providerJson != null) {
                    JSONObject(providerJson)
                } else {
                    JSONObject()
                }

            // Get or create clientRegistration
            val clientRegistration =
                if (providerData.has("clientRegistration")) {
                    providerData.getJSONObject("clientRegistration")
                } else {
                    JSONObject()
                }

            // Convert ReadableMap to JSONObject
            val credentialJson = JSONObject()
            val iterator = credentialData.keySetIterator()
            while (iterator.hasNextKey()) {
                val key = iterator.nextKey()
                when (val value = credentialData.getDynamic(key)) {
                    null -> {
                        credentialJson.put(key, JSONObject.NULL)
                    }

                    else -> {
                        when (value.type) {
                            com.facebook.react.bridge.ReadableType.String -> credentialJson.put(key, value.asString())
                            com.facebook.react.bridge.ReadableType.Number -> credentialJson.put(key, value.asDouble())
                            com.facebook.react.bridge.ReadableType.Boolean -> credentialJson.put(key, value.asBoolean())
                            com.facebook.react.bridge.ReadableType.Null -> credentialJson.put(key, JSONObject.NULL)
                            else -> credentialJson.put(key, value.toString())
                        }
                    }
                }
            }

            // Set credential in clientRegistration
            clientRegistration.put("credential", credentialJson)
            providerData.put("clientRegistration", clientRegistration)

            // Save back to SharedPreferences
            val editor = sharedPreferences.edit()
            editor.putString("provider", providerData.toString())
            editor.apply()

            Log.d(NAME, "setCredential: Successfully saved credential")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "setCredential error: \${e.message}", e)
            promise.reject("E_SET_CREDENTIAL_ERROR", "Error setting credential: \${e.message}", e)
        }
    }

    /**
     * Deletes credential information from native storage.
     * This effectively marks the account as not verified
     * Matches TypeScript: deleteCredential(): Promise<boolean>
     */
    @ReactMethod
    override fun deleteCredential(promise: Promise) {
        try {
            val sharedPreferences =
                reactApplicationContext.getSharedPreferences(
                    reactApplicationContext.packageName,
                    Context.MODE_PRIVATE,
                )

            val providerJson = sharedPreferences.getString("provider", null)
            if (providerJson == null) {
                Log.d(NAME, "deleteCredential: No provider data found")
                promise.resolve(true)
                return
            }

            val providerData = JSONObject(providerJson)
            if (!providerData.has("clientRegistration")) {
                Log.d(NAME, "deleteCredential: No clientRegistration found")
                promise.resolve(true)
                return
            }

            val clientRegistration = providerData.getJSONObject("clientRegistration")

            // Remove credential from clientRegistration
            if (clientRegistration.has("credential")) {
                clientRegistration.remove("credential")

                // Save updated provider data
                providerData.put("clientRegistration", clientRegistration)
                val editor = sharedPreferences.edit()
                editor.putString("provider", providerData.toString())
                editor.apply()

                Log.d(NAME, "deleteCredential: Successfully removed credential")
            } else {
                Log.d(NAME, "deleteCredential: No credential found to remove")
            }

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(NAME, "deleteCredential error: \${e.message}", e)
            promise.reject("E_DELETE_CREDENTIAL_ERROR", "Error deleting credential: \${e.message}", e)
        }
    }

    /**
     * Checks if a credential exists without retrieving it.
     * Useful for quick verification status checks
     * Matches TypeScript: hasCredential(): Promise<boolean>
     */
    @ReactMethod
    override fun hasCredential(promise: Promise) {
        try {
            val sharedPreferences =
                reactApplicationContext.getSharedPreferences(
                    reactApplicationContext.packageName,
                    Context.MODE_PRIVATE,
                )

            val providerJson = sharedPreferences.getString("provider", null)
            if (providerJson == null) {
                Log.d(NAME, "hasCredential: No provider data found")
                promise.resolve(false)
                return
            }

            val providerData = JSONObject(providerJson)
            if (!providerData.has("clientRegistration")) {
                Log.d(NAME, "hasCredential: No clientRegistration found")
                promise.resolve(false)
                return
            }

            val clientRegistration = providerData.getJSONObject("clientRegistration")
            val hasCredential = clientRegistration.has("credential")

            Log.d(NAME, "hasCredential: \$hasCredential")
            promise.resolve(hasCredential)
        } catch (e: Exception) {
            Log.e(NAME, "hasCredential error: \${e.message}", e)
            promise.reject("E_HAS_CREDENTIAL_ERROR", "Error checking credential existence: \${e.message}", e)
        }
    }

    // MARK: - Authentication Service Initialization

    // Initialize authentication services
    private val deviceAuthenticationService: DeviceAuthenticationService by lazy {
        DeviceAuthenticationServiceImpl(reactApplicationContext)
    }

    private val pinService: PinService by lazy {
        PinService(reactApplicationContext)
    }

    // MARK: - JSON Conversion Helpers

    /**
     * Converts a JSONObject to a WritableMap for React Native.
     */
    private fun convertJsonToMap(jsonObject: JSONObject): WritableMap {
        val map = Arguments.createMap()
        jsonObject.keys().forEach { key ->
            when (val value = jsonObject.get(key)) {
                is String -> map.putString(key, value)
                is Int -> map.putInt(key, value)
                is Double -> map.putDouble(key, value)
                is Boolean -> map.putBoolean(key, value)
                is Long -> map.putDouble(key, value.toDouble())
                is JSONObject -> map.putMap(key, convertJsonToMap(value))
                is JSONArray -> map.putArray(key, convertJsonToArray(value))
                JSONObject.NULL -> map.putNull(key)
                else -> map.putString(key, value.toString())
            }
        }
        return map
    }

    /**
     * Converts a JSONArray to a WritableArray for React Native.
     */
    private fun convertJsonToArray(jsonArray: JSONArray): WritableArray {
        val array = Arguments.createArray()
        for (i in 0 until jsonArray.length()) {
            when (val value = jsonArray.get(i)) {
                is String -> array.pushString(value)
                is Int -> array.pushInt(value)
                is Double -> array.pushDouble(value)
                is Boolean -> array.pushBoolean(value)
                is Long -> array.pushDouble(value.toDouble())
                is JSONObject -> array.pushMap(convertJsonToMap(value))
                is JSONArray -> array.pushArray(convertJsonToArray(value))
                JSONObject.NULL -> array.pushNull()
                else -> array.pushString(value.toString())
            }
        }
        return array
    }

    /**
     * Converts a ReadableMap to a JSONObject.
     */
    private fun convertMapToJson(readableMap: ReadableMap): JSONObject {
        val jsonObject = JSONObject()
        val iterator = readableMap.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (val type = readableMap.getType(key)) {
                com.facebook.react.bridge.ReadableType.Null -> {
                    jsonObject.put(key, JSONObject.NULL)
                }

                com.facebook.react.bridge.ReadableType.Boolean -> {
                    jsonObject.put(key, readableMap.getBoolean(key))
                }

                com.facebook.react.bridge.ReadableType.Number -> {
                    jsonObject.put(key, readableMap.getDouble(key))
                }

                com.facebook.react.bridge.ReadableType.String -> {
                    jsonObject.put(key, readableMap.getString(key))
                }

                com.facebook.react.bridge.ReadableType.Map -> {
                    val nestedMap = readableMap.getMap(key)
                    if (nestedMap != null) {
                        jsonObject.put(key, convertMapToJson(nestedMap))
                    }
                }

                com.facebook.react.bridge.ReadableType.Array -> {
                    val nestedArray = readableMap.getArray(key)
                    if (nestedArray != null) {
                        jsonObject.put(key, convertArrayToJson(nestedArray))
                    }
                }
            }
        }
        return jsonObject
    }

    /**
     * Converts a ReadableArray to a JSONArray.
     */
    private fun convertArrayToJson(readableArray: ReadableArray): JSONArray {
        val jsonArray = JSONArray()
        for (i in 0 until readableArray.size()) {
            when (val type = readableArray.getType(i)) {
                com.facebook.react.bridge.ReadableType.Null -> {
                    jsonArray.put(JSONObject.NULL)
                }

                com.facebook.react.bridge.ReadableType.Boolean -> {
                    jsonArray.put(readableArray.getBoolean(i))
                }

                com.facebook.react.bridge.ReadableType.Number -> {
                    jsonArray.put(readableArray.getDouble(i))
                }

                com.facebook.react.bridge.ReadableType.String -> {
                    jsonArray.put(readableArray.getString(i))
                }

                com.facebook.react.bridge.ReadableType.Map -> {
                    val nestedMap = readableArray.getMap(i)
                    if (nestedMap != null) {
                        jsonArray.put(convertMapToJson(nestedMap))
                    }
                }

                com.facebook.react.bridge.ReadableType.Array -> {
                    val nestedArray = readableArray.getArray(i)
                    if (nestedArray != null) {
                        jsonArray.put(convertArrayToJson(nestedArray))
                    }
                }
            }
        }
        return jsonArray
    }

    /**
     * Displays a local notification on the device.
     * @param title The notification title
     * @param message The notification body/message
     */
    @ReactMethod
    override fun showLocalNotification(
        title: String,
        message: String,
        promise: Promise,
    ) {
        Log.d(NAME, "showLocalNotification - title: $title, message: $message")

        try {
            val notificationManager = reactApplicationContext.getSystemService(NotificationManager::class.java)

            // Create notification channel once on first use (Android O+)
            if (!notificationChannelCreated && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel =
                    NotificationChannel(
                        NOTIFICATION_CHANNEL_ID,
                        NOTIFICATION_CHANNEL_NAME,
                        NotificationManager.IMPORTANCE_HIGH,
                    ).apply {
                        description = "Notifications displayed while app is in foreground"
                    }
                notificationManager.createNotificationChannel(channel)
                notificationChannelCreated = true
                Log.d(NAME, "showLocalNotification - Notification channel created")
            }

            // Build and display the notification
            // Look up icon from app resources (not library resources)
            val iconResId =
                reactApplicationContext.resources
                    .getIdentifier(
                        "ic_notification",
                        "drawable",
                        reactApplicationContext.packageName,
                    ).takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info

            val notification =
                NotificationCompat
                    .Builder(reactApplicationContext, NOTIFICATION_CHANNEL_ID)
                    .setSmallIcon(iconResId)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .build()

            val notificationId = System.currentTimeMillis().toInt()
            notificationManager.notify(notificationId, notification)

            Log.d(NAME, "showLocalNotification - Notification displayed with ID: $notificationId")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(NAME, "showLocalNotification - Error displaying notification: ${e.message}", e)
            promise.reject("E_NOTIFICATION_ERROR", "Failed to display notification: ${e.message}", e)
        }
    }

    // MARK: - PIN Penalty Helper Methods

    /**
     * Calculates remaining penalty time in milliseconds.
     * Returns 0 if no penalty is active.
     */
    private fun getRemainingPenaltyTime(
        penalty: NativePenalty,
        currentTimeMillis: Long,
    ): Long {
        if (penalty.penaltyEndTime <= 0) {
            return 0L
        }
        val remaining = penalty.penaltyEndTime - currentTimeMillis
        return if (remaining > 0) remaining else 0L
    }

    /**
     * Calculates penalty duration in milliseconds based on failed attempt count.
     * Matches iOS penalty schedule:
     * - 5 attempts: 30 seconds
     * - 6 attempts: 1 minute
     * - 7 attempts: 5 minutes
     * - 8+ attempts (every 3): 15 minutes
     */
    private fun calculatePenaltyDuration(failedAttempts: Int): Long =
        when (failedAttempts) {
            5 -> {
                30_000L
            }

            // 30 seconds
            6 -> {
                60_000L
            }

            // 1 minute
            7 -> {
                300_000L
            }

            // 5 minutes
            else -> {
                // For 8+ attempts, apply 15 minute penalty every 3 attempts
                if (failedAttempts >= 8 && failedAttempts % 3 == 0) {
                    900_000L // 15 minutes
                } else {
                    0L // No penalty
                }
            }
        }

    /**
     * Gets appropriate title and message for penalty state.
     * Returns pair of (title, message).
     */
    private fun getPenaltyMessage(
        failedAttempts: Int,
        penaltyDuration: Long,
    ): Pair<String, String> =
        if (penaltyDuration > 0) {
            Pair("Too Many Attempts", "Please wait before trying again")
        } else {
            // Calculate remaining attempts until next penalty
            val attemptsUntilPenalty =
                when {
                    failedAttempts < 5 -> {
                        5 - failedAttempts
                    }

                    failedAttempts < 6 -> {
                        6 - failedAttempts
                    }

                    failedAttempts < 7 -> {
                        7 - failedAttempts
                    }

                    else -> {
                        // After 7, penalty every 3 attempts
                        val nextPenaltyAttempt = ((failedAttempts / 3) + 1) * 3
                        nextPenaltyAttempt - failedAttempts
                    }
                }

            val message =
                if (attemptsUntilPenalty == 1) {
                    "Enter your PIN. For security, if you enter another incorrect PIN, it will temporarily lock the app."
                } else {
                    "Incorrect PIN"
                }

            Pair("Incorrect PIN", message)
        }

    @ReactMethod
    override fun decodeLoginChallenge(
        jwt: String,
        key: ReadableMap?,
        promise: Promise,
    ) {
        try {
            if (jwt.isBlank()) {
                Log.e(NAME, "decodeLoginChallenge: JWT is empty or blank")
                promise.reject("E_INVALID_JWT", "JWT must not be empty")
                return
            }
            val signedJWT = SignedJWT.parse(jwt)
            val jwtClaims = signedJWT.jwtClaimsSet

            Log.d(NAME, "decodeLoginChallenge: claims = ${jwtClaims.toJSONObject()}")

            // Attempt verification if key is provided
            val verified =
                if (key != null) {
                    verifyJwtSignature(signedJWT, key)
                } else {
                    false
                }

            val claims =
                Arguments.createMap().apply {
                    putString("aud", jwtClaims.audience?.firstOrNull() ?: "")
                    putString("iss", jwtClaims.issuer ?: "")
                    putString("bcsc_challenge", jwtClaims.getStringClaim("bcsc_challenge") ?: "")
                    putDouble(
                        "exp",
                        jwtClaims.expirationTime
                            ?.time
                            ?.div(1000)
                            ?.toDouble() ?: 0.0,
                    )
                    putString("bcsc_client_name", jwtClaims.getStringClaim("bcsc_client_name") ?: "")
                    putDouble(
                        "iat",
                        jwtClaims.issueTime
                            ?.time
                            ?.div(1000)
                            ?.toDouble() ?: 0.0,
                    )
                    putString("jti", jwtClaims.jwtid ?: "")
                }

            val result =
                Arguments.createMap().apply {
                    putBoolean("verified", verified)
                    putMap("claims", claims)
                }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(NAME, "decodeLoginChallenge: Unexpected error: ${e.message}", e)
            promise.reject("E_DECODE_LOGIN_CHALLENGE_ERROR", "Unable to decode login challenge", e)
        }
    }

    @ReactMethod
    override fun isThirdPartyKeyboardActive(promise: Promise) {
        try {
            val currentInputMethod =
                android.provider.Settings.Secure.getString(
                    reactApplicationContext.contentResolver,
                    android.provider.Settings.Secure.DEFAULT_INPUT_METHOD,
                )
            val isSystemKeyboard =
                currentInputMethod?.contains("com.android") == true ||
                    currentInputMethod?.contains("com.google") == true

            promise.resolve(!isSystemKeyboard)
        } catch (e: Exception) {
            Log.e(NAME, "3rdPartyKeyboardCheck: ${e.message}", e)
            promise.resolve(false) // Default to false if any error occurs, to avoid blocking user input
        }
    }

    @ReactMethod
    override fun openKeyboardSelector() {
        val imm = reactApplicationContext.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
        imm?.showInputMethodPicker()
    }

    /**
     * Verifies the JWT signature using the provided JWK.
     * Returns true if verification succeeds, false otherwise.
     */
    private fun verifyJwtSignature(
        signedJWT: SignedJWT,
        jwk: ReadableMap,
    ): Boolean {
        return try {
            // Validate JWK has required fields
            if (!jwk.hasKey("n") || !jwk.hasKey("e")) {
                Log.w(NAME, "verifyJwtSignature: JWK missing required fields (n, e)")
                return false
            }

            val n = jwk.getString("n") ?: return false
            val e = jwk.getString("e") ?: return false

            // Build RSA public key from JWK components
            val rsaKey =
                RSAKey
                    .Builder(
                        com.nimbusds.jose.util
                            .Base64URL(n),
                        com.nimbusds.jose.util
                            .Base64URL(e),
                    ).build()

            val publicKey = rsaKey.toRSAPublicKey()
            val verifier = RSASSAVerifier(publicKey)

            val verified = signedJWT.verify(verifier)
            Log.d(NAME, "verifyJwtSignature: verification result = $verified")
            verified
        } catch (e: Exception) {
            Log.e(NAME, "verifyJwtSignature: Verification failed: ${e.message}", e)
            false
        }
    }

    /**
     * Performs a recursive scan of all files in the app's private storage directory.
     *
     * This method scans the filesDir (context.filesDir) and logs all files and directories
     * to help diagnose storage layout, migration issues, and file organization.
     * Mirrors the iOS getNativeFilesScan functionality.
     *
     * @param promise Resolves with a map containing:
     *   - packageName: The app's package name
     *   - filesDirectory: Path to the app's files directory
     *   - filesDirExists: Whether the files directory exists
     *   - files: Array of relative paths to all files/directories found
     *   - fileCount: Total count of files/directories
     */
    @ReactMethod
    fun getNativeFilesScan(promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            val filesDir = reactApplicationContext.filesDir
            val filesDirExists = filesDir.exists()

            val result = Arguments.createMap().apply {
                putString("packageName", packageName)
                putString("filesDirectory", filesDir.absolutePath)
                putBoolean("filesDirExists", filesDirExists)

                if (filesDirExists) {
                    // Recursively scan all files starting from filesDir
                    val allFiles = mutableListOf<String>()
                    recursiveFileScan(filesDir, filesDir, allFiles)

                    val filesArray = Arguments.createArray()
                    allFiles.forEach { filePath ->
                        filesArray.pushString(filePath)
                    }

                    putArray("files", filesArray)
                    putInt("fileCount", allFiles.size)

                    Log.i(
                        NAME,
                        "[Native File Scan] Found ${allFiles.size} files/directories in Android storage"
                    )
                    allFiles.forEach { file ->
                        Log.i(NAME, "[Native File Scan] $file")
                    }
                } else {
                    putArray("files", Arguments.createArray())
                    putInt("fileCount", 0)
                    Log.i(NAME, "[Native File Scan] Files directory does not exist")
                }
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(NAME, "getNativeFilesScan: Failed to scan files: ${e.message}", e)
            promise.reject(
                "E_NATIVE_FILE_SCAN_FAILED",
                "Failed to scan native files: ${e.localizedMessage}",
                e
            )
        }
    }

    /**
     * Recursively scans a directory and collects all file/directory paths relative to the base directory.
     *
     * @param directory The current directory to scan
     * @param baseDirectory The root directory (used to compute relative paths)
     * @param results Mutable list to collect file paths
     */
    private fun recursiveFileScan(
        directory: File,
        baseDirectory: File,
        results: MutableList<String>,
    ) {
        try {
            val files = directory.listFiles() ?: return

            for (file in files) {
                // Compute relative path from base directory
                val relativePath = file.absolutePath.removePrefix(baseDirectory.absolutePath)
                    .removePrefix(File.separator)

                results.add(relativePath)

                // Recursively scan subdirectories
                if (file.isDirectory) {
                    Log.i(NAME, "[Native File Scan] Directory (full path): ${file.absolutePath}")
                    recursiveFileScan(file, baseDirectory, results)
                }
            }
        } catch (e: Exception) {
            Log.w(NAME, "recursiveFileScan: Error scanning directory: ${e.message}", e)
        }
    }
}
