#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BcscCore, NSObject)

RCT_EXTERN_METHOD(findAllPrivateKeys:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getKeyPair:(NSString *)label
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end