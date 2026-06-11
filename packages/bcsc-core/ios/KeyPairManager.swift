//
//  KeyPairManager.swift
//  bc-services-card
//
//  Created by marcosc on 2017-12-22.
//  Copyright © 2017 Province of British Columbia. All rights reserved.
//

import Foundation
import Security

enum KeychainError: Error, LocalizedError {
  case keyAlreadyExists
  case keyNotExists
  case keyGenError

  /// LocalizedError (not a plain computed property) so the message survives
  /// access through the `Error` existential, e.g. in `error.localizedDescription`
  /// interpolations at the React Native reject sites.
  var errorDescription: String? {
    switch self {
    case .keyAlreadyExists:
      return "key already exists in the keychain"
    case .keyNotExists:
      return "key does not exist in the keychain"
    case .keyGenError:
      return "key pair generation failed"
    }
  }
}

enum KeySize {
  static let max = 4096
}

struct KeyType {
  let name: String
  let kSecAttrKeyType: CFString
  static let EC = KeyType(name: "EC", kSecAttrKeyType: kSecAttrKeyTypeEC)
  static let ECSECPR = KeyType(name: "ECSECPrimeRandom", kSecAttrKeyType: kSecAttrKeyTypeECSECPrimeRandom)
  static let RSA = KeyType(name: "RSA", kSecAttrKeyType: kSecAttrKeyTypeRSA)
}

struct PrivateKeyInfo {
  let keyType: KeyType
  let keySize: Int
  let tag: String
  let created: Date
}

protocol KeyPairManagerProtocol {
  func deleteKey(withLabel label: String) -> Bool
  func findAllPrivateKeys() -> [PrivateKeyInfo]
  func findPrivateKey(with label: String) -> PrivateKeyInfo?
  func generateKeyPair(withLabel label: String, keyType: KeyType, keySize: Int) throws
    -> (public: SecKey, private: SecKey)
  func getKeyPair(with label: String) throws -> (public: SecKey, private: SecKey)
  func keyPairExists(with label: String) -> Bool
}

/**
 Creates and manages keys in the KeyChain.

 You can create new keys with a `label` that can be used to find and retrieve the keypair later.
 ````
    let kpm = KeyPairManager()
    let (pub, priv) = try kpm.generateRandomKeyPair(withLabel: "mylabel2")
 ````
 */
class KeyPairManager: KeyPairManagerProtocol {
  private let log = AppLogger(
    subsystem: Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard", category: "KeyPairManager"
  )

  /*
   Returns true if a public / private key pair in the KeyChain with the given `label` can be found.

   - Parameter label: The unique `kSecAttrApplicationTag` attribute used to find the key.

   - Returns: true if the keypair can be found, false otherwise.

   */

  func keyPairExists(with label: String) -> Bool {
    do {
      let pk = findPrivateKey(with: label)
      return pk != nil
    } catch {
      return false
    }
  }

  /**
   Find and return an existing public / private key pair in the KeyChain with the given `label`

   - Parameter label: The unique `kSecAttrApplicationTag` attribute used to retrieve the key.

   - Throws: `KeychainError.keyNotExists` if a key with the `label` parameter can not be found in the KeyChain

   - Returns: The public and private keys.

   */
  func getKeyPair(with label: String) throws -> (public: SecKey, private: SecKey) {
    guard let privateKeyResult = findKey(withLabel: label),
          let publicKeyResult = SecKeyCopyPublicKey(privateKeyResult as! SecKey)
    else { throw KeychainError.keyNotExists }
    let publicKey = publicKeyResult
    let privateKey = privateKeyResult as! SecKey

    return (publicKey, privateKey)
  }

