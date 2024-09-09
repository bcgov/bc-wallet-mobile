#import "AppDelegate.h"
#import "RNSplashScreen.h"
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>
#import "Orientation.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge moduleName:@"PortefeuilleQc" initialProperties:nil];

  if (@available(iOS 13.0, *)) {
      rootView.backgroundColor = [UIColor systemBackgroundColor];	
  } else {	
      rootView.backgroundColor = [UIColor whiteColor];	
  }	

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];	
  UIViewController *rootViewController = [UIViewController new];	
  rootViewController.view = rootView;	
  self.window.rootViewController = rootViewController;	
  [self.window makeKeyAndVisible];

  [RNSplashScreen show];
  return YES;	
}


- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (void)applicationDidBecomeActive:(UIApplication *)application {
  [UIApplication sharedApplication].applicationIconBadgeNumber = 0;
}

- (UIInterfaceOrientationMask)application:(UIApplication *)application supportedInterfaceOrientationsForWindow:(UIWindow *)window {
  return [Orientation getOrientation];
}

@end
