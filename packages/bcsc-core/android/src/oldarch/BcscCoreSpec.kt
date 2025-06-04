package com.bcsccore

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Promise

abstract class BcscCoreSpec internal constructor(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  abstract fun getKeyPair(keyAlias: String, promise: Promise)
  abstract fun getAllKeys(promise: Promise)
  abstract fun getToken(tokenType: Int, promise: Promise)
  abstract fun getAccount(promise: Promise)
  abstract fun getRefreshTokenRequestBody(promise: Promise)
  abstract fun signPairingCode(code: String, promise: Promise)
}
