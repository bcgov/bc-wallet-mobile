import Foundation
import React

@objcMembers
@objc(BcscCore)
class BcscCore: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func multiply(_ a: Double, b: Double, withResolver resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) {
    let result = NSNumber(value: a * b)
    resolve(result)
  }
    
  @objc
  func getAllKeys(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let keyPairManager = KeyPairManager()
    let keys = keyPairManager.findAllPrivateKeys()
    
    let result = keys.map { keyInfo -> [String: Any] in
      return [
        "keyType": keyInfo.keyType.name,
        "keySize": keyInfo.keySize,
        "id": keyInfo.tag,
        "created": keyInfo.created.timeIntervalSince1970 // Convert Date to timestamp
      ]
    }
    
    resolve(result)
  }

  @objc
  func getKeyPair(_ label: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let keyPairManager = KeyPairManager()
    do {
      let keyPair = try keyPairManager.getKeyPair(with: label)
      var error: Unmanaged<CFError>?
      
      guard let publicKeyData = SecKeyCopyExternalRepresentation(keyPair.public, &error) as Data? else {
        // Handle error, maybe reject the promise
        let nsError = error!.takeRetainedValue() as Error
        reject("E_KEY_EXPORT", "Failed to export public key: \(nsError.localizedDescription)", nsError)
        
        return
      }

      guard let privateKeyData = SecKeyCopyExternalRepresentation(keyPair.private, &error) as Data? else {
        // Handle error, maybe reject the promise
        let nsError = error!.takeRetainedValue() as Error
        reject("E_KEY_EXPORT", "Failed to export private key: \(nsError.localizedDescription)", nsError)
        
        return
      }

      let result: [String: Any] = [
        "public": publicKeyData.base64EncodedString(),
        "private": privateKeyData.base64EncodedString(),
        "id:": label,
      ]

      resolve(result)
    } catch KeychainError.keyNotExists {
      reject("E_KEY_NOT_FOUND", "Key pair with label '\(label)' not found.", nil)
    } catch {
      reject("E_UNKNOWN", "An unexpected error occurred: \(error.localizedDescription)", error)
    }
  }

  @objc
  func getToken(_ tokenTypeNumber: Int, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let tokenStorageService = KeychainTokenStorageService()
    let storage = StorageService() // Changed from Storable and s to storage
    let account: Account? = storage.readData(file: AccountFiles.accountMetadata, pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory)

    guard let currentAccount = account, let clientID = currentAccount.clientID else {
        reject("E_ACCOUNT_NOT_FOUND", "Account or clientID not found.", nil)
        return
    }

    guard let tokenType = TokenType(rawValue: tokenTypeNumber) else {
        reject("E_INVALID_TOKEN_TYPE", "Invalid token type number: \(tokenTypeNumber)", nil)
        return
    }

    let id = "\(clientID)/tokens/\(tokenType.rawValue)/1"
    print("***** getToken id: \(id)")
    
    if let token = tokenStorageService.get(id: id) {
      var tokenDict: [String: Any?] = [
        "id": token.id,
        "type": token.type.rawValue,
        "token": token.token,
        "created": token.created.timeIntervalSince1970
      ]

      if let expiry = token.expiry {
        tokenDict["expiry"] = expiry.timeIntervalSince1970
      } else {
        tokenDict["expiry"] = nil
      }
      
      resolve(tokenDict)
    } else {
      resolve(nil)
    }
  }

  @objc
  func getAccount(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let storage = StorageService() // Changed from PersistentStorage
    let account: Account? = storage.readData(file: AccountFiles.accountMetadata, pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory)
    
    if let acc = account {
        let result: [String: Any?] = [
            "id": acc.id,
            "issuer": acc.issuer,
            "clientID": acc.clientID,
//            "_securityMethod": acc._securityMethod,
            "displayName": acc.displayName,
            "didPostNicknameToServer": acc.didPostNicknameToServer,
            "nickname": acc.nickname,
            "failedAttemptCount": acc.failedAttemptCount,
//            "lastAttemptDate": acc.lastAttemptDate?.timeIntervalSince1970, // Convert Date to timestamp or nil
            // penalties is a computed property and might not be directly encodable or needed.
            // If it's needed, it requires specific handling to convert to a plist-compatible format.
        ]
        resolve(result)
    } else {
        resolve(nil)
    }
  }

  // Support for the new architecture (Fabric)
  #if RCT_NEW_ARCH_ENABLED
  @objc
  class func moduleName() -> String! {
    return "BcscCore"
  }
  #endif
}
