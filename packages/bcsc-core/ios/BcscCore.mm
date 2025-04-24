#import "BcscCore.h"

@implementation BcscCore
RCT_EXPORT_MODULE()

// - (NSNumber *)multiply:(double)a b:(double)b {
//     NSNumber *result = @(a * b);

//     return result;
// }

// sync
- (NSNumber *)multiply:(double)a b:(double)b
{
    NSNumber *result = @(a * b);

    return result;
}

// async
RCT_EXPORT_METHOD(multiply2:(double)a
                  b:(double)b
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSNumber *result = @(a * b);

    resolve(result);
}

// Don't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeAttestationSpecJSI>(params);
}
#endif

@end
