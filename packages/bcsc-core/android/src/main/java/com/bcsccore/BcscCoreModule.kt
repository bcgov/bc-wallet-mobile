package com.bcsccore

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.ReadableMap
import android.os.Build
import android.security.keystore.KeyProperties
import java.security.KeyPair
import java.security.KeyStore
import java.security.KeyStoreException
import java.security.NoSuchAlgorithmException
import java.security.PrivateKey
import java.security.PublicKey
import java.security.UnrecoverableEntryException
import java.security.cert.Certificate
import javax.crypto.SecretKey
import java.util.Base64
import android.util.Log

// Bcsc KeyPair package imports
import com.bcsccore.keypair.core.interfaces.BcscKeyPairSource
import com.bcsccore.keypair.core.interfaces.KeyPairInfoSource
import com.bcsccore.keypair.core.models.BcscKeyPair
import com.bcsccore.keypair.core.models.KeyPairInfo
import com.bcsccore.keypair.core.exceptions.BcscException
import com.bcsccore.keypair.repos.key.BcscKeyPairRepo
import com.bcsccore.keypair.repos.keypairinfo.SimpleKeyPairInfoSource
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jose.jwk.JWK
import java.util.Date
import java.util.UUID

// Bcsc File Port imports
import com.bcsccore.fileport.FileReader
import com.bcsccore.fileport.FileReaderFactory

@ReactModule(name = BcscCoreModule.NAME)
class BcscCoreModule(reactContext: ReactApplicationContext) :
  BcscCoreSpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "BcscCore"
  }

  // Initialize the BC Services Card KeyPair functionality
  private val keyPairSource: BcscKeyPairSource by lazy {
    val keyPairInfoSource = SimpleKeyPairInfoSource(reactApplicationContext)
    BcscKeyPairRepo(keyPairInfoSource)
  }

  // Extension function to convert ByteArray to Base64 String
  private fun ByteArray.toBase64String(): String {
    return android.util.Base64.encodeToString(this, android.util.Base64.NO_WRAP)
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
    // Partial implementation - attempts to read the "token" file using bcsc-file-port
    // but always returns the mock value regardless of success or failure
    Log.d(NAME, "getToken called with tokenType: $tokenType")
    
    // Attempt to read the token file using bcsc-file-port from the specific path
    try {
      val fileReader: FileReader = FileReaderFactory.createSimpleFileReader(reactApplicationContext)
      
      // Get and log the base storage directory
      val baseDir = fileReader.getStorageDirectory()
      Log.d(NAME, "Base files directory: ${baseDir.absolutePath}")
      
      // List all available files for debugging
      val availableFiles = fileReader.listFiles()
      Log.d(NAME, "Available files in base directory (${availableFiles.size} files): ${availableFiles.joinToString(", ")}")
      
      val relativePath = "sit/5c790f9f-99b2-4de8-b150-127552a206ad/tokens"
      val tokenFilePath = "${baseDir.absolutePath}/$relativePath"
      Log.d(NAME, "Full token file path: $tokenFilePath")
      val tokenData: ByteArray? = fileReader.readFile(relativePath)
      
      if (tokenData != null) {
        Log.d(NAME, "Successfully read token file using bcsc-file-port from path: $tokenFilePath. File size: ${tokenData.size} bytes")
        // Note: In a full implementation, this would parse and return the actual token data
      } else {
        Log.d(NAME, "Failed to read token file using bcsc-file-port from path: $tokenFilePath - file not found or empty")
        // Check if the file exists at all
        val fileExists = fileReader.fileExists(relativePath)
        Log.d(NAME, "File exists check for $tokenFilePath: $fileExists")
      }
    } catch (e: Exception) {
      Log.e(NAME, "Exception occurred while reading token file using bcsc-file-port from path: files/sit/5c790f9f-99b2-4de8-b150-127552a206ad/tokens - ${e.message}", e)
    }
    
    // Always return the mock token object regardless of file read success/failure
    val mockToken: WritableMap = Arguments.createMap()
    mockToken.putString("id", "mock-token-id-${System.currentTimeMillis()}")
    mockToken.putInt("type", tokenType)
    mockToken.putString("token", "mock-token-value-for-type-$tokenType")
    mockToken.putDouble("created", (System.currentTimeMillis() / 1000).toDouble()) // Unix timestamp in seconds
    mockToken.putDouble("expiry", ((System.currentTimeMillis() / 1000) + 3600).toDouble()) // Expires in 1 hour
    
    promise.resolve(mockToken)
  }

  @ReactMethod
  override fun setAccount(account: ReadableMap, promise: Promise) {
    // Mock implementation - returns success for now
    // In a real implementation, this would:
    // 1. Validate the account data structure
    // 2. Store the account data securely
    // 3. Handle any necessary encryption/serialization
    Log.d(NAME, "setAccount called with account data")
    promise.resolve(null)
  }

  @ReactMethod
  override fun getAccount(promise: Promise) {
    // Mock implementation - returns a mock NativeAccount object
    // In a real implementation, this would retrieve account data from storage
    Log.d(NAME, "getAccount called")
    
    // Create a mock NativeAccount object that matches the TypeScript interface
    val mockAccount: WritableMap = Arguments.createMap()
    mockAccount.putString("id", "mock-account-id-${System.currentTimeMillis()}")
    mockAccount.putString("issuer", "https://mock-issuer.example.com")
    mockAccount.putString("clientID", "mock-client-id-12345")
    mockAccount.putString("securityMethod", "device_authentication") // AccountSecurityMethod.DeviceAuth
    mockAccount.putString("displayName", "Mock Test Account")
    mockAccount.putBoolean("didPostNicknameToServer", false)
    mockAccount.putString("nickname", "MockUser")
    mockAccount.putInt("failedAttemptCount", 0)
    
    promise.resolve(mockAccount)
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
      val jwtExpirationSeconds = 3600 // 1 hour
      val now = Date()
      val expiration = Date(now.time + jwtExpirationSeconds * 1000)
      
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
        .claim("app_version", "1.0.0") // This could be made dynamic
        .claim("app_build", "1") // This could be made dynamic
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
        .claim("app_version", "1.0.0") // This could be made dynamic
        .claim("app_build", "1") // This could be made dynamic
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
  override fun getDeviceCodeRequestBody(deviceCode: String, clientId: String, issuer: String, confirmationCode: String, promise: Promise) {
    // Validate all parameters are provided
    if (deviceCode.isEmpty() || clientId.isEmpty() || issuer.isEmpty() || confirmationCode.isEmpty()) {
      promise.reject("E_INVALID_PARAMETERS", "All parameters (deviceCode, clientId, issuer, confirmationCode) are required and cannot be empty.")
      return
    }
    
    // Mock implementation - returns a device code request body
    // In a real implementation, this would:
    // 1. Create and sign a JWT assertion using the provided clientId and issuer
    // 2. Format the OAuth device code request body with the provided deviceCode and confirmationCode
    // 3. Return the constructed request body
    Log.d(NAME, "getDeviceCodeRequestBody called with deviceCode: [REDACTED], clientId: $clientId, issuer: $issuer, confirmationCode: [REDACTED]")
    
    val mockRequestBody = "grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=$deviceCode&client_id=$clientId&code=$confirmationCode"
    promise.resolve(mockRequestBody)
  }
}
