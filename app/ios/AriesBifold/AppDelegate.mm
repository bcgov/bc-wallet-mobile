#import "AppDelegate.h"

#import <WebRTCModuleOptions.h>
#import <Firebase.h>
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>
#import <UserNotifications/UserNotifications.h>
#import "Orientation.h"

@interface AppDelegate () <UNUserNotificationCenterDelegate>
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // allows background WebRTC
  [WebRTCModuleOptions sharedInstance].enableMultitaskingCameraAccess = YES;

  [FIRApp configure];
  
  // Set notification delegate to allow foreground notifications
  [UNUserNotificationCenter currentNotificationCenter].delegate = self;
  
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
  return [self getBundleURL];
}

- (NSURL *)getBundleURL
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

    if (success) {
      NSLog(@"Excluded folder %@ from backup.", folderName);
    } else {
      NSLog(@"Error excluding folder %@ from backup: %@", folderName, error);
    }
}

// Allow notifications to be displayed when app is in foreground
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
{
  completionHandler(UNNotificationPresentationOptionBanner | UNNotificationPresentationOptionSound | UNNotificationPresentationOptionBadge);
}

@end
