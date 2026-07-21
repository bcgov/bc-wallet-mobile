//
//  TokenService.swift
//  bc-services-card
//
//  Created by marcosc on 2017-12-30.
//  Copyright © 2017 Province of British Columbia. All rights reserved.
//

import Foundation
import UIKit

protocol TokenStorageServiceProtocol {
  func save(token: Token, attrAccessible: CFString) -> Bool
  func get(id: String, diagnostic: inout String?) -> Token?
  func delete(id: String) -> Bool
}

class KeychainTokenStorageService: TokenStorageServiceProtocol {
  private let logger = AppLogger(
    subsystem: Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard",
    category: "TokenService"
  )

  /// A helper function to convert OSStatus to a human-readable string, e.g. "-25300 (The specified item could not be
  /// found in the keychain.)"
  private func describe(_ status: OSStatus) -> String {
    let message = SecCopyErrorMessageString(status, nil) as String? ?? "no message available"
    return "\(status) (\(message))"
  }

  /// A helper function that waits for protected data (key chain data) to become available OR
  /// a timeout to occur.
  /// used in conjunction with a retry for "item not available" errors when keychain is being accessed during app startup
  private func waitForProtectedDataAvailable(timeout: TimeInterval) {
    guard !UIApplication.shared.isProtectedDataAvailable else { return }
    let semaphore = DispatchSemaphore(value: 0)
    // Start on a background queue to avoid blocking .main thread
    let observerQueue = OperationQueue()
    let observer = NotificationCenter.default.addObserver(
      forName: UIApplication.protectedDataDidBecomeAvailableNotification,
      object: nil, queue: observerQueue
    ) { _ in semaphore.signal() }
    _ = semaphore.wait(timeout: .now() + timeout)
    NotificationCenter.default.removeObserver(observer)
  }

  /// Returns the module name for NSKeyedArchiver class mapping
  /// This must match the module name used by the native ias-ios app
  private var nativeModuleName: String {
    let bundleID = Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard"
    switch bundleID {
    case "ca.bc.gov.id.servicescard":
      return "bc_services_card"
    case "ca.bc.gov.iddev.servicescard":
      return "bc_services_card_dev"
    default:
      return "bc_services_card_dev"
    }
  }

  /**
    Save the given token to the Keychain.

    - Parameter token: The Token to save

    - Returns: true if the token was saved, false otherwise
   */
  func save(token: Token, attrAccessible: CFString = kSecAttrAccessibleWhenUnlockedThisDeviceOnly) -> Bool {
    logger.log("save: id=\(token.id) type=\(token.type)")

    // Set the class name to match native ias-ios for compatibility
    NSKeyedArchiver.setClassName("\(nativeModuleName).Token", for: Token.self)

    let data = NSKeyedArchiver.archivedData(withRootObject: token)
    let attributes: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrApplicationTag: token.id.data(using: .utf8)!,
      kSecAttrIsPermanent: kCFBooleanTrue,
      kSecAttrAccessible: attrAccessible,
      kSecValueData: data,
    ]
    var status = errSecSuccess
    var existsDiagnostic: String?
    if get(id: token.id, diagnostic: &existsDiagnostic) != nil {
      // log.debug("token already exists so call update")

      let query: NSDictionary = [
        kSecClass: kSecClassKey,
        kSecAttrApplicationTag: token.id.data(using: .utf8)!,
      ]

      let updateAttributes: NSDictionary = [kSecValueData: data]
      status = SecItemUpdate(query, updateAttributes)
    } else {
      status = SecItemAdd(attributes, nil)
    }
    if status != errSecSuccess {
      // log.error("save: failed id=\(token.id) type=\(token.type) status=\(describe(status)) isProtectedDataAvailable=\(UIApplication.shared.isProtectedDataAvailable)")
      return false
    }
    return true
  }

  /**
   Find and return the Token identified by the given id if it exists.

   - Parameter id: The token identifier
   - Parameter diagnostic: set to a human-readable OSStatus description whenever the
     read doesn't cleanly succeed (not-found included)

   - Returns: the token instance if found, nil otherwise
   */
  func get(id: String, diagnostic: inout String?) -> Token? {
    // Migrate before fetching
    migrateLegacyItem(id)

    // Register both production and dev module names for compatibility with native ias-ios
    NSKeyedUnarchiver.setClass(Token.self, forClassName: "bc_services_card.Token")
    NSKeyedUnarchiver.setClass(Token.self, forClassName: "bc_services_card_dev.Token")

    // Migrate V3 key format ({clientID}/{type}/1) to V4 format ({clientID}/tokens/{type}/1)
    migrateV3TokenIfNeeded(newId: id)

    let query: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrApplicationTag: id.data(using: .utf8)!,
      kSecMatchLimit: kSecMatchLimitOne,
      kSecReturnData: kCFBooleanTrue,
    ]
    var result: CFTypeRef?
    var status = SecItemCopyMatching(query, &result)

    // errSecInteractionNotAllowed means the item exists but the keychain
    // isn't accessible right now (e.g. device OS is still unlocking keychain access).
    // Add a wait and retry once to avoid returning nil when an item is present.
    if status == errSecInteractionNotAllowed {
      logger.warning("get: keychain locked (interaction not allowed) id=\(id) — waiting for unlock, then retrying once")
      waitForProtectedDataAvailable(timeout: 1.0)
      status = SecItemCopyMatching(query, &result)
      logger.log("get: retry after unlock wait id=\(id) status=\(describe(status))")
    }

    if status != errSecSuccess {
      let description = describe(status)
      diagnostic = description
      logger.error(
        "get: SecItemCopyMatching failed id=\(id) status=\(description) isProtectedDataAvailable=\(UIApplication.shared.isProtectedDataAvailable)"
      )
    }
    guard result != nil,
          let data = result as? Data,
          let token = NSKeyedUnarchiver.unarchiveObject(with: data) as? Token
    else {
      if status == errSecSuccess {
        diagnostic = "SecItemCopyMatching succeeded but returned no usable data"
        logger.error("get: SecItemCopyMatching succeeded but returned no usable data")
      }
      return nil
    }

    return token
  }

  /**
   Find and delete the Token identified by the given id if it exists.

   - Parameter id: The token identifier

   - Returns: the token instance if found, nil otherwise
   */
  func delete(id: String) -> Bool {
    var diagnostic: String?
    guard let token = get(id: id, diagnostic: &diagnostic) else {
      logger.warning("delete: no existing token found for id")
      return false
    }
    let data = NSKeyedArchiver.archivedData(withRootObject: token)
    let query: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrApplicationTag: id.data(using: .utf8)!,
      kSecValueData: data,
    ]

    var result: CFTypeRef?
    let status = SecItemDelete(query)
    if status != errSecSuccess {
      logger.error("delete: failed status=\(describe(status))")
      return false
    }

    return true
  }
}

