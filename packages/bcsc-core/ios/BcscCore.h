#ifdef RCT_NEW_ARCH_ENABLED
#import "RNBcscCoreSpec.h"

@interface BcscCore : NSObject <NativeBcscCoreSpec>
#else
#import <React/RCTBridgeModule.h>

@interface BcscCore : NSObject <RCTBridgeModule>
#endif

@end
