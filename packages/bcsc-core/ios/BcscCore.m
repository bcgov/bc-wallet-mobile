#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BcscCore, NSObject)

RCT_EXTERN_METHOD(getAllKeys:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getKeyPair:(NSString *)label
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getToken:(nonnull NSNumber *)tokenTypeNumber
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setAccount:(NSDictionary *)account
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getAccount:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getRefreshTokenRequestBody:(NSString *)issuer
                  clientID:(NSString *)clientID
                  refreshToken:(NSString *)refreshToken
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(signPairingCode:(NSString *)code
                  issuer:(NSString *)issuer
                  clientID:(NSString *)clientID
                  fcmDeviceToken:(NSString *)fcmDeviceToken
                  deviceToken:(NSString * _Nullable)deviceToken
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getDynamicClientRegistrationBody:(NSString *)fcmDeviceToken
                  deviceToken:(NSString *)deviceToken
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getDeviceCodeRequestBody:(NSString *)deviceCode
                  clientID:(NSString *)clientID
                  issuer:(NSString *)issuer
                  confirmationCode:(NSString *)confirmationCode
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(decodePayload:(NSString *)jweString
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(createEvidenceRequestJWT:(NSString *)deviceCode
                  clientID:(NSString *)clientID
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hashBase64:(NSString *)base64
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
@end
