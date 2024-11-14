#import "AppDelegate.h"

#import <Firebase.h>
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>
#import "Orientation.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];
  self.moduleName = @"BCWallet";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // Because certain file operations can reset resource values, we
  // excluded file’s resource values each time the application starts.
  [self excludeDotAFJFolderFromBackup];
  
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
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

// The .afj folder from Credo cannot be restored.
- (void)excludeDotAFJFolderFromBackup {
    NSString *folderName = @".afj";
    NSURL *documentsURL = [[[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory
                                                                  inDomains:NSUserDomainMask] firstObject];
    NSURL *folderURL = [documentsURL URLByAppendingPathComponent:folderName];

    // Check if the directory exists
    BOOL isDir;
    BOOL fileExists = [[NSFileManager defaultManager] fileExistsAtPath:[folderURL path]
                                                           isDirectory:&isDir];
    if (!fileExists || !isDir) {
      NSLog(@"Directory %@ does not exist. Skipping backup exclusion.", folderName);
      return;
    }

    // Exclude the folder from backup
    NSError *error = nil;
    BOOL success = [folderURL setResourceValue:@YES 
                                        forKey:NSURLIsExcludedFromBackupKey 
                                         error:&error];

    if (!success) {
        NSLog(@"Error excluding folder %@ from backup: %@", folderName, error);
    }
  
    NSLog(@"Excluded folder %@ from backup.", folderName);
}

@end
