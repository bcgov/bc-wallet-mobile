package com.bcsccore

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray

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

  @ReactMethod
  override fun getKeyPair(keyAlias: String, promise: Promise) {
    val keyPair: WritableMap = Arguments.createMap()
    keyPair.putString("public", "mockPublicKeyFor_$keyAlias")
    keyPair.putString("private", "mockPrivateKeyFor_$keyAlias")
    promise.resolve(keyPair)
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
