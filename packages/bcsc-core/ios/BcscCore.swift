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
  func findAllPrivateKeys(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let keyPairManager = KeyPairManager()
    let keys = keyPairManager.findAllPrivateKeys()
    
    let result = keys.map { keyInfo -> [String: Any] in
      return [
        "keyType": keyInfo.keyType.name,
        "keySize": keyInfo.keySize,
        "tag": keyInfo.tag,
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
        "private": privateKeyData.base64EncodedString() 
      ]

      resolve(result)
    } catch KeychainError.keyNotExists {
      reject("E_KEY_NOT_FOUND", "Key pair with label '\(label)' not found.", nil)
    } catch {
      reject("E_UNKNOWN", "An unexpected error occurred: \(error.localizedDescription)", error)
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