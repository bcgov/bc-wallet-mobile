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

      SecItemDelete(query as CFDictionary)
    }
  }
}
