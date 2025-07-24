package com.bcsccore

// Android imports
import android.os.Build
import android.security.keystore.KeyProperties
import android.util.Log

// React Native imports
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
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

// JWT/Nimbus imports
import com.nimbusds.jose.jwk.JWK
import com.nimbusds.jwt.JWTClaimsSet

// BCSC KeyPair package imports
import com.bcsccore.keypair.core.exceptions.BcscException
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

/**
 * BC Services Card React Native Module
 * 
 * Provides secure key management, token handling, and authentication services
 * for BC Services Card integration in React Native applications.
 */
@ReactModule(name = BcscCoreModule.NAME)
class BcscCoreModule(reactContext: ReactApplicationContext) :
  BcscCoreSpec(reactContext) {

  companion object {
    const val NAME = "BcscCore"
    
    // Token type constants
    private const val TOKEN_TYPE_ACCESS = 0
    private const val TOKEN_TYPE_REFRESH = 1
    private const val TOKEN_TYPE_REGISTRATION = 2
    
    // JWT expiration in seconds
    private const val JWT_EXPIRATION_SECONDS = 3600 // 1 hour
  }

  override fun getName(): String = NAME

  // Initialize the BC Services Card KeyPair functionality
  private val keyPairSource: BcscKeyPairSource by lazy {
    val keyPairInfoSource = SimpleKeyPairInfoSource(reactApplicationContext)
    BcscKeyPairRepo(keyPairInfoSource)
  }

  /**
   * Determines the current environment based on the Android package name.
   * Similar to the Swift implementation that uses bundle ID.
   */
  private val currentEnvName: String
    get() {
      val packageName = reactApplicationContext.packageName
      return when (packageName) {
        "ca.bc.gov.id.servicescard" -> "prod"
        "ca.bc.gov.id.servicescard.dev" -> "sit"  
        "ca.bc.gov.id.servicescard.qa" -> "qa"
        else -> {
          Log.d(NAME, "Unknown package name: $packageName, defaulting to SIT environment")
          "sit"
        }
      }
    }

  @ReactMethod
  override fun getKeyPair(keyAlias: String, promise: Promise) {
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
  override fun getToken(tokenType: Int, promise: Promise) {
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
      Log.d(NAME, "Available files in base directory (${availableFiles.size} files): ${availableFiles.joinToString(", ")}")
      
      // Use DecryptedFileReader to read and decrypt the token file
      val decryptedFileReader = DecryptedFileReader(reactApplicationContext)
      val relativePath = "$currentEnvName/$accountId/tokens"
      val tokenFilePath = "${baseDir.absolutePath}/$relativePath"
      Log.d(NAME, "Full token file path: $tokenFilePath")
      
      try {
        val decryptedFileData: DecryptedFileData? = decryptedFileReader.readDecryptedFile(relativePath)
        
        if (decryptedFileData != null) {
          Log.d(NAME, "Successfully read and decrypted token file using bcsc-file-port from path: $tokenFilePath")
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
                    Log.d(NAME, "Returning refresh token with id: ${refreshTokenObj.optString("id")}")
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
          Log.d(NAME, "Failed to read token file using bcsc-file-port from path: $tokenFilePath - file not found or empty")
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
  
  private fun createTokenFromJson(tokenObj: JSONObject, tokenType: Int): WritableMap {
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
  
  private fun createRegistrationTokenFromJson(idTokenObj: JSONObject, tokenType: Int): WritableMap {
    val token: WritableMap = Arguments.createMap()
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
      val formats = arrayOf(
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US), // ISO with milliseconds
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US),     // ISO without milliseconds
        SimpleDateFormat("MMM dd, yyyy h:mm:ss a", Locale.US),       // US format: "Jun 26, 2025 3:39:55 PM"
        SimpleDateFormat("MMM d, yyyy h:mm:ss a", Locale.US),        // Alternative US format
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS", Locale.US),    // ISO without Z
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)         // ISO without Z and milliseconds
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

  @ReactMethod
  override fun setAccount(account: ReadableMap, promise: Promise) {
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
      
      // Generate a new UUID for the account
      val accountId = UUID.randomUUID().toString()
      
      Log.d(NAME, "setAccount - Creating account with generated id: $accountId")
      
      try {
        // Get the file reader to determine the root directory (for consistency)
        val fileReader: FileReader = FileReaderFactory.createSimpleFileReader(reactApplicationContext)
        val accountsFile = File(reactApplicationContext.filesDir, "accounts")
        
        // Create account object with generated ID
        val accountWithId = Arguments.createMap()
        accountWithId.putString("id", accountId)
        accountWithId.putString("issuer", issuer)
        accountWithId.putString("clientID", clientID)
        accountWithId.putString("securityMethod", securityMethod)
        
        // Copy optional fields
        if (account.hasKey("displayName")) {
          accountWithId.putString("displayName", account.getString("displayName"))
        }
        if (account.hasKey("nickname")) {
          accountWithId.putString("nickname", account.getString("nickname"))
        }
        if (account.hasKey("didPostNicknameToServer")) {
          accountWithId.putBoolean("didPostNicknameToServer", account.getBoolean("didPostNicknameToServer"))
        }
        if (account.hasKey("failedAttemptCount")) {
          accountWithId.putInt("failedAttemptCount", account.getInt("failedAttemptCount"))
        }
        
        // Convert to JSON and create single-account array
        val accountJson = createJsonAccountFromNative(accountWithId)
        val accountsArray = JSONArray()
        accountsArray.put(accountJson)
        
        Log.d(NAME, "setAccount - Created new single-account array, overwriting any existing file")
        
        // Always overwrite the accounts file with the new single account
        try {
          accountsFile.parentFile?.mkdirs() // Ensure directory exists
          FileWriter(accountsFile).use { writer ->
            writer.write(accountsArray.toString())
            writer.flush()
          }
          
          Log.d(NAME, "setAccount - Successfully overwrote accounts file with new account")
          promise.resolve(null)
          
        } catch (e: IOException) {
          Log.e(NAME, "setAccount - Failed to write accounts file: ${e.message}", e)
          promise.reject("E_FILE_WRITE_ERROR", "Failed to write accounts file: ${e.message}")
        }
        
      } catch (e: Exception) {
        Log.e(NAME, "setAccount - Exception occurred while accessing accounts file: ${e.message}", e)
        promise.reject("E_FILE_ACCESS_ERROR", "Failed to access accounts file: ${e.message}")
      }
      
    } catch (e: Exception) {
      Log.e(NAME, "setAccount - Unexpected error: ${e.message}", e)
      promise.reject("E_UNEXPECTED_ERROR", "Unexpected error while setting account: ${e.message}")
    }
  }

  @ReactMethod
  override fun getAccount(promise: Promise) {
    Log.d(NAME, "getAccount called")
    
    // Attempt to read the accounts file using bcsc-file-port (non-encrypted)
    try {
      val fileReader: FileReader = FileReaderFactory.createSimpleFileReader(reactApplicationContext)
      
      // Get and log the base storage directory
      val baseDir = fileReader.getStorageDirectory()
      Log.d(NAME, "getAccount - Base files directory: ${baseDir.absolutePath}")
      
      // List all available files for debugging
      val availableFiles = fileReader.listFiles()
      Log.d(NAME, "getAccount - Available files in base directory (${availableFiles.size} files): ${availableFiles.joinToString(", ")}")

      // The accounts file is at the root directory
      val relativePath = "accounts"
      val accountFilePath = "${baseDir.absolutePath}/$relativePath"
      Log.d(NAME, "getAccount - Full accounts file path: $accountFilePath")
      

      try {
        // Read the non-encrypted accounts file
        val accountFileBytes = fileReader.readFile(relativePath)
        
        if (accountFileBytes != null && accountFileBytes.isNotEmpty()) {
          // Convert bytes to string
          val accountFileContent = String(accountFileBytes, Charsets.UTF_8)
          Log.d(NAME, "getAccount - Successfully read accounts file from path: $accountFilePath")
          Log.d(NAME, "getAccount - Accounts file content size: ${accountFileContent.length} characters")
          
          // Try to parse as JSON array
          try {
            val jsonArray = org.json.JSONArray(accountFileContent)
            Log.d(NAME, "getAccount - Accounts file content appears to be valid JSON array with ${jsonArray.length()} accounts")
            
            if (jsonArray.length() > 0) {
              // Get the first account from the array
              val accountObj = jsonArray.getJSONObject(0)
              Log.d(NAME, "getAccount - Found account with UUID: ${accountObj.optString("uuid")}")
              
              // Parse the account data and create NativeAccount object
              val account = createNativeAccountFromJson(accountObj)
              Log.d(NAME, "getAccount - Returning parsed account data")
              promise.resolve(account)
              return
            } else {
              Log.d(NAME, "getAccount - Accounts file is empty array")
              promise.resolve(null)
              return
            }
            
          } catch (e: Exception) {
            Log.w(NAME, "getAccount - Accounts file content is not valid JSON array: ${e.message}")
          }
          
        } else {
          Log.d(NAME, "getAccount - Accounts file not found or empty at path: $accountFilePath")
        }
        
      } catch (e: Exception) {
        Log.e(NAME, "getAccount - Failed to read accounts file from path: $accountFilePath - ${e.message}", e)
      }
      
    } catch (e: Exception) {
      Log.e(NAME, "getAccount - Exception occurred while reading accounts file: ${e.message}", e)
    }
    
    // If we couldn't read the file or parse it, return null
    Log.d(NAME, "getAccount - Could not read or parse accounts file, returning null")
    promise.resolve(null)
  }
  
  /**
   * Converts a JSON account object to a NativeAccount WritableMap.
   * Maps JSON fields to the NativeAccount interface specification.
   */
  private fun createNativeAccountFromJson(accountObj: JSONObject): WritableMap {
    val account: WritableMap = Arguments.createMap()
    
    // Map JSON fields to NativeAccount interface fields
    account.putString("id", accountObj.optString("uuid", "unknown")) // uuid -> id
    account.putString("issuer", accountObj.optString("issuer", ""))
    account.putString("clientID", accountObj.optString("clientId", "")) // clientId -> clientID
    
    // Map accountSecurityType to securityMethod enum values
    val securityType = accountObj.optString("accountSecurityType", "")
    val securityMethod = when (securityType) {
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
    
    Log.d(NAME, "Created account: id=${account.getString("id")}, " +
                "issuer=${account.getString("issuer")}, " +
                "clientID=${account.getString("clientID")}, " +
                "securityMethod=${account.getString("securityMethod")}")
    
    return account
  }

  /**
   * Converts a React Native account ReadableMap to JSON format for storage.
   * Maps NativeAccount interface fields to the JSON storage format.
   */
  private fun createJsonAccountFromNative(account: ReadableMap): JSONObject {
    val accountJson = JSONObject()
    
    // Required fields - map NativeAccount to JSON storage format
    accountJson.put("uuid", account.getString("id")) // id -> uuid
    accountJson.put("issuer", account.getString("issuer"))
    accountJson.put("clientId", account.getString("clientID")) // clientID -> clientId
    
    // Map securityMethod enum back to accountSecurityType
    val securityMethod = account.getString("securityMethod") ?: "device_authentication"
    val securityType = when (securityMethod) {
      "device_authentication" -> "DeviceSecurity"
      "app_pin_no_device_authn" -> "PinNoDeviceAuth"
      "app_pin_has_device_authn" -> "PinWithDeviceAuth"
      else -> "DeviceSecurity" // Default fallback
    }
    accountJson.put("accountSecurityType", securityType)
    
    // Optional fields
    if (account.hasKey("displayName")) {
      val displayName = account.getString("displayName")
      if (!displayName.isNullOrEmpty()) {
        accountJson.put("nickName", displayName)
      }
    }
    
    // Handle penalty information
    if (account.hasKey("failedAttemptCount")) {
      val failedAttempts = account.getInt("failedAttemptCount")
      val penaltyObj = JSONObject()
      penaltyObj.put("penaltyAttempts", failedAttempts)
      accountJson.put("penalty", penaltyObj)
    }
    
    Log.d(NAME, "Created JSON account: uuid=${accountJson.optString("uuid")}, " +
                "issuer=${accountJson.optString("issuer")}, " +
                "clientId=${accountJson.optString("clientId")}, " +
                "accountSecurityType=${accountJson.optString("accountSecurityType")}")
    
    return accountJson
  }

  @ReactMethod
  override fun getRefreshTokenRequestBody(issuer: String, clientID: String, refreshToken: String, promise: Promise) {
    // Validate all parameters are provided
    if (issuer.isEmpty() || clientID.isEmpty() || refreshToken.isEmpty()) {
      promise.reject("E_INVALID_PARAMETERS", "All parameters (issuer, clientID, refreshToken) are required and cannot be empty.")
      return
    }
    
    try {
      // Get the current key pair for signing
      val currentKeyPair = keyPairSource.getCurrentBcscKeyPair()
      
      // Create JWT assertion for OAuth2 client credentials
      val now = Date()
      val expiration = Date(now.time + JWT_EXPIRATION_SECONDS * 1000)
      
      val claimsSet = JWTClaimsSet.Builder()
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
      val body = "grant_type=$grantType&client_id=$clientID&client_assertion_type=$assertionType&client_assertion=$clientAssertion&refresh_token=$refreshToken"
      
      Log.d(NAME, "getRefreshTokenRequestBody: Successfully created request body with issuer: $issuer, clientID: $clientID")
      promise.resolve(body)
      
    } catch (e: BcscException) {
      Log.e(NAME, "getRefreshTokenRequestBody: BCSC error: ${e.devMessage}", e)
      promise.reject("E_BCSC_REFRESH_TOKEN_ERROR", "Error creating refresh token request with bcsc-keypair-port: ${e.devMessage}", e)
    } catch (e: Exception) {
      Log.e(NAME, "getRefreshTokenRequestBody: Unexpected error: ${e.message}", e)
      promise.reject("E_REFRESH_TOKEN_ERROR", "Unexpected error creating refresh token request: ${e.message}", e)
    }
  }

  @ReactMethod
  override fun signPairingCode(code: String, issuer: String, clientID: String, fcmDeviceToken: String, deviceToken: String?, promise: Promise) {
    try {
      // Use empty string if deviceToken is not provided
      val actualDeviceToken = deviceToken ?: ""
      
      // Get the current (newest) key pair for signing
      val currentKeyPair = keyPairSource.getCurrentBcscKeyPair()
      
      // Build JWT claims set for pairing code signing
      val claimsSet = JWTClaimsSet.Builder()
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
        .claim("device_id", UUID.randomUUID().toString()) // Generate unique device ID
        .claim("device_token", actualDeviceToken)
        .claim("app_version", getAppVersion())
        .claim("app_build", getAppBuildNumber())
        .claim("has_other_accounts", false) // This could be made dynamic
        .build()
      
      // Sign the JWT using bcsc-keypair-port
      val signedJWT = keyPairSource.signAndSerializeClaimsSet(claimsSet)
      
      Log.d(NAME, "signPairingCode: Successfully signed pairing code with issuer: $issuer, clientID: $clientID")
      promise.resolve(signedJWT)
      
    } catch (e: BcscException) {
      Log.e(NAME, "signPairingCode: BCSC signing error: ${e.devMessage}", e)
      promise.reject("E_BCSC_SIGNING_ERROR", "Error signing pairing code with bcsc-keypair-port: ${e.devMessage}", e)
    } catch (e: Exception) {
      Log.e(NAME, "signPairingCode: Unexpected error: ${e.message}", e)
      promise.reject("E_SIGNING_ERROR", "Unexpected error signing pairing code: ${e.message}", e)
    }
  }

  @ReactMethod
  override fun getDynamicClientRegistrationBody(fcmDeviceToken: String, deviceToken: String?, promise: Promise) {
    try {
      // Use empty string if deviceToken is not provided
      val actualDeviceToken = deviceToken ?: ""
      
      // Get or create the current key pair
      val currentKeyPair = keyPairSource.getCurrentBcscKeyPair()
      
      // Convert the public key to JWK format
      val publicKeyJWK = keyPairSource.convertBcscKeyPairToJWK(currentKeyPair)
      
      // Create device info JWT claims
      val deviceInfoClaims = JWTClaimsSet.Builder()
        .claim("system_name", "Android")
        .claim("system_version", Build.VERSION.RELEASE)
        .claim("device_model", Build.MODEL)
        .claim("device_id", UUID.randomUUID().toString())
        .claim("device_token", actualDeviceToken)
        .claim("fcm_device_token", fcmDeviceToken)
        .claim("app_version", getAppVersion())
        .claim("app_build", getAppBuildNumber())
        .claim("has_other_accounts", false)
        .issueTime(Date())
        .build()
      
      // Sign the device info JWT
      val deviceInfoJWT = keyPairSource.signAndSerializeClaimsSet(deviceInfoClaims)
      
      // Create the dynamic client registration body structure
      // This is a simplified structure - in a real implementation you might want a more sophisticated JSON builder
      val registrationBody = """
      {
        "client_name": "BC Services Card Mobile App",
        "redirect_uris": ["bcservicescard://auth"],
        "response_types": ["code"],
        "grant_types": ["authorization_code", "refresh_token"],
        "token_endpoint_auth_method": "private_key_jwt",
        "jwks": {
          "keys": [${publicKeyJWK.toJSONString()}]
        },
        "device_info": "$deviceInfoJWT",
        "application_type": "native"
      }
      """.trimIndent()
      
      Log.d(NAME, "getDynamicClientRegistrationBody: Successfully created DCR body")
      promise.resolve(registrationBody)
      
    } catch (e: BcscException) {
      Log.e(NAME, "getDynamicClientRegistrationBody: BCSC error: ${e.devMessage}", e)
      promise.reject("E_BCSC_DCR_ERROR", "Error creating dynamic client registration with bcsc-keypair-port: ${e.devMessage}", e)
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
    promise: Promise
  ) {
    // Validate all parameters are provided
    if (deviceCode.isEmpty() || clientId.isEmpty() || issuer.isEmpty() || confirmationCode.isEmpty()) {
      promise.reject("E_INVALID_PARAMETERS", 
        "All parameters (deviceCode, clientId, issuer, confirmationCode) are required and cannot be empty.")
      return
    }
    
    Log.d(NAME, "getDeviceCodeRequestBody called with clientId: $clientId, issuer: $issuer")
    
    // TODO: Implement proper JWT assertion signing
    // This should:
    // 1. Create and sign a JWT assertion using the provided clientId and issuer
    // 2. Format the OAuth device code request body with the provided deviceCode and confirmationCode
    // 3. Return the constructed request body
    
    val mockRequestBody = "grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=$deviceCode&client_id=$clientId&code=$confirmationCode"
    promise.resolve(mockRequestBody)
  }
  
  // MARK: - Account management methods
  /**
   * Helper method to get account data synchronously (without Promise)
   * This is used internally by getToken to get the account ID
   */
  private fun getAccountSync(): WritableMap? {
    Log.d(NAME, "getAccountSync called")
    
    try {
      val fileReader: FileReader = FileReaderFactory.createSimpleFileReader(reactApplicationContext)
      
      // Get the base storage directory
      val baseDir = fileReader.getStorageDirectory()
      Log.d(NAME, "getAccountSync - Base files directory: ${baseDir.absolutePath}")
      
      // The accounts file is at the root directory
      val relativePath = "accounts"
      val accountFilePath = "${baseDir.absolutePath}/$relativePath"
      Log.d(NAME, "getAccountSync - Full accounts file path: $accountFilePath")
      

      try {
        // Read the non-encrypted accounts file
        val accountFileBytes = fileReader.readFile(relativePath)
        
        if (accountFileBytes != null && accountFileBytes.isNotEmpty()) {
          // Convert bytes to string
          val accountFileContent = String(accountFileBytes, Charsets.UTF_8)
          Log.d(NAME, "getAccountSync - Successfully read accounts file from path: $accountFilePath")
          Log.d(NAME, "getAccountSync - Accounts file content size: ${accountFileContent.length} characters")
          
          // Try to parse as JSON array
          try {
            val jsonArray = org.json.JSONArray(accountFileContent)
            Log.d(NAME, "getAccountSync - Accounts file content appears to be valid JSON array with ${jsonArray.length()} accounts")
            
            if (jsonArray.length() > 0) {
              // Get the first account from the array
              val accountObj = jsonArray.getJSONObject(0)
              Log.d(NAME, "getAccountSync - Found account with UUID: ${accountObj.optString("uuid")}")
              
              // Parse the account data and create NativeAccount object
              val account = createNativeAccountFromJson(accountObj)
              Log.d(NAME, "getAccountSync - Returning parsed account data")
              return account
            } else {
              Log.d(NAME, "getAccountSync - Accounts file is empty array")
              return null
            }
            
          } catch (e: Exception) {
            Log.w(NAME, "getAccountSync - Accounts file content is not valid JSON array: ${e.message}")
          }
          
        } else {
          Log.d(NAME, "getAccountSync - Accounts file not found or empty at path: $accountFilePath")
        }
        
      } catch (e: Exception) {
        Log.e(NAME, "getAccountSync - Failed to read accounts file from path: $accountFilePath - ${e.message}", e)
      }
      
    } catch (e: Exception) {
      Log.e(NAME, "getAccountSync - Exception occurred while reading accounts file: ${e.message}", e)
    }
    
    // If we couldn't read the file or parse it, return null
    Log.d(NAME, "getAccountSync - Could not read or parse accounts file, returning null")
    return null
  }

  // Extension function to convert ByteArray to Base64 String
  private fun ByteArray.toBase64String(): String =
    android.util.Base64.encodeToString(this, android.util.Base64.NO_WRAP)

  /**
   * Gets the app version name from the package info
   */
  private fun getAppVersion(): String {
    return try {
      val packageInfo = reactApplicationContext.packageManager.getPackageInfo(
        reactApplicationContext.packageName, 0
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
      val packageInfo = reactApplicationContext.packageManager.getPackageInfo(
        reactApplicationContext.packageName, 0
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
}
