//
//  TokenStorageService.swift
//  bc-services-card
//
//  Created by marcosc on 2017-12-30.
//  Copyright © 2017 Province of British Columbia. All rights reserved.
//

import Foundation

protocol TokenStorageServiceProtocol {
    func save(token: Token, attrAccessible: CFString) -> Bool
    func get(id: String) -> Token?
    func delete(id: String) -> Bool
}

class KeychainTokenStorageService: TokenStorageServiceProtocol {
    // private let log = Logger(source: "KeychainTokenStorageService")
    /**
     Save the given token to the Keychain.
     
     - Parameter token: The Token to save
     
     - Returns: true if the token was saved, false otherwise
    */
    func save(token: Token, attrAccessible: CFString = kSecAttrAccessibleWhenUnlockedThisDeviceOnly) -> Bool {
        // log.debug("save token id:\(token.id) type: \(token.type)")
        let data = NSKeyedArchiver.archivedData(withRootObject: token)
        let attributes: NSDictionary = [kSecClass: kSecClassKey,
                                   kSecAttrApplicationTag: token.id.data(using: .utf8)!,
                                   kSecAttrIsPermanent: kCFBooleanTrue,
                                   kSecAttrAccessible: attrAccessible,
                                   kSecValueData: data
                                   ]
        var status = errSecSuccess
        if get(id: token.id) != nil {
            // log.debug("token already exists so call update")

            let query: NSDictionary = [kSecClass: kSecClassKey,
                                       kSecAttrApplicationTag: token.id.data(using: .utf8)!]

            let updateAttributes : NSDictionary = [kSecValueData: data]
            status = SecItemUpdate(query, updateAttributes)
        } else {
            status = SecItemAdd(attributes, nil)
        }
        if status != errSecSuccess {
            // log.error("error saving token id:\(token.id) type: \(token.type)")
            return false
        }
        return true
    }
    /**
     Find and return the Token identified by the given id if it exists.
     
     - Parameter id: The token identifier
     
     - Returns: the token instance if found, nil otherwise
     */
    func get(id: String) -> Token? {
        // Migrate before fetching
        migrateLegacyItem(id)
        
        NSKeyedUnarchiver.setClass(Token.self, forClassName: "bc_services_card_dev.Token")
        let query: NSDictionary = [kSecClass: kSecClassKey,
                                   kSecAttrApplicationTag: id.data(using: .utf8)!,
                                   kSecMatchLimit: kSecMatchLimitOne,
                                   kSecReturnData: kCFBooleanTrue]
        var result: CFTypeRef?
        let _ = SecItemCopyMatching(query, &result)
        guard result != nil,
        let data = result as? Data,
        let token = NSKeyedUnarchiver.unarchiveObject(with: data) as? Token
        else { return nil }
        
        return token
    }
    /**
     Find and delete the Token identified by the given id if it exists.
     
     - Parameter id: The token identifier
     
     - Returns: the token instance if found, nil otherwise
     */
    func delete(id: String) -> Bool {
        guard let token = get(id: id) else {
            // log.error("delete called for token that doesn't exist with id:\(id)")
            return false
        }
        let data = NSKeyedArchiver.archivedData(withRootObject: token)
        let query: NSDictionary = [kSecClass: kSecClassKey,
                                   kSecAttrApplicationTag: id.data(using: .utf8)!,
                                   kSecValueData: data]
        
        var result: CFTypeRef?
        let status = SecItemDelete(query)
        if status != errSecSuccess {
            // log.error("error deleting token id:\(id), osstatus=\(status)")
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
            kSecAttrApplicationTag: id.data(using: .utf8)!
        ]
        
        let updateAttributes: NSDictionary = [
            kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        
        _ = SecItemUpdate(query, updateAttributes)
    }
}
