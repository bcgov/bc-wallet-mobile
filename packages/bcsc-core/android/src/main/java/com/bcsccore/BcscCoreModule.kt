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

@ReactModule(name = BcscCoreModule.NAME)
class BcscCoreModule(reactContext: ReactApplicationContext) :
  BcscCoreSpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "BcscCore"
  }

  // Example method
  // See https://reactnative.dev/docs/native-modules-android
  override fun multiply(a: Double, b: Double): Double {
    return a * b
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
      val privateKey = keyStore.getKey(kid, null) as PrivateKey
      val publicKey = keyStore.getCertificate(kid).publicKey
      KeyPair(publicKey, privateKey)
    } else {
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
      
      // This is a simplified example - in a real implementation you would properly
      // encode the public and private keys
      keyPair.putString("public", pair.public.encoded.toBase64String())
      keyPair.putString("private", pair.private.encoded.toBase64String())
      
      promise.resolve(keyPair)
    } catch (e: Exception) {
      promise.reject("E_KEY_ERROR", "Error retrieving key pair: ${e.message}", e)
    }
  }
  
  @ReactMethod
  override fun findAllPrivateKeys(promise: Promise) {
    val privateKeys: WritableArray = Arguments.createArray()

    val keyInfo1: WritableMap = Arguments.createMap()
    keyInfo1.putString("keyType", "RSA")
    keyInfo1.putInt("keySize", 2048)
    keyInfo1.putString("tag", "mockTag1")
    keyInfo1.putDouble("created", System.currentTimeMillis().toDouble())
    privateKeys.pushMap(keyInfo1)

    val keyInfo2: WritableMap = Arguments.createMap()
    keyInfo2.putString("keyType", "EC")
    keyInfo2.putInt("keySize", 256)
    keyInfo2.putString("tag", "mockTag2")
    keyInfo2.putDouble("created", (System.currentTimeMillis() - 86400000).toDouble()) // Yesterday
    privateKeys.pushMap(keyInfo2)

    promise.resolve(privateKeys)
  }
}