  /**
   Find and return the PrivateKeyInfo for an existing key pair in the KeyChain with the given `label`

   - Parameter label: The unique `kSecAttrApplicationTag` attribute used to retrieve the key.

   - Returns: The PrivateKeyInfo for the key if found, nil otherwise

   */
  func findPrivateKey(with label: String) -> PrivateKeyInfo? {
    let query: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrIsPermanent: kCFBooleanTrue,
      kSecMatchLimit: kSecMatchLimitOne,
      kSecAttrLabel: label,
      kSecAttrApplicationTag: label.data(using: .utf8)!,
      kSecReturnRef: kCFBooleanFalse,
      kSecReturnData: kCFBooleanFalse,
      kSecReturnAttributes: kCFBooleanTrue,
      kSecReturnPersistentRef: kCFBooleanFalse,
    ]
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query, &result)
    guard status == errSecSuccess else {
      log.error("findPrivateKey: lookup for label '\(label)' failed with OSStatus \(status)")
      return nil
    }

    return makePrivateKeyInfo(dictionary: result as! [String: Any])
  }

  private func makePrivateKeyInfo(dictionary: [String: Any]) -> PrivateKeyInfo? {
    guard let tagData = dictionary[kSecAttrApplicationTag as String] as? Data,
          let tag = String(data: tagData, encoding: .utf8),
          let keySize = dictionary[kSecAttrKeySizeInBits as String] as? Int,
          let created = dictionary[kSecAttrCreationDate as String] as? Date,
          let typ = dictionary[kSecAttrKeyType as String] as? Int
    else {
      return nil
    }

    guard let keyType = (kSecAttrKeyTypeRSA as String) == String(typ) ? KeyType.RSA :
      (kSecAttrKeyTypeEC as String) == String(typ) ? KeyType.EC :
      (kSecAttrKeyTypeECSECPrimeRandom as String) == String(typ) ? KeyType.ECSECPR : nil
    else {
      return nil
    }
    return PrivateKeyInfo(keyType: keyType, keySize: keySize, tag: tag, created: created)
  }

  /**
   Find and return a list of all private keys in the KeyChain that have a kSecAttrApplicationTag

   - Returns: A list of any found PrivateKeyInfo objects, empty if none were found

   */
  func findAllPrivateKeys() -> [PrivateKeyInfo] {
    let attributes: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrKeyClass: kSecAttrKeyClassPrivate,
      kSecAttrIsPermanent: kCFBooleanTrue,
      kSecMatchLimit: kSecMatchLimitAll,
      kSecReturnRef: kCFBooleanFalse,
      kSecReturnData: kCFBooleanFalse,
      kSecReturnAttributes: kCFBooleanTrue,
      kSecReturnPersistentRef: kCFBooleanFalse,
    ]
    var result: CFTypeRef?
    let status = SecItemCopyMatching(attributes, &result)
    guard status == errSecSuccess else {
      log.error("findAllPrivateKeys: enumeration failed with OSStatus \(status)")
      return []
    }
    let list = result as! [[String: Any]]
    var keys = [PrivateKeyInfo]()
    for dict in list {
      guard let pk = makePrivateKeyInfo(dictionary: dict) else {
        log.warning("findAllPrivateKeys: skipping keychain item with missing or undecodable key attributes")
        continue
      }
      keys.append(pk)
    }
    return keys
  }

  func generateKeyPair(
    withLabel label: String,
    keyType: KeyType = KeyType.RSA,
    keySize: Int = 4096
  ) throws -> (public: SecKey, private: SecKey) {
    let pubKeyAttrs: NSDictionary = [
      kSecAttrLabel: "\(label)/pub",
      // kSecAttrApplicationTag: "\(label)/pub".data(using: .utf8)!,
      kSecAttrIsPermanent: kCFBooleanFalse,
    ]
    let privKeyAttrs: NSDictionary = [
      kSecAttrLabel: label,
      kSecAttrApplicationTag: label.data(using: .utf8)!,
      kSecAttrIsPermanent: kCFBooleanTrue,
    ]

    let parameters: NSDictionary = [
      kSecAttrKeyType: keyType.kSecAttrKeyType,
      kSecAttrKeySizeInBits: keySize,
      kSecPublicKeyAttrs: pubKeyAttrs,
      kSecPrivateKeyAttrs: privKeyAttrs,
    ]

    if keyPairExists(with: label) {
      log.debug("generateKeyPair: key pair for label '\(label)' already exists, returning it")
      return try getKeyPair(with: label)
    }

    var publicKey: SecKey?
    var privateKey: SecKey?
    let status = SecKeyGeneratePair(parameters, &publicKey, &privateKey)
    if errSecSuccess != status {
      log.error("generateKeyPair: SecKeyGeneratePair for label '\(label)' failed with OSStatus \(status)")
      if status == errSecDuplicateItem {
        throw KeychainError.keyAlreadyExists
      }
      throw KeychainError.keyGenError
    }

    return (publicKey!, privateKey!)
  }

  /**
    Delete the key with the given `label` if it exists.

    - Parameter label: The unique `kSecAttrApplicationTag` attribute used to find the key.

    - Returns: true if the key was deleted, false otherwise
   */
  func deleteKey(withLabel label: String) -> Bool {
    let query: NSDictionary = [kSecClass: kSecClassKey, kSecAttrApplicationTag: label.data(using: .utf8)!]
    let status = SecItemDelete(query)
    if status != errSecSuccess {
      log.error("deleteKey: delete for label '\(label)' failed with OSStatus \(status)")
    }
    return errSecSuccess == status
  }

  private func findKey(withLabel label: String) -> CFTypeRef? {
    let attributes: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrLabel: label,
//                                        kSecAttrApplicationTag: label.data(using: .utf8)!,
      kSecAttrIsPermanent: kCFBooleanTrue,
      kSecMatchLimit: kSecMatchLimitOne,
      kSecReturnRef: kCFBooleanTrue,
    ]
    var result: CFTypeRef?
    let status = SecItemCopyMatching(attributes, &result)
    if status != errSecSuccess {
      log.error("findKey: lookup for label '\(label)' failed with OSStatus \(status)")
    }
    return result
  }

  func findLegacyKey(withLabel label: CFString) -> CFTypeRef? {
    let attributes: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrLabel: label,
      kSecAttrIsPermanent: kCFBooleanTrue,
      kSecMatchLimit: kSecMatchLimitOne,
      kSecReturnRef: kCFBooleanTrue,
    ]
    var result: CFTypeRef?
    SecItemCopyMatching(attributes, &result)
    return result
  }
}
