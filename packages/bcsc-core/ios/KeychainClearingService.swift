//
//  KeychainClearingService.swift
//  bcsc-core
//

import Foundation
import Security

protocol KeychainClearingServiceProtocol {
  /// Deletes every Keychain item belonging to this app, across all Sec item classes.
  func clearAll()
}

/// Wipes all Keychain data for this app. Used by the factory reset flow
struct KeychainClearingService: KeychainClearingServiceProtocol {
  func clearAll() {
    let secItemClasses = [
      kSecClassGenericPassword,
      kSecClassInternetPassword,
      kSecClassCertificate,
      kSecClassKey,
      kSecClassIdentity,
    ]

    for itemClass in secItemClasses {
      let query: [String: Any] = [
        kSecClass as String: itemClass,
        kSecAttrSynchronizable as String: kSecAttrSynchronizableAny, // Important for iCloud Keychain items
      ]

      // Debug visibility only (no item values touched, just a presence count) — lets a
      // developer confirm on-device whether the wipe actually found anything to remove.
      #if DEBUG
        print("[KeychainClearingService] \(itemClass as String): \(countMatching(query: query)) item(s) before clear")
      #endif

      SecItemDelete(query as CFDictionary)
    }
  }

  #if DEBUG
    /// Counts items matching `query` without extracting their (potentially sensitive) values.
    private func countMatching(query: [String: Any]) -> Int {
      var countQuery = query
      countQuery[kSecReturnAttributes as String] = true
      countQuery[kSecMatchLimit as String] = kSecMatchLimitAll

      var result: AnyObject?
      let status = SecItemCopyMatching(countQuery as CFDictionary, &result)

      guard status == errSecSuccess else {
        return 0
      }

      // A single match returns a dictionary rather than an array of one.
      if let array = result as? [Any] {
        return array.count
      }
      return 1
    }
  #endif
}
