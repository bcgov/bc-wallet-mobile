//
//  KeychainManager.swift
//  bc-services-card
//
//  Created by marcosc on 2017-12-22.
//  Copyright © 2017 Province of British Columbia. All rights reserved.
//

import Foundation

enum KeychainError : Error {
    case keyAlreadyExists
    case keyNotExists
    case keyGenError
    
    var localizedDescription: String {
        get {
            switch self {

            case .keyAlreadyExists:
                return "KeyAlreadyExists error"
            case .keyNotExists:
                return "KeyNotExists error"
            case .keyGenError:
                return "KeyGenError error"
            }
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
    func findAllPrivateKeys() -> Array<PrivateKeyInfo>
    func findPrivateKey(with label: String) -> PrivateKeyInfo?
    func generateKeyPair(withLabel label: String, keyType: KeyType, keySize: Int) throws -> (public: SecKey, private: SecKey)
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
    // private let log = Logger(source: "KeyPairManager")
    /**
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
        let query: NSDictionary = [kSecClass: kSecClassKey,
                                        kSecAttrIsPermanent: kCFBooleanTrue,
                                        kSecMatchLimit: kSecMatchLimitOne,
                                        kSecAttrLabel: label,
                                        kSecAttrApplicationTag: label.data(using: .utf8)!,
                                        kSecReturnRef: kCFBooleanFalse,
                                        kSecReturnData: kCFBooleanFalse,
                                        kSecReturnAttributes: kCFBooleanTrue,
                                        kSecReturnPersistentRef: kCFBooleanFalse]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query, &result)
        guard status == errSecSuccess else {
            // log.error("findPrivateKey search was unsuccessful. OS status: \(status)")
            return nil
            
        }
        
        let pk = makePrivateKeyInfo(dictionary: result as! Dictionary<String, Any>)
        
        return pk
    }
    
    private func makePrivateKeyInfo(dictionary: Dictionary<String, Any>) -> PrivateKeyInfo? {
       
        guard let tagData = dictionary[kSecAttrApplicationTag as String] as? Data,
              let tag = String(data: tagData, encoding: .utf8),
              let keySize = dictionary[kSecAttrKeySizeInBits as String] as? Int,
              let created = dictionary[kSecAttrCreationDate as String] as? Date,
              let typ = dictionary[kSecAttrKeyType as String] as? Int else {
                return nil
        }
        
        guard let keyType = (kSecAttrKeyTypeRSA as String) == String(typ)  ? KeyType.RSA :
            (kSecAttrKeyTypeEC as String) == String(typ) ? KeyType.EC :
            (kSecAttrKeyTypeECSECPrimeRandom as String) == String(typ) ? KeyType.ECSECPR : nil else {
            return nil
        }
        return PrivateKeyInfo(keyType: keyType, keySize: keySize, tag: tag, created: created)
    }
    /**
     Find and return a list of all private keys in the KeyChain that have a kSecAttrApplicationTag
     
     - Returns: A list of any found PrivateKeyInfo objects, empty if none were found
     
     */
    func findAllPrivateKeys() -> Array<PrivateKeyInfo> {
        let attributes: NSDictionary = [kSecClass: kSecClassKey,
                                        kSecAttrKeyClass: kSecAttrKeyClassPrivate,
                                        kSecAttrIsPermanent: kCFBooleanTrue,
                                        kSecMatchLimit: kSecMatchLimitAll,
                                        kSecReturnRef: kCFBooleanFalse,
                                        kSecReturnData: kCFBooleanFalse,
                                        kSecReturnAttributes: kCFBooleanTrue,
                                        kSecReturnPersistentRef: kCFBooleanFalse]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(attributes, &result)
        guard status == errSecSuccess else {
            // log.error("findAllKeys search was unsuccessful. OS status: \(status)")
            return []
            
        }
        let list = result as!Array<Dictionary<String, Any>>
        var keys = Array<PrivateKeyInfo>()
        for dict in list {
            guard let pk = makePrivateKeyInfo(dictionary: dict) else {
                // log.error("unable to create private key from dict")
                continue
            }
            keys.append(pk)
        }
        return keys
    }
    
    func generateKeyPair(withLabel label: String, keyType: KeyType = KeyType.RSA, keySize: Int = 4096) throws -> (public: SecKey, private: SecKey) {
        let pubKeyAttrs: NSDictionary = [kSecAttrLabel: "\(label)/pub",
                                         //kSecAttrApplicationTag: "\(label)/pub".data(using: .utf8)!,
                                         kSecAttrIsPermanent: kCFBooleanFalse]
        let privKeyAttrs: NSDictionary = [kSecAttrLabel: label,
                                          kSecAttrApplicationTag: label.data(using: .utf8)!,
                                          kSecAttrIsPermanent: kCFBooleanTrue]
        
        let parameters: NSDictionary = [kSecAttrKeyType: keyType.kSecAttrKeyType,
                                        kSecAttrKeySizeInBits: keySize,
                                        kSecPublicKeyAttrs: pubKeyAttrs,
                                        kSecPrivateKeyAttrs: privKeyAttrs]
        
        let currentDate = Date().timeIntervalSince1970
        let pkGenDate = Int(currentDate)
        // log.debug("Private Key was generated at \(currentDate). Integer value was converted to \(pkGenDate)")

        // Defaults.pkLastUpdated = pkGenDate //j
        // log.debug("PK gen date is \(pkGenDate)")
        // log.debug("Defaults PK is \(Defaults.pkLastUpdated)")
       
        if keyPairExists(with: label) {
            // log.debug("keyPair already exists from a previous invocation so just return it")
            return try getKeyPair(with: label)
            //throw KeychainError.keyAlreadyExists
        }

        var publicKey: SecKey?
        var privateKey: SecKey?
        let status = SecKeyGeneratePair(parameters, &publicKey, &privateKey)
        if errSecSuccess != status {
            // log.error("unable to generate pair. status=\(status)")
            throw KeychainError.keyGenError
        }
        
        //FileStorageService().saveDateForPrivateKey(with: label, date: Date())
        return (publicKey!, privateKey!)


    }
    /**
     Delete the key with the given `label` if it exists.
     
     - Parameter label: The unique `kSecAttrApplicationTag` attribute used to find the key.
     
     - Returns: true if the key was deleted, false otherwise
    */
    func deleteKey(withLabel label: String) -> Bool {
        let query :NSDictionary = [kSecClass: kSecClassKey, kSecAttrApplicationTag: label.data(using: .utf8)!]
        let status = SecItemDelete(query)
        // log.debug("delete status is \(status)")
        //FileStorageService().removeDateForPrivateKey(with: label)
        return errSecSuccess == status
    }
    
    private func findKey(withLabel label: String) -> CFTypeRef? {
        let attributes: NSDictionary = [kSecClass: kSecClassKey,
                                        kSecAttrLabel: label,
//                                        kSecAttrApplicationTag: label.data(using: .utf8)!,
                                        kSecAttrIsPermanent: kCFBooleanTrue,
                                        kSecMatchLimit: kSecMatchLimitOne,
                                        kSecReturnRef: kCFBooleanTrue]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(attributes, &result)
        // log.debug("findKey withLabel \(label) status is \(status)")
        return result

    }
    
     func findLegacyKey(withLabel label: CFString) -> CFTypeRef? {
        let attributes: NSDictionary = [kSecClass: kSecClassKey,
                                        kSecAttrLabel: label,
                                        kSecAttrIsPermanent: kCFBooleanTrue,
                                        kSecMatchLimit: kSecMatchLimitOne,
                                        kSecReturnRef: kCFBooleanTrue]
        var result: CFTypeRef?
        SecItemCopyMatching(attributes, &result)
        return result
    }
}
