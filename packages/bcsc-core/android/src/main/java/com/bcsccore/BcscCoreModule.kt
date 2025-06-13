package com.bcsccore

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
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
import android.util.Log;

@ReactModule(name = BcscCoreModule.NAME)
class BcscCoreModule(reactContext: ReactApplicationContext) :
  BcscCoreSpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "BcscCore"
  }

  @Throws(UnrecoverableEntryException::class, NoSuchAlgorithmException::class, KeyStoreException::class)
  private fun getSecretKey(kid: String): SecretKey {
    try {
      val keyStore = KeyStore.getInstance("AndroidKeyStore")
      keyStore.load(null)

      return keyStore.getKey(kid, null) as SecretKey
    } catch (e: Exception) {
      throw KeyStoreException("Failed to get secret key: ${e.message}")
    }
  }

  /**
   * Retrieves a keypair from the KeyStore based on a provided key ID
   * @param keyStore The KeyStore instance to retrieve the keys from
   * @param kid The key identifier / alias in the KeyStore
   * @return KeyPair containing the public and private keys
   */
  @Throws(UnrecoverableEntryException::class, NoSuchAlgorithmException::class, KeyStoreException::class)
  private fun retrieveKeyPairFromKeyStore(keyStore: KeyStore, kid: String): KeyPair {
    return if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.O_MR1) {
      // For older Android versions, get the PrivateKey directly
      val privateKey = keyStore.getKey(kid, null) as PrivateKey
      val publicKey = keyStore.getCertificate(kid).publicKey
      
      KeyPair(publicKey, privateKey)
    } else {
      // For newer Android versions, use PrivateKeyEntry
      val privateKeyEntry = keyStore.getEntry(kid, null) as KeyStore.PrivateKeyEntry
      
      KeyPair(
        privateKeyEntry.certificate.publicKey,
        privateKeyEntry.privateKey
      )
    }
  }

  // Extension function to convert ByteArray to Base64 String
  private fun ByteArray.toBase64String(): String {
    return android.util.Base64.encodeToString(this, android.util.Base64.NO_WRAP)
  }

  @ReactMethod
  override fun getKeyPair(keyAlias: String, promise: Promise) {
    try {
      val keyStore = KeyStore.getInstance("AndroidKeyStore")
      keyStore.load(null)
      
      if (!keyStore.containsAlias(keyAlias)) {
        promise.reject("E_KEY_NOT_FOUND", "Key pair with alias '$keyAlias' not found.")
        return
      }
      
      val pair = retrieveKeyPairFromKeyStore(keyStore, keyAlias)
      
      // Convert keys to base64 strings for JS
      val keyPair: WritableMap = Arguments.createMap()
      
      // For public key (typically available)
      pair.public.encoded?.let { publicEncoded ->
        keyPair.putString("public", publicEncoded.toBase64String())
      }
      
      // For private key, check if available, but don't fail if we can't extract it
      if (pair.private != null) {
        // Mark that the private key exists even if its material isn't extractable
        keyPair.putString("privateKeyAvailable", "true")
        
        // Try to get encoded form if available (might be null in secure hardware)
        pair.private.encoded?.let { privateEncoded ->
          keyPair.putString("private", privateEncoded.toBase64String())
        }
      } else {
        keyPair.putString("privateKeyAvailable", "false")
      }
      
      // Include key alias for reference
      keyPair.putString("id", keyAlias)
      
      promise.resolve(keyPair)
    } catch (e: Exception) {
      promise.reject("E_KEY_ERROR", "Error retrieving key pair: ${e.message}", e)
    }
  }
  
  @ReactMethod
  override fun getAllKeys(promise: Promise) {
    try {
      val keyStore = KeyStore.getInstance("AndroidKeyStore")
      keyStore.load(null)
      
      val privateKeys: WritableArray = Arguments.createArray()
      val aliases = keyStore.aliases()
      
      while (aliases.hasMoreElements()) {
        val alias = aliases.nextElement()
        val keyInfo: WritableMap = Arguments.createMap()
        
        // The key identifier is the only guaranteed property
        keyInfo.putString("id", alias)
        
        try {
          // Try to get additional information if available
          // Note: Some of this information might not be accessible in Android KeyStore
          // depending on API version and security constraints
          if (keyStore.isKeyEntry(alias)) {
            val cert = keyStore.getCertificate(alias)
            if (cert != null) {
              val publicKey = cert.publicKey
              
              // Get key type if available
              val algorithm = publicKey.algorithm
              if (algorithm != null) {
                keyInfo.putString("keyType", algorithm)
              }
              
              // For key size, we can estimate from the encoded length for some key types
              // This is a rough estimate and might not be accurate for all key types
              if (algorithm == "RSA" || algorithm == "EC") {
                val keySize = when (algorithm) {
                  "RSA" -> publicKey.encoded.size * 8 / 9 // Approximate for RSA
                  "EC" -> when (publicKey.encoded.size) {
                    in 91..100 -> 256
                    in 120..130 -> 384
                    in 158..168 -> 521
                    else -> null
                  }
                  else -> null
                }
                if (keySize != null) {
                  keyInfo.putInt("keySize", keySize)
                }
              }
              
              // Get creation time if possible
              // Note: Android KeyStore doesn't provide direct access to creation time
              // We're using certificate's not before date as an approximation
              if (cert is java.security.cert.X509Certificate) {
                keyInfo.putDouble("created", cert.notBefore.time.toDouble())
              }
            }
          }
        } catch (e: Exception) {
          // If we can't get additional info, just continue with the alias only
          // We don't want to fail the whole operation if one key's details can't be fetched
        }
        
        privateKeys.pushMap(keyInfo)
      }
      
      promise.resolve(privateKeys)
    } catch (e: Exception) {
      promise.reject("E_KEYSTORE_ERROR", "Error accessing keystore: ${e.message}", e)
    }
  }

  @ReactMethod
  override fun getToken(tokenType: Int, promise: Promise) {
    // Mock implementation - returns null for now
    // In a real implementation, this would retrieve the token from secure storage
    Log.d(NAME, "getToken called with tokenType: $tokenType")
    promise.resolve("getToken-mock-return-value")
  }

  @ReactMethod
  override fun getAccount(promise: Promise) {
    // Mock implementation - returns null for now
    // In a real implementation, this would retrieve account data from storage
    Log.d(NAME, "getAccount called")
    promise.resolve(null)
  }

  @ReactMethod
  override fun getRefreshTokenRequestBody(promise: Promise) {
    // Mock implementation - returns null for now
    // In a real implementation, this would:
    // 1. Load account and client registration from storage
    // 2. Create and sign a JWT assertion
    // 3. Retrieve the refresh token
    // 4. Format the OAuth request body
    Log.d(NAME, "getRefreshTokenRequestBody called")
    promise.resolve("getRefreshTokenRequestBody-mock-return-value")
  }

  @ReactMethod
  override fun signPairingCode(code: String, promise: Promise) {
    // Mock implementation - returns null for now
    // In a real implementation, this would:
    // 1. Load account and device info from storage
    // 2. Create JWT claims with device information
    // 3. Sign the JWT with the latest private key
    // 4. Return the signed JWT string
    Log.d(NAME, "signPairingCode called with code: $code")
    promise.resolve("signPairingCode-mock-return-value")
  }

  @ReactMethod
  override fun getDynamicClientRegistrationBody(fcmDeviceToken: String, deviceToken: String?, promise: Promise) {
    // Mock implementation - returns null for now
    // In a real implementation, this would:
    // 1. Generate or retrieve latest key pair
    // 2. Extract RSA components (modulus, exponent)
    // 3. Create device info JWT with device information
    // 4. Build JWKS with public key
    // 5. Return structured JSON for client registration
    Log.d(NAME, "getDynamicClientRegistrationBody called with fcmDeviceToken: $fcmDeviceToken, deviceToken: $deviceToken")
    promise.resolve("getDynamicClientRegistrationBody-mock-return-value")
  }
}
