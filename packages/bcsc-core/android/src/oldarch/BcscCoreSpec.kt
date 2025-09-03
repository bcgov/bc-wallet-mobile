package com.bcsccore

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Promise

abstract class BcscCoreSpec internal constructor(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  abstract fun getKeyPair(keyAlias: String, promise: Promise)
  abstract fun getAllKeys(promise: Promise)
  abstract fun getToken(tokenType: Int, promise: Promise)
  abstract fun setAccount(account: com.facebook.react.bridge.ReadableMap, promise: Promise)
  abstract fun getAccount(promise: Promise)
  abstract fun getRefreshTokenRequestBody(issuer: String, clientID: String, refreshToken: String, promise: Promise)
  abstract fun signPairingCode(code: String, issuer: String, clientID: String, fcmDeviceToken: String, deviceToken: String?, promise: Promise)
  abstract fun getDynamicClientRegistrationBody(fcmDeviceToken: String, deviceToken: String?, promise: Promise)
  abstract fun getDeviceCodeRequestBody(deviceCode: String, clientId: String, issuer: String, confirmationCode: String, promise: Promise)
  abstract fun createQuickLoginJWT(accessToken: String, clientId: String, issuer: String, clientRefId: String, key: com.facebook.react.bridge.ReadableMap?, fcmDeviceToken: String, deviceToken: String?, promise: Promise)
  abstract fun createSignedJWT(claims: com.facebook.react.bridge.ReadableMap, promise: Promise)
  abstract fun createEvidenceRequestJWT(deviceCode: String, clientID: String, promise: Promise)
  abstract fun hashBase64(base64: String, promise: Promise)
  abstract fun decodePayload(jweString: String, promise: Promise)
  abstract fun removeAccount(promise: Promise)
}
