import Foundation
import React

enum AccountSecurityMethod: String {
    case pinNoDeviceAuth = "app_pin_no_device_authn"
    case pinWithDeviceAuth = "app_pin_has_device_authn"
    case deviceAuth = "device_authentication"
}

enum ChallengeSource: String {
    case local_app_switch,
    push_notification,
    remote_pairing_code,
    notValid
}

enum DeviceInfoKeys {
    static let systemName = "system_name"
    static let deviceName = "device_name"
    static let deviceID = "device_id"
    static let deviceModel = "device_model"
    static let systemVersion = "system_version"
    static let deviceToken = "device_token"
    static let fcmDeviceToken = "fcm_device_token"
    static let appVersion = "mobile_id_version"
    static let appBuild = "mobile_id_build"
    static let appSetID = "app_set_id"
    static let appSecurityOption = "app_security_option"
    static let hasOtherAccounts = "has_other_accounts"
}

@objcMembers
@objc(BcscCore)
class BcscCore: NSObject {
    static let generalizedOsName = "iOS"
    

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
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
  func getToken(_ tokenTypeNumber: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) { // Changed parameter to NSNumber
    let tokenTypeAsInt = tokenTypeNumber.intValue
    let tokenStorageService = KeychainTokenStorageService()
    let storage = StorageService()
    let account: Account? = storage.readData(file: AccountFiles.accountMetadata, pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory)

    guard let currentAccount = account, let clientID = currentAccount.clientID else {
        reject("E_ACCOUNT_NOT_FOUND", "Account or clientID not found.", nil)
        return
    }

    guard let tokenType = TokenType(rawValue: tokenTypeAsInt) else {
        reject("E_INVALID_TOKEN_TYPE", "Invalid token type number: \(tokenTypeAsInt)", nil)
        return
    }

    let id = "\(clientID)/tokens/\(tokenType.rawValue)/1"
    
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


  @objc
  func getRefreshTokenRequestBody(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let assertionType = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
    let grantType = "refresh_token"
    let storage = StorageService()
    let clientRegistration: ClientRegistration? = storage.readData(file: AccountFiles.clientRegistration, pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory)
    let account: Account? = storage.readData(file: AccountFiles.accountMetadata, pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory)
    let keyPairManager = KeyPairManager()
    let privateKey: SecKey
    let signer: RSASigner
    let serializedJWT: String

    guard let clientReg = clientRegistration else {
        reject("E_CLIENT_REGISTRATION_NOT_FOUND", "Client registration not found.", nil)
        return
    }

    guard let account = account else {
        reject("E_ACCOUNT_NOT_FOUND", "Account not found.", nil)
        return
    }

    // Make JWT Claim Set
    guard let uuid = UIDevice.current.identifierForVendor?.uuidString else {
        reject("E_UUID_NOT_FOUND", "UUID not found for the device.", nil)    
        return
    }

    let seconds = Int(Date().timeIntervalSince1970)
    let expireSeconds = Int(Date().addingTimeInterval(3600).timeIntervalSince1970)
    let claims = JWTClaimsSet.builder()
        .claim(name: "aud", value: account.issuer)
        .claim(name: "iss", value: account.clientID) // was from registration
        .claim(name: "sub", value: account.clientID) // was from registration
        .claim(name: "iat", value: seconds)
        .claim(name: "jti", value: uuid)
        .claim(name: "exp", value: expireSeconds)
        .build()
   
    let keys = keyPairManager.findAllPrivateKeys()

    // Sort the keys by creation date in descending order and get
    // the latest one
    let latestKey = keys.sorted { $0.created > $1.created }.first

    guard let lastKey = latestKey else {
        reject("E_NO_KEYS_FOUND", "No keys available to sign the JWT.", nil)
        return
    }

    do {
        let keyPair = try keyPairManager.getKeyPair(with: lastKey.tag)
        // At this point, privateKey is guaranteed to be non-nil if no error was thrown.
        // You can proceed to use privateKey for signing.
        signer = RSASigner(privateKey: keyPair.private)
    } catch {
        // Handle error from getKeyPair, e.g., key not found or other keychain issues
        reject("E_GET_KEYPAIR_FAILED", "Failed to retrieve key pair: \(error.localizedDescription)", error)
        return
    }
    
    let header = JWSHeader(alg: .RS512, kid: lastKey.tag)
    var jwt = JWS(header: header, payload: claims) // Made jwt a var to allow signing

    do {
        try jwt.sign(signer: signer)
        serializedJWT = try jwt.serialize()
        // Successfully signed and serialized
    } catch {
        reject("E_JWT_SIGN_SERIALIZE_FAILED", "Failed to sign or serialize JWT: \(error.localizedDescription)", error)
        return
    }

    self.getToken(NSNumber(value: TokenType.Refresh.rawValue), resolve: { tokenData in
        guard let tokenDict = tokenData as? [String: Any],
              let tokenValue = tokenDict["token"] as? String else {
            
            reject("E_REFRESH_TOKEN_INVALID", "Refresh token data is invalid or token string not found.", nil)
            return
        }

        // Construct the body for the refresh token request
        let body = "grant_type=\(grantType)&client_id=\(account.clientID!)&client_assertion_type=\(assertionType)&client_assertion=\(serializedJWT)&refresh_token=\(tokenValue)"

        resolve(body)

    }, reject: reject) // Pass the outer reject handler
  }

  @objc
  func signPairingCode(_ code: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let storage = StorageService()
    let keyPairManager = KeyPairManager()
    
    let deviceToken = "f0de..." // TODO: Replace with actual APNS token
    let fcmDeviceToken = "cmpZ..." // TODO: Replace with actual FCM token
    
    let hasOtherAccounts = false
    let accountSecurityMethod: AccountSecurityMethod? = nil
    
    guard let clientRegistration: ClientRegistration = storage.readData(file: AccountFiles.clientRegistration, pathDirectory: .applicationSupportDirectory) else {
      reject("E_CLIENT_REGISTRATION_NOT_FOUND", "Client registration not found.", nil)
      return
    }
    
    guard let account: Account = storage.readData(file: AccountFiles.accountMetadata, pathDirectory: .applicationSupportDirectory) else {
      reject("E_ACCOUNT_NOT_FOUND", "Account not found.", nil)
      return
    }
    
    guard let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String,
          let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String else { // Ensure build is also a String
      reject("E_VERSION_INFO_NOT_FOUND", "Client app version or build number not found.", nil)
      return
    }
    
    let seconds = Int(Date().timeIntervalSince1970)
    let builder = JWTClaimsSet.builder()
    
    builder
      .claim(name: "aud", value: account.issuer)
      .claim(name: "iss", value: account.clientID)
      .claim(name: "iat", value: seconds)
      .claim(name: "challenge", value: code)
      .claim(name: "challenge_source", value: ChallengeSource.remote_pairing_code.rawValue)
      .claim(name: "apns_token", value: deviceToken)
      .claim(name: "fcm_device_token", value: fcmDeviceToken)
      .claim(name: DeviceInfoKeys.systemName, value: BcscCore.generalizedOsName)
      .claim(name: DeviceInfoKeys.systemVersion, value: UIDevice.current.systemVersion)
      .claim(name: DeviceInfoKeys.deviceName, value: UIDevice.current.name)
      .claim(name: DeviceInfoKeys.deviceID, value: UIDevice.current.identifierForVendor?.uuidString ?? "")
      .claim(name: DeviceInfoKeys.deviceModel, value: UIDevice.current.model)
      .claim(name: DeviceInfoKeys.deviceToken, value: deviceToken) // Duplicate of apns_token?
      .claim(name: DeviceInfoKeys.fcmDeviceToken, value: fcmDeviceToken) // Duplicate of fcm_device_token?
      .claim(name: DeviceInfoKeys.appVersion, value: version)
      .claim(name: DeviceInfoKeys.appBuild, value: build)
      .claim(name: DeviceInfoKeys.appSetID, value: UIDevice.current.identifierForVendor?.uuidString ?? "") // Same as deviceID?
      .claim(name: DeviceInfoKeys.hasOtherAccounts, value: hasOtherAccounts)
    
    if let securityMethod = accountSecurityMethod {
      builder.claim(name: DeviceInfoKeys.appSecurityOption, value: securityMethod.rawValue)
    }
    
    let payload = builder.build()
    
    let keys = keyPairManager.findAllPrivateKeys()
    guard let latestKeyInfo = keys.sorted(by: { $0.created > $1.created }).first else {
      reject("E_NO_KEYS_FOUND", "No keys available to sign the JWT.", nil)
      return
    }
    
    let signer: RSASigner
    do {
      let keyPair = try keyPairManager.getKeyPair(with: latestKeyInfo.tag)
      signer = RSASigner(privateKey: keyPair.private)
    } catch {
      reject("E_GET_KEYPAIR_FAILED", "Failed to retrieve key pair: \\(error.localizedDescription)", error)
      return
    }
    
    let header = JWSHeader(alg: .RS512, kid: latestKeyInfo.tag)
    let jwt = JWS(header: header, payload: payload)
    
    do {
      try jwt.sign(signer: signer)
      let serializedJWT = try jwt.serialize()
      
      resolve(serializedJWT)
    } catch {
      reject("E_JWT_SIGN_SERIALIZE_FAILED", "Failed to sign or serialize JWT: \\(error.localizedDescription)", error)
      return
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
