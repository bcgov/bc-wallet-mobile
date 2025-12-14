#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (BcscCore, NSObject)

RCT_EXTERN_METHOD(getAllKeys : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getKeyPair : (NSString *)label resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getToken : (nonnull NSNumber *)tokenTypeNumber resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setToken : (nonnull NSNumber *)tokenTypeNumber tokenString : (NSString *)tokenString expiry : (NSNumber *_Nullable)
                      expiry resolve : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteToken : (nonnull NSNumber *)tokenTypeNumber resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setAccount : (NSDictionary *)account resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getAccount : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getDeviceId : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeAccount : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getRefreshTokenRequestBody : (NSString *)issuer clientID : (NSString *)clientID refreshToken : (
    NSString *)refreshToken resolve : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(signPairingCode : (NSString *)code issuer : (NSString *)issuer clientID : (NSString *)
                      clientID fcmDeviceToken : (NSString *)fcmDeviceToken deviceToken : (NSString *_Nullable)
                          deviceToken resolve : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getDynamicClientRegistrationBody : (NSString *)fcmDeviceToken deviceToken : (NSString *_Nullable)
                      deviceToken attestation : (NSString *_Nullable)attestation resolve : (RCTPromiseResolveBlock)
                          resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getDeviceCodeRequestBody : (NSString *)deviceCode clientID : (NSString *)clientID issuer : (
    NSString *)issuer confirmationCode : (NSString *)confirmationCode resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(decodePayload : (NSString *)jweString resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(createPreVerificationJWT : (NSString *)deviceCode clientID : (NSString *)
                      clientID resolve : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hashBase64 : (NSString *)base64 resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(createQuickLoginJWT : (NSString *)accessToken clientId : (NSString *)clientId issuer : (
    NSString *)issuer clientRefId : (NSString *)clientRefId key : (NSDictionary *)key fcmDeviceToken : (NSString *)
                      fcmDeviceToken deviceToken : (NSString *_Nullable)deviceToken resolve : (RCTPromiseResolveBlock)
                          resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(createSignedJWT : (NSDictionary *)claims resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

// PIN Authentication Methods
RCT_EXTERN_METHOD(setPIN : (NSString *)accountID pin : (NSString *)pin resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(verifyPIN : (NSString *)accountID pin : (NSString *)pin resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deletePIN : (NSString *)accountID resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasPINSet : (NSString *)accountID resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

// Device Authentication Methods
RCT_EXTERN_METHOD(performDeviceAuthentication : (NSString *_Nullable)reason resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(canPerformDeviceAuthentication : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)
                      reject)

RCT_EXTERN_METHOD(getAvailableBiometricType : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(canPerformBiometricAuthentication : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)
                      reject)

// Account Security Methods
RCT_EXTERN_METHOD(setAccountSecurityMethod : (NSString *)accountID securityMethod : (NSString *)
                      securityMethod resolve : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getAccountSecurityMethod : (NSString *)accountID resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isAccountLocked : (NSString *)accountID resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getBestAvailableAccountSecurityMethod : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

// Device Security Methods
RCT_EXTERN_METHOD(setupDeviceSecurity : (NSString *)accountID resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(unlockWithDeviceSecurity : (NSString *)accountID reason : (NSString *_Nullable)
                      reason resolve : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isPINAutoGenerated : (NSString *)accountID resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

// Authorization Request Storage Methods
RCT_EXTERN_METHOD(getAuthorizationRequest : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setAuthorizationRequest : (NSDictionary *)data resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteAuthorizationRequest : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

// Account Flags Storage Methods
RCT_EXTERN_METHOD(getAccountFlags : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setAccountFlags : (NSDictionary *)flags resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteAccountFlags : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)

@end
