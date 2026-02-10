//
//  AppDelegate.swift
//  AriesBifold
//
//  Created by James Ebert on 3/12/21.
//  Copyright © 2021 Facebook. All rights reserved.
//

import Firebase
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Configure WebRTC for background camera access
    WebRTCModuleOptions.sharedInstance().enableMultitaskingCameraAccess = true

    // Configure Firebase
    FirebaseApp.configure()

    // Set notification delegate to allow foreground notifications
    UNUserNotificationCenter.current().delegate = self

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "BCWallet",
      in: window,
      launchOptions: launchOptions
    )

    // Exclude .afj folder from backup
    excludeDotAFJFolderFromBackup()

    return true
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  func applicationDidBecomeActive(_: UIApplication) {
    UIApplication.shared.applicationIconBadgeNumber = 0
  }

  func application(
    _: UIApplication,
    supportedInterfaceOrientationsFor _: UIWindow?
  ) -> UIInterfaceOrientationMask {
    return Orientation.getOrientation()
  }

  /// The .afj folder from Credo cannot be restored.
  private func excludeDotAFJFolderFromBackup() {
    let folderName = ".afj"
    guard let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
      NSLog("Could not get documents directory")
      return
    }

    let folderURL = documentsURL.appendingPathComponent(folderName)

    // Check if the directory exists
    var isDir: ObjCBool = false
    let fileExists = FileManager.default.fileExists(atPath: folderURL.path, isDirectory: &isDir)

    if !fileExists || !isDir.boolValue {
      NSLog("Directory %@ does not exist. Skipping backup exclusion.", folderName)
      return
    }

    // Exclude the folder from backup
    do {
      var resourceValues = URLResourceValues()
      resourceValues.isExcludedFromBackup = true
      var mutableURL = folderURL
      try mutableURL.setResourceValues(resourceValues)
      NSLog("Excluded folder %@ from backup.", folderName)
    } catch {
      NSLog("Error excluding folder %@ from backup: %@", folderName, error.localizedDescription)
    }
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for _: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