// MARK: - Private methods

extension KeychainTokenStorageService {
  #warning("TODO: remove when all items have been migrated")
  /// Migrate item with kSecAttrAccessible to kSecAttrAccessibleWhenUnlockedThisDeviceOnly
  private func migrateLegacyItem(_ id: String) {
    let query: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrApplicationTag: id.data(using: .utf8)!,
    ]

    let updateAttributes: NSDictionary = [
      kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]

    let status = SecItemUpdate(query, updateAttributes)
    if status != errSecSuccess, status != errSecItemNotFound {
      logger.error("migrateLegacyItem: SecItemUpdate failed status=\(describe(status))")
    }
  }

  /// Migrates a token stored at the V3 keychain key format ({clientID}/{type}/1)
  /// to the V4 format ({clientID}/tokens/{type}/1), then deletes the old entry.
  /// Must be called after NSKeyedUnarchiver class name registrations in get(id:).
  private func migrateV3TokenIfNeeded(newId: String) {
    // Derive V3 key by stripping the "/tokens" path segment
    // V4 format: "{clientID}/tokens/{type}/1"
    // V3 format: "{clientID}/{type}/1"
    guard let range = newId.range(of: "/tokens/") else { return }
    let v3Id = newId.replacingCharacters(in: range, with: "/")

    // Read token data at V3 key
    let readQuery: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrApplicationTag: v3Id.data(using: .utf8)!,
      kSecMatchLimit: kSecMatchLimitOne,
      kSecReturnData: kCFBooleanTrue,
    ]
    var result: CFTypeRef?
    let readStatus = SecItemCopyMatching(readQuery, &result)
    guard readStatus == errSecSuccess,
          let data = result as? Data,
          let v3Token = NSKeyedUnarchiver.unarchiveObject(with: data) as? Token
    else {
      if readStatus != errSecSuccess, readStatus != errSecItemNotFound {
        logger.error(
          "migrateV3TokenIfNeeded: SecItemCopyMatching failed v3Id=\(v3Id) status=\(describe(readStatus)) isProtectedDataAvailable=\(UIApplication.shared.isProtectedDataAvailable)"
        )
      }
      return
    }

    // Re-archive with the new V4 id and write directly to avoid recursive save() → get() calls
    NSKeyedArchiver.setClassName("\(nativeModuleName).Token", for: Token.self)
    let migratedToken = Token(
      id: newId,
      type: v3Token.type,
      token: v3Token.token,
      created: v3Token.created,
      expiry: v3Token.expiry
    )
    let migratedData = NSKeyedArchiver.archivedData(withRootObject: migratedToken)

    let addAttributes: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrApplicationTag: newId.data(using: .utf8)!,
      kSecAttrIsPermanent: kCFBooleanTrue,
      kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
      kSecValueData: migratedData,
    ]
    SecItemAdd(addAttributes, nil)

    // Delete the old V3 entry
    let deleteQuery: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrApplicationTag: v3Id.data(using: .utf8)!,
    ]
    SecItemDelete(deleteQuery)
  }
}
