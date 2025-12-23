import CryptoKit
import Foundation
import LocalAuthentication
import React
import UserNotifications

enum AccountSecurityMethod: String {
  case pinNoDeviceAuth = "app_pin_no_device_authn"
  case pinWithDeviceAuth = "app_pin_has_device_authn"
  case deviceAuth = "device_authentication"
}

enum ChallengeSource: String {
  case local_app_switch
  case push_notification
  case remote_pairing_code
  case notValid
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
  let logger = AppLogger(subsystem: Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard", category: "BcscCore")
  static let generalizedOsName = "iOS"
  static let provider = "https://idsit.gov.bc.ca/device/"
  static let clientName = "BC Services Wallet"

  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // MARK: - Private Helper Methods

  /**
   * Gets the device ID synchronously for use in JWT claims.
   * Uses the same method as the async getDeviceId but returns directly.
   */
  private func getDeviceIdSync() -> String {
    let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? ""
    if deviceId.isEmpty {
      return UUID().uuidString
    }
    return deviceId
  }

  /**
   * Creates a signed JWT client assertion for OAuth requests
   * @param audience The audience for the JWT (typically issuer or clientID)
   * @param issuer The issuer for the JWT iss claim
   * @param subject The subject for the JWT sub claim
   * @param additionalClaims Optional additional claims to include in the JWT
   * @param reject The reject callback for error handling
   * @returns The signed JWT string, or nil if an error occurred
   */
  private func createClientAssertionJWT(
    audience: String, issuer: String, subject: String, additionalClaims: [String: Any] = [:],
    reject: @escaping RCTPromiseRejectBlock
  ) -> String? {
    let clientAssertionJwtExpirationSeconds = 3600 // 1 hour

    // Make JWT Claim Set
    guard let uuid = UIDevice.current.identifierForVendor?.uuidString else {
      reject("E_UUID_NOT_FOUND", "UUID not found for the device.", nil)
      return nil
    }

    let builder = JWTClaimsSet.builder()
    let seconds = Int(Date().timeIntervalSince1970)
    let expireSeconds = Int(
      Date().addingTimeInterval(TimeInterval(clientAssertionJwtExpirationSeconds))
        .timeIntervalSince1970)

    // Add standard claims
    builder
      .claim(name: "aud", value: audience)
      .claim(name: "iss", value: issuer)
      .claim(name: "sub", value: subject)
      .claim(name: "iat", value: seconds)
      .claim(name: "jti", value: uuid)
      .claim(name: "exp", value: expireSeconds)

    // Add any additional claims
    for (key, value) in additionalClaims {
      builder.claim(name: key, value: value)
    }

    let payload = builder.build()

    guard let serializedJWT = signJWT(payload: payload, reject: reject) else {
      return nil // Error already handled by signJWT
    }

    return serializedJWT
  }

  private func signJWT(payload: JWTClaimsSet, reject: @escaping RCTPromiseRejectBlock) -> String? {
    let keyPairManager = KeyPairManager()
    let keys = keyPairManager.findAllPrivateKeys()
    let signer: RSASigner

    guard let latestKeyInfo = keys.sorted(by: { $0.created > $1.created }).first else {
      reject("E_NO_KEYS_FOUND", "No keys available to sign the JWT.", nil)
      return nil
    }

    do {
      let keyPair = try keyPairManager.getKeyPair(with: latestKeyInfo.tag)
      signer = RSASigner(privateKey: keyPair.private)
    } catch {
      reject(
        "E_GET_KEYPAIR_FAILED", "Failed to retrieve key pair: \(error.localizedDescription)", error
      )
      return nil
    }

    let header = JWSHeader(alg: .RS512, kid: latestKeyInfo.tag)
    var jwt = JWS(header: header, payload: payload)

    do {
      try jwt.sign(signer: signer)
      return try jwt.serialize()
    } catch {
      reject(
        "E_JWT_SIGN_SERIALIZE_FAILED",
        "Failed to sign or serialize JWT: \(error.localizedDescription)", error
      )
      return nil
    }
  }

  private func clearKeychain() {
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

    logger.log("Keychain cleared for this app.")
  }

  // MARK: - Public Methods

  func getAllKeys(
    _ resolve: @escaping RCTPromiseResolveBlock, reject _: @escaping RCTPromiseRejectBlock
  ) {
    let keyPairManager = KeyPairManager()
    let keys = keyPairManager.findAllPrivateKeys()

    let result = keys.map { keyInfo -> [String: Any] in
      return [
        "keyType": keyInfo.keyType.name,
        "keySize": keyInfo.keySize,
        "id": keyInfo.tag,
        "created": keyInfo.created.timeIntervalSince1970, // Convert Date to timestamp
      ]
    }

    resolve(result)
  }

  func getKeyPair(
    _ label: String, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let keyPairManager = KeyPairManager()
    do {
      let keyPair = try keyPairManager.getKeyPair(with: label)
      var error: Unmanaged<CFError>?

      guard let publicKeyData = SecKeyCopyExternalRepresentation(keyPair.public, &error) as Data?
      else {
        // Handle error, maybe reject the promise
        let nsError = error!.takeRetainedValue() as Error
        reject(
          "E_KEY_EXPORT", "Failed to export public key: \(nsError.localizedDescription)", nsError
        )

        return
      }

      guard let privateKeyData = SecKeyCopyExternalRepresentation(keyPair.private, &error) as Data?
      else {
        // Handle error, maybe reject the promise
        let nsError = error!.takeRetainedValue() as Error
        reject(
          "E_KEY_EXPORT", "Failed to export private key: \(nsError.localizedDescription)", nsError
        )

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

  private func generateKeyPair() -> String? {
    let keyPairManager = KeyPairManager()
    let keys = keyPairManager.findAllPrivateKeys()
    let initialKeyId = "\(BcscCore.provider)/\(UUID().uuidString)/1" // Use BcscCore.provider

    if let latestKeyInfo = keys.sorted(by: { $0.created > $1.created }).first {
      let existingTag = latestKeyInfo.tag
      var components = existingTag.split(separator: "/").map(String.init)

      // Check if the tag has at least one component (the numeric suffix)
      // and if that last component can be parsed as an Int.
      if let lastNumericString = components.last, var numericSuffix = Int(lastNumericString) {
        numericSuffix += 1
        components.removeLast() // Remove the old numeric suffix string
        let baseId = components.joined(separator: "/") // Reconstruct the base part of the ID
        let newKeyId = "\(baseId)/\(numericSuffix)"

        logger.log(
          "generateKeyPair - Latest key found: \(existingTag). Attempting to generate new incremented key with ID: \(newKeyId)"
        )
        do {
          // Assuming default keyType and keySize are handled by KeyPairManager.generateKeyPair or are acceptable.
          _ = try keyPairManager.generateKeyPair(withLabel: newKeyId)
          logger.log(
            "generateKeyPair - Successfully generated new incremented key with ID: \(newKeyId)"
          )
          return newKeyId
        } catch {
          logger.error(
            "generateKeyPair - Failed to generate new incremented key with ID \(newKeyId): \(error.localizedDescription)."
          )
          return nil // Failed to generate the specifically requested incremented key.
        }
      } else {
        // Parsing the existing tag failed (e.g., not in expected format or last part not a number).
        // Fallback: generate a completely new key using a fresh initial ID pattern.
        logger.warning(
          "generateKeyPair - Could not parse or increment existing key tag: \(existingTag). Attempting to generate a new key with a fresh initial ID pattern."
        )
        // Use the same pattern for the new key ID as in the 'no keys found' case for consistency, but with a new UUID.
        let freshGeneratedKeyId = "\(BcscCore.provider)/\(UUID().uuidString)/1"
        logger.log(
          "generateKeyPair - Attempting to generate a new key with ID: \(freshGeneratedKeyId) due to parsing failure of existing key."
        )
        do {
          _ = try keyPairManager.generateKeyPair(withLabel: freshGeneratedKeyId)
          logger.log(
            "generateKeyPair - Successfully generated new key with ID: \(freshGeneratedKeyId) after parsing failure."
          )
          return freshGeneratedKeyId
        } catch {
          logger.error(
            "generateKeyPair - Failed to generate new key with ID \(freshGeneratedKeyId) after parsing failure: \(error.localizedDescription)"
          )
          return nil
        }
      }
    } else {
      // No keys found, attempt to generate a new one
      logger.log(
        "generateKeyPair - No keys found. Attempting to generate a new key with ID: \(initialKeyId)"
      )
      do {
        _ = try keyPairManager
          .generateKeyPair(withLabel: initialKeyId) // Assuming default keyType and keySize are handled by this method
        // or are acceptable.
        logger.log(
          "generateKeyPair - Successfully generated new key with ID: \(initialKeyId)"
        )
        return initialKeyId
      } catch {
        logger.error(
          "generateKeyPair - Failed to generate new key with ID \(initialKeyId): \(error.localizedDescription)"
        )
        return nil
      }
    }
  }

  func getToken(
    _ tokenTypeNumber: NSNumber, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) { // Changed parameter to NSNumber
    let tokenTypeAsInt = tokenTypeNumber.intValue
    let tokenStorageService = KeychainTokenStorageService()
    let storage = StorageService()
    let account: Account? = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    guard let currentAccount = account else {
      reject("E_ACCOUNT_NOT_FOUND", "Account or clientID not found.", nil)
      return
    }

    guard let tokenType = TokenType(rawValue: tokenTypeAsInt) else {
      reject("E_INVALID_TOKEN_TYPE", "Invalid token type number: \(tokenTypeAsInt)", nil)
      return
    }

    let id = "\(currentAccount.clientID)/tokens/\(tokenType.rawValue)/1"
    logger.log("getToken: Looking for token with id: \(id)")

    if let token = tokenStorageService.get(id: id) {
      logger.log("getToken: Found token of type \(tokenType) with id: \(token.id)")
      var tokenDict: [String: Any?] = [
        "id": token.id,
        "type": token.type.rawValue,
        "token": token.token,
        "created": token.created.timeIntervalSince1970,
      ]

      if let expiry = token.expiry {
        tokenDict["expiry"] = expiry.timeIntervalSince1970
      } else {
        tokenDict["expiry"] = nil
      }

      resolve(tokenDict)
    } else {
      logger.log("getToken: Token not found for id: \(id)")
      resolve(nil)
    }
  }

  /// Saves a token to secure keychain storage.
  ///
  /// - Parameters:
  ///   - tokenTypeNumber: The token type (0=Access, 1=Refresh, 2=Registration)
  ///   - tokenString: The token string to store
  ///   - expiry: Optional expiry timestamp in seconds since epoch
  ///   - resolve: Returns true if saved successfully
  ///   - reject: Returns error on failure

  func setToken(
    _ tokenTypeNumber: NSNumber, tokenString: String, expiry: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let tokenTypeAsInt = tokenTypeNumber.intValue
    let tokenStorageService = KeychainTokenStorageService()
    let storage = StorageService()
    let account: Account? = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    guard let currentAccount = account else {
      reject("E_ACCOUNT_NOT_FOUND", "Account or clientID not found.", nil)
      return
    }

    guard let tokenType = TokenType(rawValue: tokenTypeAsInt) else {
      reject("E_INVALID_TOKEN_TYPE", "Invalid token type number: \(tokenTypeAsInt)", nil)
      return
    }

    let tokenId = "\(currentAccount.clientID)/tokens/\(tokenType.rawValue)/1"

    // Create expiry date if provided (negative value means no expiry)
    var expiryDate: Date? = nil
    let expiryValue = expiry.doubleValue
    if expiryValue > 0 {
      expiryDate = Date(timeIntervalSince1970: expiryValue)
    }

    let token = Token(
      id: tokenId,
      type: tokenType,
      token: tokenString,
      created: Date(),
      expiry: expiryDate
    )

    let success = tokenStorageService.save(token: token)

    if success {
      logger.log("setToken: Successfully saved token of type \(tokenType) with id: \(tokenId)")
      resolve(true)
    } else {
      logger.error("setToken: Failed to save token of type \(tokenType) with id: \(tokenId)")
      reject("E_TOKEN_SAVE_FAILED", "Failed to save token to keychain", nil)
    }
  }

  /// Deletes a token from secure keychain storage.
  ///
  /// - Parameters:
  ///   - tokenTypeNumber: The token type (0=Access, 1=Refresh, 2=Registration)
  ///   - resolve: Returns true if deleted successfully
  ///   - reject: Returns error on failure

  func deleteToken(
    _ tokenTypeNumber: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let tokenTypeAsInt = tokenTypeNumber.intValue
    let tokenStorageService = KeychainTokenStorageService()
    let storage = StorageService()
    let account: Account? = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    guard let currentAccount = account else {
      reject("E_ACCOUNT_NOT_FOUND", "Account or clientID not found.", nil)
      return
    }

    guard let tokenType = TokenType(rawValue: tokenTypeAsInt) else {
      reject("E_INVALID_TOKEN_TYPE", "Invalid token type number: \(tokenTypeAsInt)", nil)
      return
    }

    let tokenId = "\(currentAccount.clientID)/tokens/\(tokenType.rawValue)/1"

    let success = tokenStorageService.delete(id: tokenId)

    if success {
      logger.log("deleteToken: Successfully deleted token of type \(tokenType)")
      resolve(true)
    } else {
      // Token might not exist, which is okay
      logger.log("deleteToken: Token of type \(tokenType) not found or already deleted")
      resolve(true)
    }
  }

  /// Creates a JWT for evidence request using device code and client ID.
  ///
  /// - Parameters:
  ///   - deviceCode: The device code to include in the JWT.
  ///   - clientID: The client ID to include in the JWT.
  /// - Resolves: The hashed string in hexadecimal format.
  /// - Rejects: An error if the input is not valid base64 or if hashing fails.

  func createPreVerificationJWT(
    _ deviceCode: String, clientID: String, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let builder = JWTClaimsSet.builder()
    builder.claim(name: "device_code", value: deviceCode)
      .claim(name: "client_id", value: clientID)

    let payload = builder.build()
    guard let serializedJWT = signJWT(payload: payload, reject: reject) else {
      reject(
        "E_INVALID_ACCOUNT_DATA",
        "Account must have an 'issuer', 'clientID' and 'securityMethod' fields",
        nil
      ) // Error already handled by signJWT
      return
    }
    resolve(serializedJWT)
  }

  /// Creates a JWT for evidence request using device code and client ID.
  ///
  /// - Parameters:
  ///   - claims: The raw claims as a dictionary
  /// - Resolves: The hashed string in hexadecimal format.
  /// - Rejects: An error if the input is not valid base64 or if hashing fails.

  func createSignedJWT(
    _ claims: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let builder = JWTClaimsSet.builder()

    // Add any additional claims
    for (key, value) in claims {
      logger.log("\(key), \(value)")
      builder.claim(name: key as! String, value: value)
    }

    let payload = builder.build()

    guard let serializedJWT = signJWT(payload: payload, reject: reject) else {
      return // Error already handled by signJWT
    }

    resolve(serializedJWT)
  }

  func setAccount(
    _ account: NSDictionary, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    logger.log("setAccount called with account: \(account)")
    let storage = StorageService()

    // Extract required fields from the dictionary
    guard let issuer = account["issuer"] as? String, let clientID = account["clientID"] as? String,
          let securityMethod = AccountSecurityMethod(rawValue: account["securityMethod"] as! String)
    else {
      reject(
        "E_INVALID_ACCOUNT_DATA",
        "Account must have an 'issuer', 'clientID' and 'securityMethod' fields", nil
      )
      return
    }

    // Check if an account already exists
    let existingAccount: Account? = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    let accountToSave: Account
    let accountID: String

    if let existing = existingAccount {
      // Update existing account - preserve the ID and update fields
      logger.log("setAccount - Updating existing account with ID: \(existing.id)")
      accountID = existing.id
      accountToSave = existing

      // Update fields
      accountToSave.clientID = clientID
      accountToSave.issuer = issuer
      accountToSave.securityMethod = securityMethod
      if let displayName = account["displayName"] as? String {
        accountToSave.displayName = displayName
      }
      if let didPostNicknameToServer = account["didPostNicknameToServer"] as? Bool {
        accountToSave.didPostNicknameToServer = didPostNicknameToServer
      }

      if let nickname = account["nickname"] as? String {
        accountToSave.nickname = nickname
      }
      if let failedAttemptCount = account["failedAttemptCount"] as? Int {
        accountToSave.failedAttemptCount = failedAttemptCount
      }
    } else {
      // Create new account with new ID
      logger.log("setAccount - Creating new account")
      accountID = UUID().uuidString
      accountToSave = Account(
        id: accountID, clientID: clientID, issuer: issuer, securityMethod: securityMethod
      )

      if let displayName = account["displayName"] as? String {
        accountToSave.displayName = displayName
      }

      if let didPostNicknameToServer = account["didPostNicknameToServer"] as? Bool {
        accountToSave.didPostNicknameToServer = didPostNicknameToServer
      }

      if let nickname = account["nickname"] as? String {
        accountToSave.nickname = nickname
      }


      if let failedAttemptCount = account["failedAttemptCount"] as? Int {
        accountToSave.failedAttemptCount = failedAttemptCount
      }

      // Ensure account structure exists before writing
      do {
        try storage.updateAccountListEntry(accountID: accountID)
        logger.log("setAccount - Account list entry updated for ID: \(accountID)")
      } catch {
        reject(
          "E_UPDATE_ACCOUNT_LIST_ENTRY_FAILED",
          "Failed to update account list entry: \(error.localizedDescription)", error
        )
        return
      }
    }

    // Create a fresh storage instance to ensure currentAccountID is read from the updated file
    let writeStorage = StorageService()

    // Verify currentAccountID is now set (for new accounts) or still valid (for updates)
    guard let verifiedAccountID = writeStorage.currentAccountID else {
      reject("E_ACCOUNT_ID_NOT_SET", "Failed to set current account ID in storage", nil)
      return
    }

    logger.log("setAccount - Verified current account ID: \(verifiedAccountID)")

    let success = writeStorage.writeData(
      data: accountToSave,
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    if success {
      logger.log("setAccount - Account successfully stored with ID: \(accountID)")
      resolve(nil)
    } else {
      reject("E_ACCOUNT_STORAGE_FAILED", "Failed to store account data", nil)
    }
  }

  func getAccount(
    _ resolve: @escaping RCTPromiseResolveBlock, reject _: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService() // Changed from PersistentStorage
    let account: Account? = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    if let acc = account {
      let result: [String: Any?] = [
        "id": acc.id,
        "issuer": acc.issuer,
        "clientID": acc.clientID,
        // "_securityMethod": acc._securityMethod, // Question (Al): why is this commented out?
        "displayName": acc.displayName,
        "didPostNicknameToServer": acc.didPostNicknameToServer,
        "nickname": acc.nickname,
        "failedAttemptCount": acc.failedAttemptCount,
        // "lastAttemptDate": acc.lastAttemptDate?.timeIntervalSince1970, // Convert Date to timestamp or nil
        // penalties is a computed property and might not be directly encodable or needed.
        // If it's needed, it requires specific handling to convert to a plist-compatible format.
      ]
      resolve(result)
    } else {
      resolve(nil)
    }
  }

  /// Remove the current account and all related files.
  ///
  /// - Parameters:
  ///   - resolve: Called when the account is successfully removed (returns nil).
  ///   - reject: Called with an error if the account ID is missing/invalid or if account file removal fails.

  func removeAccount(
    _ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()
    guard let accountID = storage.currentAccountID else {
      reject(
        "E_MISSING_INVALID_ACCOUNT_ID",
        "Account ID is missing or invalid", nil
      )
      return
    }

    // Try to delete PIN from keychain before removing account files
    // We need the account data to get the issuer for the PIN secret ID
    if let account: Account = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    ) {
      let pinService = PINService()
      do {
        try pinService.deletePIN(issuer: account.issuer, accountID: account.id)
        logger.info("PIN deleted for account \(accountID)")
      } catch {
        // PIN might not exist, that's ok - continue with account removal
        logger.warning("Could not delete PIN (may not exist): \(error.localizedDescription)")
      }
    }

    let isDeleted = storage.removeAccountFiles(accountID: accountID)

    if !isDeleted {
      reject(
        "E_FAILED_TO_DELETE_ACCOUNT",
        "Failed to remove account files", nil
      )
      return
    }

    // account deleted successfully
    resolve(nil)
  }

  func getDeviceId(_ resolve: @escaping RCTPromiseResolveBlock, reject _: @escaping RCTPromiseRejectBlock) {
    // Use the same device ID method as ias-ios
    let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? ""

    if deviceId.isEmpty {
      // Fallback to a generated UUID if identifierForVendor is not available
      let fallbackId = UUID().uuidString
      logger.warning("identifierForVendor not available, using fallback UUID: \(fallbackId)")
      resolve(fallbackId)
    } else {
      logger.info("Retrieved device ID from identifierForVendor")
      resolve(deviceId)
    }
  }

  func getRefreshTokenRequestBody(
    _ issuer: String, clientID: String, refreshToken: String,
    resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
  ) {
    // Validate all parameters are provided
    guard !issuer.isEmpty, !clientID.isEmpty, !refreshToken.isEmpty else {
      reject(
        "E_INVALID_PARAMETERS",
        "All parameters (issuer, clientID, refreshToken) are required and cannot be empty.", nil
      )
      return
    }

    let assertionType = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
    let grantType = "refresh_token"

    // Create the client assertion JWT using the helper function
    guard let serializedJWT = createClientAssertionJWT(
      audience: issuer, issuer: clientID, subject: clientID, reject: reject
    )
    else {
      return // Error already handled by createClientAssertionJWT
    }

    // Construct the body for the refresh token request using the provided refreshToken
    let body =
      "grant_type=\(grantType)&client_id=\(clientID)&client_assertion_type=\(assertionType)&client_assertion=\(serializedJWT)&refresh_token=\(refreshToken)"

    resolve(body)
  }

  func signPairingCode(
    _ code: String, issuer: String, clientID: String, fcmDeviceToken: String, deviceToken: String?,
    resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
  ) {
    let hasOtherAccounts = false
    let accountSecurityMethod: AccountSecurityMethod? = nil

    // Use empty string if deviceToken is not provided
    let actualDeviceToken = deviceToken ?? ""

    let seconds = Int(Date().timeIntervalSince1970)
    let builder = JWTClaimsSet.builder()

    // Add standard claims
    builder
      .claim(name: "aud", value: issuer)
      .claim(name: "iss", value: clientID)
      .claim(name: "iat", value: seconds)
      .claim(name: "challenge", value: code)
      .claim(name: "challenge_source", value: ChallengeSource.remote_pairing_code.rawValue)
      .claim(name: "apns_token", value: actualDeviceToken)

    // Add device info claims using consolidated method
    addDeviceInfoClaims(to: builder, fcmDeviceToken: fcmDeviceToken, deviceToken: actualDeviceToken)

    // Add additional pairing-specific claims
    builder.claim(name: DeviceInfoKeys.hasOtherAccounts, value: hasOtherAccounts)

    if let securityMethod = accountSecurityMethod {
      builder.claim(name: DeviceInfoKeys.appSecurityOption, value: securityMethod.rawValue)
    }

    let payload = builder.build()

    if let signedJWT = signJWT(payload: payload, reject: reject) {
      resolve(signedJWT)
    }
  }

  func getDynamicClientRegistrationBody(
    _ fcmDeviceToken: NSString, deviceToken: NSString?, attestation: NSString?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let keyPairManager = KeyPairManager()
    let keys = keyPairManager.findAllPrivateKeys()
    let hasOtherAccounts = false
    let accountSecurityMethod: AccountSecurityMethod? = nil
    let keyPair: (public: SecKey, private: SecKey)
    let keyId: String

    //    clearKeychain()

    if let latestKeyInfo = keys.sorted(by: { $0.created > $1.created }).first {
      // Use existing latest key
      do {
        keyPair = try keyPairManager.getKeyPair(with: latestKeyInfo.tag)
        keyId = latestKeyInfo.tag
      } catch {
        reject(
          "E_GET_KEYPAIR_FAILED", "Failed to retrieve key pair: \(error.localizedDescription)",
          error
        )
        return
      }
    } else {
      // No keys found, generate a new one
      guard let newKeyId = generateKeyPair() else {
        reject(
          "E_KEY_GENERATION_FAILED",
          "Failed to generate or retrieve key pair for client registration", nil
        )
        return
      }

      do {
        keyPair = try keyPairManager.getKeyPair(with: newKeyId)
        keyId = newKeyId
      } catch {
        reject(
          "E_GET_KEYPAIR_FAILED",
          "Failed to retrieve newly generated key pair: \(error.localizedDescription)", error
        )
        return
      }
    }

    // Extract RSA components using RSAUtil
    guard let keyData = RSAUtil.secKeyRefToData(inputKey: keyPair.public) else {
      reject("E_KEY_DATA_EXTRACTION_FAILED", "Failed to extract key data from public key", nil)
      return
    }

    guard let (modulus, exponent) = RSAUtil.splitIntoComponents(keyData: keyData) else {
      reject("E_KEY_COMPONENT_PARSING_FAILED", "Failed to parse RSA components from key data", nil)
      return
    }

    // Device info JWT
    let builder = JWTClaimsSet.builder()

    // Add device info claims using consolidated method
    addDeviceInfoClaims(
      to: builder, fcmDeviceToken: fcmDeviceToken as String, deviceToken: deviceToken as String?
    )

    // Add additional client registration specific claims
    builder.claim(name: DeviceInfoKeys.hasOtherAccounts, value: hasOtherAccounts)

    if let securityMethod = accountSecurityMethod {
      builder.claim(name: DeviceInfoKeys.appSecurityOption, value: securityMethod.rawValue)
    }

    // Add attestation if provided
    if let attestation = attestation, !(attestation as String).isEmpty {
      builder.claim(name: "attestation", value: attestation as String)
    }

    let deviceInfoClaims = builder.build()
    let deviceInfoJWT = JWS(
      header: JWSHeader(alg: JWSAlgorithm("none"), kid: ""), payload: deviceInfoClaims
    )

    // Convert device info JWT to JSON string
    guard let deviceInfoJWTAsString = try? deviceInfoJWT.serialize() else {
      reject(
        "E_DEVICE_INFO_JWT_CONVERSION_FAILED", "Failed to convert device info JWT to JSON string",
        nil
      )
      return
    }

    // Create client registration data with real values
    let clientRegistrationData: [String: Any] = [
      "client_name": UIDevice.current.name,
      "device_info": deviceInfoJWTAsString,
      "token_endpoint_auth_method": "private_key_jwt",
      "jwks": [
        "keys": [
          [
            "n": modulus.base64EncodedString(),
            "kid": keyId,
            "alg": "RS512",
            "kty": "RSA",
            "e": exponent.base64EncodedString(),
          ],
        ],
      ],
      "grant_types": [
        "authorization_code",
      ],
      "application_type": "native",
      "redirect_uris": [
        "http://localhost:8080/",
      ],
    ]

    do {
      // logger.log("BcscCore: getDynamicClientRegistrationBody - Client Registration Data: \(clientRegistrationData)")
      let jsonData = try JSONSerialization.data(withJSONObject: clientRegistrationData, options: [])
      let jsonString = String(data: jsonData, encoding: .utf8) ?? "{}"

      resolve(jsonString)
    } catch {
      reject(
        "E_JSON_SERIALIZATION_FAILED",
        "Failed to serialize client registration data: \(error.localizedDescription)", error
      )
    }
  }

  func getDeviceCodeRequestBody(
    _ deviceCode: String, clientID: String, issuer: String, confirmationCode: String,
    resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
  ) {
    let grantType = "urn:ietf:params:oauth:grant-type:device_code"
    let assertionType = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"

    // Validate all parameters are provided
    guard !deviceCode.isEmpty, !clientID.isEmpty, !issuer.isEmpty, !confirmationCode.isEmpty else {
      reject(
        "E_INVALID_PARAMETERS",
        "All parameters (deviceCode, clientID, issuer, confirmationCode) are required and cannot be empty.",
        nil
      )
      return
    }

    // Create the client assertion JWT using the helper function with additional code claim
    let additionalClaims = ["code": confirmationCode]
    guard let serializedJWT = createClientAssertionJWT(
      audience: issuer, issuer: clientID, subject: clientID, additionalClaims: additionalClaims,
      reject: reject
    )
    else {
      return // Error already handled by createClientAssertionJWT
    }

    // Construct the body for the device code request using the provided information
    let body =
      "grant_type=\(grantType)&device_code=\(deviceCode)&code=\(confirmationCode)&client_id=\(clientID)&client_assertion_type=\(assertionType)&client_assertion=\(serializedJWT)"

    resolve(body)
  }

  /// Decodes a JWE string payload into a JWT and extracts the base64 encoded string from the JWT's payload.
  ///
  /// - Parameters:
  ///   - jweString: A string representing the JWE to decode.
  ///   - resolve: The decoded JWT payload as a base64 encoded string.
  ///   - reject: An error if the JWE cannot be parsed or the payload cannot be decoded.

  func decodePayload(
    _ jweString: String, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let keyPairManager = KeyPairManager()
    let keys = keyPairManager.findAllPrivateKeys()

    guard let latestKeyInfo = keys.sorted(by: { $0.created > $1.created }).first else {
      reject("E_NO_KEYS_FOUND", "No keys available to sign the JWT.", nil)
      return
    }

    do {
      let keyPair = try keyPairManager.getKeyPair(with: latestKeyInfo.tag)
      let jwe = try JWE.parse(s: jweString)
      let decrypter = RSADecrypter(privateKey: keyPair.private)
      // Decrpyt payload into JWT
      let payload = try jwe.decrypt(withDecrypter: decrypter)

      // Break down and decode JWT
      let segments = payload.components(separatedBy: ".")
      var base64String = segments[1]
      let requiredLength = Int(4 * ceil(Float(base64String.count) / 4.0))
      let nbrPaddings = requiredLength - base64String.count
      if nbrPaddings > 0 {
        let padding = String().padding(toLength: nbrPaddings, withPad: "=", startingAt: 0)
        base64String = base64String.appending(padding)
      }
      base64String = base64String.replacingOccurrences(of: "-", with: "+")
      base64String = base64String.replacingOccurrences(of: "_", with: "/")
      let decodedData = Data(
        base64Encoded: base64String, options: Data.Base64DecodingOptions(rawValue: UInt(0))
      )

      let base64Decoded = String(
        data: decodedData! as Data,
        encoding: String.Encoding(rawValue: String.Encoding.utf8.rawValue)
      )!
      resolve(base64Decoded)
    } catch {
      reject("E_PAYLOAD_DECODE_ERROR", "Unable to decode payload", nil)
    }
  }

  /// Creates a quick login JWT assertion matching the format used in ias-ios app.
  /// This creates a signed JWT with device info claims and access token nonce, following QuickLoginProtocol pattern.
  ///
  /// - Parameters:
  ///   - accessToken: The access token to include in the nonce
  ///   - clientId: The client ID (for consistency with other methods)
  ///   - issuer: The issuer/audience for the JWT
  ///   - clientRefId: The client reference ID
  ///   - key: The JWK public key object for encryption
  ///   - fcmDeviceToken: The FCM device token for push notifications
  ///   - deviceToken: The device token (APNS token on iOS, optional)
  ///   - resolve: The signed and encrypted JWT string
  ///   - reject: An error if the JWT creation or encryption fails

  func createQuickLoginJWT(
    _ accessToken: String, clientId: String, issuer: String, clientRefId: String,
    key: NSDictionary, fcmDeviceToken: String, deviceToken: String?,
    resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !accessToken.isEmpty, !clientId.isEmpty, !issuer.isEmpty, !clientRefId.isEmpty, !fcmDeviceToken.isEmpty
    else {
      reject(
        "E_INVALID_PARAMETERS",
        "All required parameters (accessToken, clientId, issuer, clientRefId, fcmDeviceToken) cannot be empty.",
        nil
      )
      return
    }

    // Convert the JWK dictionary to JWK object
    guard let jwk = JWK(json: key) else {
      reject("E_INVALID_JWK", "Invalid JWK format provided", nil)
      return
    }

    // Convert JWK to SecKey
    guard let publicKey = JWK.jwkToSecKey(jwk: jwk) else {
      reject("E_JWK_TO_SECKEY_FAILED", "Failed to convert JWK to SecKey", nil)
      return
    }

    // Use the QuickLoginProtocol pattern from ias-ios
    guard let signedJWT = makeSignedJWTForAccountLogin(
      accessToken: accessToken,
      clientId: clientId,
      issuer: issuer,
      clientRefId: clientRefId,
      fcmDeviceToken: fcmDeviceToken,
      deviceToken: deviceToken,
      reject: reject
    )
    else {
      return // Error already handled in makeSignedJWT
    }

    logger.log("signedJWT: \(signedJWT)")

    // Encrypt the signed JWT with the provided public key
    do {
      let encryptedJWT = try encryptJWTWithPublicKey(serializedJWT: signedJWT, publicKey: publicKey, reject: reject)

      guard let finalJWT = encryptedJWT else {
        reject("E_JWT_ENCRYPTION_FAILED", "Failed to encrypt JWT", nil)
        return
      }

      resolve(finalJWT)
    } catch {
      reject(
        "E_JWT_ENCRYPTION_ERROR",
        "Failed to encrypt JWT: \(error.localizedDescription)", error
      )
    }
  }

  /// Creates a signed JWT following the ias-ios QuickLoginProtocol pattern
  private func makeSignedJWTForAccountLogin(
    accessToken: String,
    clientId: String,
    issuer: String,
    clientRefId: String,
    fcmDeviceToken: String,
    deviceToken: String?,
    reject: @escaping RCTPromiseRejectBlock
  ) -> String? {
    do {
      guard let payload = makeJWTPayloadForAccountLogin(
        accessToken: accessToken,
        clientId: clientId,
        issuer: issuer,
        clientRefId: clientRefId,
        fcmDeviceToken: fcmDeviceToken,
        deviceToken: deviceToken
      )
      else {
        reject("E_JWT_PAYLOAD_CREATION_FAILED", "Failed to create JWT payload", nil)
        return nil
      }

      return signJWT(payload: payload, reject: reject)
    } catch {
      reject(
        "E_JWT_CREATION_FAILED",
        "Failed to create account login JWT: \(error.localizedDescription)", error
      )
      return nil
    }
  }

  /// Creates JWT payload following the ias-ios QuickLoginProtocol pattern
  private func makeJWTPayloadForAccountLogin(
    accessToken: String,
    clientId: String,
    issuer: String,
    clientRefId: String,
    fcmDeviceToken: String,
    deviceToken: String?
  ) -> JWTClaimsSet? {
    let randomUDID = UUID().uuidString.lowercased()
    let seconds = Int(Date().timeIntervalSince1970)

    // Calculate HMAC nonce using the same pattern as ias-ios AssertionFactory
    let hmac = assertionFactoryHMAC(
      accessToken: accessToken, jwtID: randomUDID, clientID: clientId
    )

    let builder = JWTClaimsSet.builder()

    // Add device info claims first (matching ias-ios pattern)
    if !addDeviceInfoClaims(to: builder, fcmDeviceToken: fcmDeviceToken, deviceToken: deviceToken) {
      return nil
    }

    // Add standard claims matching ias-ios format
    builder.claim(name: "aud", value: issuer)
      .claim(name: "iss", value: clientId.lowercased())
      .claim(name: "client_ref_id", value: clientRefId)
      .claim(name: "nonce", value: hmac)
      .claim(name: "iat", value: seconds)
      .claim(name: "jti", value: randomUDID)

    return builder.build()
  }

  /// HMAC calculation matching ias-ios AssertionFactory.commonCryptoHMAC
  private func assertionFactoryHMAC(accessToken: String, jwtID: String, clientID: String) -> String {
    let accessTokenBytes: [UInt8] = Array(accessToken.utf8)
    let clientIdBytes: [UInt8] = Array(clientID.lowercased().utf8) // Lowercase here to match ias-ios
    let jwtIdBytes: [UInt8] = Array(jwtID.utf8)

    let macOut = UnsafeMutablePointer<UInt8>.allocate(capacity: Int(CC_SHA256_DIGEST_LENGTH))

    defer {
      macOut.deallocate()
    }

    var ctx = CCHmacContext()

    CCHmacInit(&ctx, CCHmacAlgorithm(kCCHmacAlgSHA256), accessTokenBytes, accessTokenBytes.count)
    CCHmacUpdate(&ctx, clientIdBytes, clientIdBytes.count)
    CCHmacUpdate(&ctx, jwtIdBytes, jwtIdBytes.count)
    CCHmacFinal(&ctx, macOut)

    let hmacData = Data(bytes: macOut, count: Int(CC_SHA256_DIGEST_LENGTH))
    return hmacData.base64EncodedString()
  }

  /// Encrypt JWT with public key using provided SecKey
  private func encryptJWTWithPublicKey(
    serializedJWT: String,
    publicKey: SecKey,
    reject _: @escaping RCTPromiseRejectBlock
  ) throws -> String? {
    do {
      let jwe = try JWE(
        header: JWEHeader(alg: JWEAlgorithm.RSA1_5, enc: EncryptionMethod.A128CBC_HS256),
        payload: serializedJWT
      )
      let encrypter = RSAEncrypter(publicKey: publicKey)

      try jwe.encrypt(withEncrypter: encrypter)
      return try jwe.serialize()
    } catch {
      throw error
    }
  }

  /// Helper method to add device info claims to JWT builder (used by all methods)
  @discardableResult
  private func addDeviceInfoClaims(
    to builder: JWTClaimsSet.Builder, fcmDeviceToken _: String, deviceToken: String?
  ) -> Bool {
    guard let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString")
      as? String,
      let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
    else {
      return false
    }

    let actualDeviceToken = deviceToken ?? ""
    let appSetId = UIDevice.current.identifierForVendor?.uuidString ?? ""

    builder.claim(name: DeviceInfoKeys.systemName, value: BcscCore.generalizedOsName)
      .claim(name: DeviceInfoKeys.systemVersion, value: UIDevice.current.systemVersion)
      .claim(name: DeviceInfoKeys.deviceName, value: UIDevice.current.name)
      .claim(
        name: DeviceInfoKeys.deviceID, value: getDeviceIdSync()
      )
      .claim(name: DeviceInfoKeys.deviceModel, value: UIDevice.current.model)
      .claim(name: DeviceInfoKeys.deviceToken, value: actualDeviceToken)
      .claim(name: DeviceInfoKeys.appVersion, value: version)
      .claim(name: DeviceInfoKeys.appBuild, value: build)
      .claim(name: DeviceInfoKeys.appSetID, value: appSetId)
    // .claim(name: DeviceInfoKeys.fcmDeviceToken, value: fcmDeviceToken)

    return true
  }

  /// Hashes a base64 encoded string using SHA-256 and returns the hash as a hex string.
  ///
  /// - Parameters:
  ///   - base64: The base64 encoded string to hash.
  ///   - resolve: The hashed string in hexadecimal format.
  ///   - reject: An error if the input is not valid base64 or if hashing fails.

  func hashBase64(
    _ base64: String, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let data = Data(base64Encoded: base64) else {
      reject("E_INVALID_BASE64", "Input is not valid base64", nil)
      return
    }
    var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
    data.withUnsafeBytes {
      _ = CC_SHA256($0, CC_LONG(data.count), &hash)
    }
    let hashedData = Data(hash)
    let hashString = hashedData.map { String(format: "%02hhx", $0) }.joined()

    resolve(hashString)
  }

  // MARK: - PIN Authentication Methods

  /// Sets a PIN for the current account
  /// - Parameters:
  ///   - pin: The PIN to set (should be validated on JS side)
  ///   - resolve: Returns PINSetupResult with success, walletKey, and isAutoGenerated
  ///   - reject: Returns error on failure

  func setPIN(
    _ pin: String, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !pin.isEmpty else {
      reject("E_INVALID_PARAMETERS", "PIN cannot be empty", nil)
      return
    }

    let storage = StorageService()
    guard let account: Account = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )
    else {
      reject("E_ACCOUNT_NOT_FOUND", "Account not found", nil)
      return
    }

    let pinService = PINService()

    do {
      let walletKey = try pinService.setPIN(
        issuer: account.issuer,
        accountID: account.id,
        pin: pin,
        isAutoGenerated: false
      )
      resolve([
        "success": true,
        "walletKey": walletKey,
        "isAutoGenerated": false,
      ])
    } catch {
      reject("E_SET_PIN_FAILED", "Failed to set PIN: \(error.localizedDescription)", error)
    }
  }

  /// Verifies a PIN for the specified account
  /// - Parameters:
  ///   - accountID: The account identifier
  ///   - pin: The PIN to verify
  ///   - resolve: Returns verification result object with walletKey on success
  ///   - reject: Returns error on failure

  func verifyPIN(
    _ pin: String, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !pin.isEmpty else {
      reject("E_INVALID_PARAMETERS", "PIN cannot be empty", nil)
      return
    }

    let storage = StorageService()
    guard let account: Account = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )
    else {
      reject("E_ACCOUNT_NOT_FOUND", "Account not found", nil)
      return
    }

    let pinService = PINService()
    let walletKey = pinService.verifyPINAndGetHash(issuer: account.issuer, accountID: account.id, pin: pin)
    let isSuccess = walletKey != nil

    // Use account's verifyPIN for penalty tracking
    let result = account.verifyPIN(pin)

    // Save updated account (with updated penalty state)
    let success = storage.writeData(
      data: account,
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    if !success {
      logger.warning("Failed to save account state after PIN verification")
    }

    switch result {
    case .success:
      resolve([
        "success": true,
        "locked": false,
        "remainingTime": 0,
        "walletKey": walletKey ?? "",
      ])
    case let .failedWithAlert(title, message):
      resolve([
        "success": false,
        "locked": false,
        "remainingTime": 0,
        "title": title,
        "message": message,
      ])
    case let .failedWithPenalty(remainingTime):
      resolve([
        "success": false,
        "locked": true,
        "remainingTime": max(0, remainingTime),
      ])
    }
  }

  /// Deletes the PIN for the specified account
  /// - Parameters:
  ///   - accountID: The account identifier
  ///   - resolve: Returns true on success
  ///   - reject: Returns error on failure

  func deletePIN(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()
    guard let account: Account = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )
    else {
      reject("E_ACCOUNT_NOT_FOUND", "Account not found", nil)
      return
    }

    let pinService = PINService()

    do {
      try pinService.deletePIN(issuer: account.issuer, accountID: account.id)
      resolve(true)
    } catch {
      reject("E_DELETE_PIN_FAILED", "Failed to delete PIN: \(error.localizedDescription)", error)
    }
  }

  /// Checks if a PIN is set for the specified account
  /// - Parameters:
  ///   - accountID: The account identifier
  ///   - resolve: Returns true if PIN is set, false otherwise
  ///   - reject: Returns error on failure

  func hasPINSet(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()
    guard let account: Account = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )
    else {
      reject("E_ACCOUNT_NOT_FOUND", "Account not found", nil)
      return
    }

    let hasPIN = account.hasPINSetup()
    resolve(hasPIN)
  }

  // MARK: - Device Authentication Methods

  /// Performs device authentication (biometric or passcode)
  /// - Parameters:
  ///   - reason: Optional reason string for the authentication prompt
  ///   - resolve: Returns true on successful authentication
  ///   - reject: Returns error on failure

  func performDeviceAuthentication(
    _ reason: String?, resolve: @escaping RCTPromiseResolveBlock,
    reject _: @escaping RCTPromiseRejectBlock
  ) {
    let authReason = reason ?? "Authentication required"
    let deviceAuthService = DeviceAuthService()

    Task {
      let success = await deviceAuthService.performAuthentication(reason: authReason)

      await MainActor.run {
        resolve(success)
      }
    }
  }

  /// Checks if device authentication is available
  /// - Parameters:
  ///   - resolve: Returns true if device authentication is available
  ///   - reject: Returns error on failure

  func canPerformDeviceAuthentication(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject _: @escaping RCTPromiseRejectBlock
  ) {
    let deviceAuthService = DeviceAuthService()
    let canPerform = deviceAuthService.canPerformAuthentication()
    resolve(canPerform)
  }

  /// Gets the available biometric type
  /// - Parameters:
  ///   - resolve: Returns biometric type: 'none', 'touchID', 'faceID', or 'opticID'
  ///   - reject: Returns error on failure

  func getAvailableBiometricType(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject _: @escaping RCTPromiseRejectBlock
  ) {
    let deviceAuthService = DeviceAuthService()
    let biometricType = deviceAuthService.getBiometricType()
    resolve(biometricType.rawValue)
  }

  /// Checks if biometric authentication (not including passcode) is available
  /// - Parameters:
  ///   - resolve: Returns true if biometric authentication is available
  ///   - reject: Returns error on failure

  func canPerformBiometricAuthentication(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject _: @escaping RCTPromiseRejectBlock
  ) {
    let deviceAuthService = DeviceAuthService()
    let canPerform = deviceAuthService.canPerformBiometricAuthentication()
    resolve(canPerform)
  }

  // MARK: - Account Security Methods

  /// Sets the security method for the specified account
  /// - Parameters:
  ///   - accountID: The account identifier
  ///   - securityMethod: The security method ('device_authentication', 'app_pin_no_device_authn',
  /// 'app_pin_has_device_authn')
  ///   - resolve: Returns true on success
  ///   - reject: Returns error on failure

  func setAccountSecurityMethod(
    _ securityMethod: String, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !securityMethod.isEmpty else {
      reject("E_INVALID_PARAMETERS", "securityMethod cannot be empty", nil)
      return
    }

    guard let method = AccountSecurityMethod(rawValue: securityMethod) else {
      reject("E_INVALID_SECURITY_METHOD", "Invalid security method: \(securityMethod)", nil)
      return
    }

    let storage = StorageService()
    guard let account: Account = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )
    else {
      reject("E_ACCOUNT_NOT_FOUND", "Account not found", nil)
      return
    }

    account.securityMethod = method

    let success = storage.writeData(
      data: account,
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    if success {
      resolve(true)
    } else {
      reject("E_SAVE_ACCOUNT_FAILED", "Failed to save account with new security method", nil)
    }
  }

  /// Gets the security method for the specified account
  /// - Parameters:
  ///   - accountID: The account identifier
  ///   - resolve: Returns the security method string
  ///   - reject: Returns error on failure

  func getAccountSecurityMethod(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()
    guard let account: Account = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )
    else {
      reject("E_ACCOUNT_NOT_FOUND", "Account not found", nil)
      return
    }

    let securityMethod = account.securityMethod.rawValue
    resolve(securityMethod)
  }

  /// Checks if the account is currently locked due to failed PIN attempts
  /// - Parameters:
  ///   - accountID: The account identifier
  ///   - resolve: Returns lock status object with locked boolean and remaining time
  ///   - reject: Returns error on failure

  func isAccountLocked(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()
    guard let account: Account = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )
    else {
      reject("E_ACCOUNT_NOT_FOUND", "Account not found", nil)
      return
    }

    let remainingTime = account.isServingPenalty()
    let isLocked = remainingTime > 0

    resolve(["locked": isLocked, "remainingTime": max(0, remainingTime)])
  }

  // MARK: - Device Security Methods

  /// Generates a random 6-digit PIN for internal use
  private func generateRandomPIN() -> String {
    let randomBytes = SecureRandom.nextBytes(count: 6)
    var pinDigits = ""
    for i in 0 ..< 6 {
      let digit = Int(randomBytes[i]) % 10
      pinDigits += String(digit)
    }
    return pinDigits
  }

  /// Sets up device security by generating a random PIN internally and storing its hash
  /// - Parameters:
  ///   - accountID: The account identifier
  ///   - resolve: Returns PINSetupResult with success, walletKey, and isAutoGenerated=true
  ///   - reject: Returns error on failure

  func setupDeviceSecurity(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()
    guard let account: Account = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )
    else {
      reject("E_ACCOUNT_NOT_FOUND", "Account not found", nil)
      return
    }

    let pinService = PINService()

    do {
      // Generate random PIN internally - user never sees this
      let randomPIN = generateRandomPIN()

      // Store with isAutoGenerated flag set to true
      let walletKey = try pinService.setPIN(
        issuer: account.issuer,
        accountID: account.id,
        pin: randomPIN,
        isAutoGenerated: true
      )

      resolve([
        "success": true,
        "walletKey": walletKey,
        "isAutoGenerated": true,
      ])
    } catch {
      reject("E_SETUP_DEVICE_SECURITY_FAILED", "Failed to setup device security: \(error.localizedDescription)", error)
    }
  }

  /// Unlocks using device security and returns the wallet key
  /// - Parameters:
  ///   - accountID: The account identifier
  ///   - reason: Optional reason string for the biometric prompt
  ///   - resolve: Returns DeviceSecurityUnlockResult with success and walletKey
  ///   - reject: Returns error on failure

  func unlockWithDeviceSecurity(
    _ reason: String?, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()
    guard let account: Account = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )
    else {
      reject("E_ACCOUNT_NOT_FOUND", "Account not found", nil)
      return
    }

    let authReason = reason ?? "Authenticate to unlock"

    Task { @MainActor in
      let context = LAContext()
      var error: NSError?

      guard LAContext.canPerformLocalAuthenticate(context: context, error: &error) else {
        resolve([
          "success": false,
        ])
        return
      }

      let authSuccess: Bool
      do {
        authSuccess = try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: authReason)
      } catch {
        print("Local Authentication error: ", error.localizedDescription)
        resolve([
          "success": false,
        ])
        return
      }

      if authSuccess {
        // Get the stored wallet key hash
        let pinService = PINService()
        if let hashResult = pinService.getPINHash(issuer: account.issuer, accountID: account.id) {
          resolve([
            "success": true,
            "walletKey": hashResult.hash,
          ])
        } else {
          // No PIN hash found - this is a v3 migration scenario
          // User had device security but no random PIN. Generate one now.
          do {
            var randomBytes = [UInt8](repeating: 0, count: 6)
            let status = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
            guard status == errSecSuccess else {
              reject("E_RANDOM_GENERATION_FAILED", "Failed to generate secure random bytes", nil)
              return
            }

            let pin = randomBytes.map { String($0 % 10) }.joined()
            let hash = try pinService.setPIN(
              issuer: account.issuer,
              accountID: account.id,
              pin: pin,
              isAutoGenerated: true
            )
            resolve([
              "success": true,
              "walletKey": hash,
              "migrated": true,
            ])
          } catch {
            reject("E_MIGRATION_FAILED", "Failed to migrate v3 user: \(error.localizedDescription)", error)
          }
        }
      } else {
        resolve([
          "success": false,
        ])
      }
    }
  }

  ///   - resolve: Returns the authorization request as a dictionary, or null if not found
  ///   - reject: Returns error on failure

  func getAuthorizationRequest(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject _: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()

    // Register Address class for decoding
    let prodAddressClass = "bc_services_card.Address"
    let devAddressClass = "bc_services_card_dev.Address"
    NSKeyedUnarchiver.setClass(Address.self, forClassName: prodAddressClass)
    NSKeyedUnarchiver.setClass(Address.self, forClassName: devAddressClass)

    guard let authRequest: AuthorizationRequest = storage.readData(
      file: AccountFiles.authorizationRequest,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    ) else {
      // No authorization request stored - this is not an error
      resolve(nil)
      return
    }

    logger.log("getAuthorizationRequest: Successfully read authorization request")
    resolve(authRequest.toDictionary())
  }

  /// Saves authorization request data to storage.
  /// This writes to the authorization_request file in Application Support,
  /// which is the same location used by the v3 native app.
  ///
  /// - Parameters:
  ///   - data: Dictionary containing the authorization request fields
  ///   - resolve: Returns true if saved successfully
  ///   - reject: Returns error on failure

  func setAuthorizationRequest(
    _ data: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let dataDict = data as? [String: Any] else {
      reject("E_INVALID_DATA", "Data must be a dictionary", nil)
      return
    }

    let authRequest = AuthorizationRequest.fromDictionary(dataDict)
    let storage = StorageService()

    let success = storage.writeData(
      data: authRequest,
      file: AccountFiles.authorizationRequest,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    if success {
      logger.log("setAuthorizationRequest: Successfully saved authorization request")
      resolve(true)
    } else {
      reject("E_SAVE_FAILED", "Failed to save authorization request", nil)
    }
  }

  /// Deletes the stored authorization request data.
  ///
  /// - Parameters:
  ///   - resolve: Returns true if deleted successfully (or if it didn't exist)
  ///   - reject: Returns error on failure

  func deleteAuthorizationRequest(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()

    guard let accountID = storage.currentAccountID else {
      // No account, so no authorization request to delete
      resolve(true)
      return
    }

    do {
      let rootDirectoryURL = try FileManager.default.url(
        for: FileManager.SearchPathDirectory.applicationSupportDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      let fileUrl = rootDirectoryURL
        .appendingPathComponent(storage.basePath)
        .appendingPathComponent(accountID)
        .appendingPathComponent(AccountFiles.authorizationRequest.rawValue)

      if FileManager.default.fileExists(atPath: fileUrl.path) {
        try FileManager.default.removeItem(at: fileUrl)
        logger.log("deleteAuthorizationRequest: Successfully deleted authorization request file")
      } else {
        logger.log("deleteAuthorizationRequest: Authorization request file did not exist")
      }

      resolve(true)
    } catch {
      reject("E_DELETE_FAILED", "Failed to delete authorization request: \(error.localizedDescription)", error)
    }
  }

  /// Checks if the stored PIN was auto-generated (for device security) or user-created
  /// - Parameters:
  ///   - resolve: Returns true if PIN was auto-generated, false if user-created
  ///   - reject: Returns error on failure

  func isPINAutoGenerated(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()
    guard let account: Account = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )
    else {
      reject("E_ACCOUNT_NOT_FOUND", "Account not found", nil)
      return
    }

    let pinService = PINService()
    let isAutoGenerated = pinService.isPINAutoGenerated(issuer: account.issuer, accountID: account.id)
    resolve(isAutoGenerated)
  }

  // MARK: - Account Flags Storage Methods

  /// Gets account flags from storage.
  /// These are stored in the account_flag file, compatible with v3 native app.
  /// Common flags include: isEmailVerified, userSkippedEmailVerification, emailAddress
  ///
  /// - Parameters:
  ///   - resolve: Returns the flags dictionary, or empty dictionary if not found
  ///   - reject: Returns error on failure

  func getAccountFlags(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject _: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()

    guard let flags: NSDictionary = storage.readData(
      file: AccountFiles.accountFlag,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    ) else {
      // No flags stored yet - return empty dictionary
      resolve([:])
      return
    }

    // Convert to a format React Native can handle
    let result = NSMutableDictionary()
    for (key, value) in flags {
      if let stringKey = key as? String {
        result[stringKey] = value
      }
    }

    logger.log("getAccountFlags: Successfully read account flags")
    resolve(result)
  }

  /// Sets account flags in storage.
  /// These are stored in the account_flag file, compatible with v3 native app.
  ///
  /// - Parameters:
  ///   - flags: Dictionary of flags to store (merges with existing)
  ///   - resolve: Returns true if saved successfully
  ///   - reject: Returns error on failure

  func setAccountFlags(
    _ flags: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()

    // Read existing flags
    var existingFlags: [String: Any] = [:]
    if let existing: NSDictionary = storage.readData(
      file: AccountFiles.accountFlag,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    ) {
      for (key, value) in existing {
        if let stringKey = key as? String {
          existingFlags[stringKey] = value
        }
      }
    }

    // Merge with new flags
    for (key, value) in flags {
      if let stringKey = key as? String {
        existingFlags[stringKey] = value
      }
    }

    // Write back - account_flag is stored as NSDictionary
    let flagsToWrite = existingFlags as NSDictionary
    let success = storage.writeData(
      data: flagsToWrite,
      file: AccountFiles.accountFlag,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    if success {
      logger.log("setAccountFlags: Successfully saved account flags")
      resolve(true)
    } else {
      reject("E_SAVE_FAILED", "Failed to save account flags", nil)
    }
  }

  /// Deletes all account flags from storage.
  ///
  /// - Parameters:
  ///   - resolve: Returns true if deleted successfully
  ///   - reject: Returns error on failure

  func deleteAccountFlags(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()

    guard let accountID = storage.currentAccountID else {
      // No account, so no flags to delete
      resolve(true)
      return
    }

    do {
      let rootDirectoryURL = try FileManager.default.url(
        for: FileManager.SearchPathDirectory.applicationSupportDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      let fileUrl = rootDirectoryURL
        .appendingPathComponent(storage.basePath)
        .appendingPathComponent(accountID)
        .appendingPathComponent(AccountFiles.accountFlag.rawValue)

      if FileManager.default.fileExists(atPath: fileUrl.path) {
        try FileManager.default.removeItem(at: fileUrl)
        logger.log("deleteAccountFlags: Successfully deleted account flags file")
      } else {
        logger.log("deleteAccountFlags: Account flags file did not exist")
      }

      resolve(true)
    } catch {
      reject("E_DELETE_FAILED", "Failed to delete account flags: \(error.localizedDescription)", error)
    }
  }

  // MARK: - Evidence Metadata Storage Methods

  /// Gets evidence metadata from storage.
  /// Evidence metadata contains user's collected evidence during verification flow.
  /// Stored as JSON array in evidence_metadata file, per-account.
  ///
  /// - Parameters:
  ///   - resolve: Returns array of evidence metadata dictionaries
  ///   - reject: Returns error on failure

  func getEvidenceMetadata(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject _: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()

    guard let evidenceArray: NSArray = storage.readData(
      file: AccountFiles.evidenceMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    ) else {
      // No evidence metadata stored yet - return empty array
      resolve([])
      return
    }

    logger.log("getEvidenceMetadata: Successfully read evidence metadata")
    resolve(evidenceArray)
  }

  /// Sets evidence metadata in storage.
  /// Stores user's collected evidence during verification flow.
  /// Stored as JSON array in evidence_metadata file, per-account.
  ///
  /// - Parameters:
  ///   - evidence: Array of evidence metadata dictionaries
  ///   - resolve: Returns true if saved successfully
  ///   - reject: Returns error on failure

  func setEvidenceMetadata(
    _ evidence: NSArray,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()

    let success = storage.writeData(
      data: evidence,
      file: AccountFiles.evidenceMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    if success {
      logger.log("setEvidenceMetadata: Successfully saved evidence metadata")
      resolve(true)
    } else {
      reject("E_SAVE_FAILED", "Failed to save evidence metadata", nil)
    }
  }

  /// Deletes all evidence metadata from storage.
  /// Clears user's collected evidence (used on verification completion or reset).
  ///
  /// - Parameters:
  ///   - resolve: Returns true if deleted successfully
  ///   - reject: Returns error on failure

  func deleteEvidenceMetadata(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()

    guard let accountID = storage.currentAccountID else {
      // No account, so no evidence metadata to delete
      resolve(true)
      return
    }

    do {
      let rootDirectoryURL = try FileManager.default.url(
        for: FileManager.SearchPathDirectory.applicationSupportDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      let fileUrl = rootDirectoryURL
        .appendingPathComponent(storage.basePath)
        .appendingPathComponent(accountID)
        .appendingPathComponent(AccountFiles.evidenceMetadata.rawValue)

      if FileManager.default.fileExists(atPath: fileUrl.path) {
        try FileManager.default.removeItem(at: fileUrl)
        logger.log("deleteEvidenceMetadata: Successfully deleted evidence metadata file")
      } else {
        logger.log("deleteEvidenceMetadata: Evidence metadata file did not exist")
      }

      resolve(true)
    } catch {
      reject("E_DELETE_FAILED", "Failed to delete evidence metadata: \(error.localizedDescription)", error)
    }
  }

  // ============================================================================
  // MARK: - Credential Storage Methods

  // ============================================================================

  /**
   * Gets credential information from native storage.
   * iOS: Stored within ClientRegistration in the client_registration file
   * Compatible with v3 native app storage for verification state detection.
   */
  func getCredential(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      guard let accountID = StorageService().currentAccountID else {
        logger.log("getCredential: No current account ID found")
        resolve(nil)
        return
      }

      let storage = StorageService()
      let rootDirectoryURL = try FileManager.default.url(
        for: defaultSearchPathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      let fileUrl = rootDirectoryURL
        .appendingPathComponent(storage.basePath)
        .appendingPathComponent(accountID)
        .appendingPathComponent(AccountFiles.clientRegistration.rawValue)

      guard FileManager.default.fileExists(atPath: fileUrl.path) else {
        logger.log("getCredential: ClientRegistration file does not exist")
        resolve(nil)
        return
      }

      let data = try Data(contentsOf: fileUrl)
      let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
      unarchiver.setClass(ClientRegistration.self, forClassName: "\(storage.nativeModuleName).ClientRegistration")
      unarchiver.setClass(Credential.self, forClassName: "\(storage.nativeModuleName).Credential")

      guard let clientRegistration = unarchiver.decodeObject(
        of: ClientRegistration.self,
        forKey: NSKeyedArchiveRootObjectKey
      ),
        let credential = clientRegistration.credential
      else {
        logger.log("getCredential: No credential found in ClientRegistration")
        resolve(nil)
        return
      }

      // Convert credential to dictionary for React Native
      let credentialDict: [String: Any] = [
        "issuer": credential.issuer,
        "subject": credential.subject,
        "label": credential.label,
        "created": credential.created.timeIntervalSince1970,
        "bcscEvent": credential.bcscEvent,
        "bcscReason": credential.bcscReason,
        "lastUsed": credential.lastUsed?.timeIntervalSince1970 ?? NSNull(),
        "updatedDate": credential.updatedDate?.timeIntervalSince1970 ?? NSNull(),
        "bcscStatusDate": credential.bcscStatusDate?.timeIntervalSince1970 ?? NSNull(),
        "bcscEventDate": credential.bcscEventDate?.timeIntervalSince1970 ?? NSNull(),
        "devicesCount": credential.devicesCount ?? NSNull(),
        "maxDevices": credential.maxDevices ?? NSNull(),
        "cardType": credential.cardType ?? NSNull(),
        "accountType": credential.accountType ?? NSNull(),
        "acr": credential.acr ?? NSNull(),
        "cardExpiry": credential.cardExpiry ?? NSNull(),
        "cardExpiryDateString": credential.cardExpiryDateString ?? NSNull(),
        "cardExpiryWarningText": credential.cardExpiryWarningText ?? NSNull(),
        "hasShownExpiryAlert": credential.hasShownExpiryAlert,
        "hasShownFeedbackAlert": credential.hasShownFeedbackAlert,
        "accessTokenIDs": credential.accessTokenIDs ?? NSNull(),
        "refreshTokenIDs": credential.refreshTokenIDs ?? NSNull(),
        "clientID": credential.clientID ?? NSNull(),
      ]

      logger.log("getCredential: Successfully retrieved credential")
      resolve(credentialDict)
    } catch {
      reject("E_READ_FAILED", "Failed to read credential: \\(error.localizedDescription)", error)
    }
  }

  /**
   * Sets credential information in native storage.
   * iOS: Stores within ClientRegistration in the client_registration file
   * Compatible with v3 native app storage for verification state detection.
   */
  func setCredential(
    _ credentialData: [String: Any],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      guard let accountID = StorageService().currentAccountID else {
        reject("E_NO_ACCOUNT", "No current account ID found", nil)
        return
      }

      let storage = StorageService()
      let rootDirectoryURL = try FileManager.default.url(
        for: defaultSearchPathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: true
      )
      let fileUrl = rootDirectoryURL
        .appendingPathComponent(storage.basePath)
        .appendingPathComponent(accountID)
        .appendingPathComponent(AccountFiles.clientRegistration.rawValue)

      // Create the directory if it doesn't exist
      let directoryUrl = fileUrl.deletingLastPathComponent()
      try FileManager.default.createDirectory(at: directoryUrl, withIntermediateDirectories: true)

      var clientRegistration: ClientRegistration

      // Load existing ClientRegistration or create new one
      if FileManager.default.fileExists(atPath: fileUrl.path) {
        let data = try Data(contentsOf: fileUrl)
        let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
        unarchiver.setClass(ClientRegistration.self, forClassName: "\(storage.nativeModuleName).ClientRegistration")
        unarchiver.setClass(Credential.self, forClassName: "\(storage.nativeModuleName).Credential")

        if let decoded = unarchiver.decodeObject(of: ClientRegistration.self, forKey: NSKeyedArchiveRootObjectKey) {
          clientRegistration = decoded
        } else {
          clientRegistration = ClientRegistration()
        }
      } else {
        clientRegistration = ClientRegistration()
      }

      // Create credential from dictionary
      guard let issuer = credentialData["issuer"] as? String,
            let subject = credentialData["subject"] as? String,
            let label = credentialData["label"] as? String,
            let createdTimestamp = credentialData["created"] as? Double,
            let bcscEvent = credentialData["bcscEvent"] as? String,
            let bcscReason = credentialData["bcscReason"] as? String
      else {
        reject("E_INVALID_DATA", "Missing required credential fields", nil)
        return
      }

      let credential = Credential(
        issuer: issuer,
        subject: subject,
        label: label,
        created: Date(timeIntervalSince1970: createdTimestamp),
        bcscEvent: bcscEvent,
        bcscReason: bcscReason
      )

      // Set optional fields
      if let lastUsedTimestamp = credentialData["lastUsed"] as? Double {
        credential.lastUsed = Date(timeIntervalSince1970: lastUsedTimestamp)
      }
      if let updatedTimestamp = credentialData["updatedDate"] as? Double {
        credential.updatedDate = Date(timeIntervalSince1970: updatedTimestamp)
      }
      if let bcscStatusTimestamp = credentialData["bcscStatusDate"] as? Double {
        credential.bcscStatusDate = Date(timeIntervalSince1970: bcscStatusTimestamp)
      }
      if let bcscEventTimestamp = credentialData["bcscEventDate"] as? Double {
        credential.bcscEventDate = Date(timeIntervalSince1970: bcscEventTimestamp)
      }
      credential.devicesCount = credentialData["devicesCount"] as? Int
      credential.maxDevices = credentialData["maxDevices"] as? Int
      credential.cardType = credentialData["cardType"] as? String
      credential.accountType = credentialData["accountType"] as? String
      credential.acr = credentialData["acr"] as? Int
      credential.cardExpiry = credentialData["cardExpiry"] as? String
      credential.cardExpiryDateString = credentialData["cardExpiryDateString"] as? String
      credential.cardExpiryWarningText = credentialData["cardExpiryWarningText"] as? String
      credential.hasShownExpiryAlert = credentialData["hasShownExpiryAlert"] as? Bool ?? false
      credential.hasShownFeedbackAlert = credentialData["hasShownFeedbackAlert"] as? Bool ?? false
      credential.accessTokenIDs = credentialData["accessTokenIDs"] as? [String]
      credential.refreshTokenIDs = credentialData["refreshTokenIDs"] as? [String]
      credential.clientID = credentialData["clientID"] as? String

      // Set credential in ClientRegistration
      clientRegistration.credential = credential

      // Save ClientRegistration
      let archiver = NSKeyedArchiver(requiringSecureCoding: true)
      archiver.setClassName("\(storage.nativeModuleName).ClientRegistration", for: ClientRegistration.self)
      archiver.setClassName("\(storage.nativeModuleName).Credential", for: Credential.self)
      archiver.encode(clientRegistration, forKey: NSKeyedArchiveRootObjectKey)
      archiver.finishEncoding()

      try archiver.encodedData.write(to: fileUrl)

      logger.log("setCredential: Successfully saved credential")
      resolve(true)
    } catch {
      reject("E_SAVE_FAILED", "Failed to save credential: \\(error.localizedDescription)", error)
    }
  }

  /**
   * Deletes credential information from native storage.
   * This effectively marks the account as not verified
   */
  func deleteCredential(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      guard let accountID = StorageService().currentAccountID else {
        logger.log("deleteCredential: No current account ID found")
        resolve(true)
        return
      }

      let storage = StorageService()
      let rootDirectoryURL = try FileManager.default.url(
        for: defaultSearchPathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      let fileUrl = rootDirectoryURL
        .appendingPathComponent(storage.basePath)
        .appendingPathComponent(accountID)
        .appendingPathComponent(AccountFiles.clientRegistration.rawValue)

      guard FileManager.default.fileExists(atPath: fileUrl.path) else {
        logger.log("deleteCredential: ClientRegistration file does not exist")
        resolve(true)
        return
      }

      // Load existing ClientRegistration
      let data = try Data(contentsOf: fileUrl)
      let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
      unarchiver.setClass(ClientRegistration.self, forClassName: "\(storage.nativeModuleName).ClientRegistration")
      unarchiver.setClass(Credential.self, forClassName: "\(storage.nativeModuleName).Credential")

      guard let clientRegistration = unarchiver.decodeObject(
        of: ClientRegistration.self,
        forKey: NSKeyedArchiveRootObjectKey
      ) else {
        logger.log("deleteCredential: Could not decode ClientRegistration")
        resolve(true)
        return
      }

      // Remove credential from ClientRegistration
      clientRegistration.credential = nil

      // Save updated ClientRegistration
      let archiver = NSKeyedArchiver(requiringSecureCoding: true)
      archiver.setClassName("\(storage.nativeModuleName).ClientRegistration", for: ClientRegistration.self)
      archiver.encode(clientRegistration, forKey: NSKeyedArchiveRootObjectKey)
      archiver.finishEncoding()

      try archiver.encodedData.write(to: fileUrl)

      logger.log("deleteCredential: Successfully removed credential from ClientRegistration")
      resolve(true)
    } catch {
      reject("E_DELETE_FAILED", "Failed to delete credential: \\(error.localizedDescription)", error)
    }
  }

  /**
   * Checks if a credential exists without retrieving it.
   * Useful for quick verification status checks
   */
  func hasCredential(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      guard let accountID = StorageService().currentAccountID else {
        logger.log("hasCredential: No current account ID found")
        resolve(false)
        return
      }

      let storage = StorageService()
      let rootDirectoryURL = try FileManager.default.url(
        for: defaultSearchPathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      let fileUrl = rootDirectoryURL
        .appendingPathComponent(storage.basePath)
        .appendingPathComponent(accountID)
        .appendingPathComponent(AccountFiles.clientRegistration.rawValue)

      guard FileManager.default.fileExists(atPath: fileUrl.path) else {
        logger.log("hasCredential: ClientRegistration file does not exist")
        resolve(false)
        return
      }

      let data = try Data(contentsOf: fileUrl)
      let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
      unarchiver.setClass(ClientRegistration.self, forClassName: "\(storage.nativeModuleName).ClientRegistration")
      unarchiver.setClass(Credential.self, forClassName: "\(storage.nativeModuleName).Credential")

      guard let clientRegistration = unarchiver.decodeObject(
        of: ClientRegistration.self,
        forKey: NSKeyedArchiveRootObjectKey
      ) else {
        logger.log("hasCredential: Could not decode ClientRegistration")
        resolve(false)
        return
      }

      let hasCredential = clientRegistration.credential != nil
      logger.log("hasCredential: \\(hasCredential)")
      resolve(hasCredential)
    } catch {
      reject("E_CHECK_FAILED", "Failed to check credential existence: \\(error.localizedDescription)", error)
    }
  }

  /// Displays a local notification with the given title and message.
  /// Used to show foreground push notifications since they are not auto-displayed.
  /// - Parameters:
  ///   - title: The notification title
  ///   - message: The notification body message
  ///   - resolve: Resolves when the notification is scheduled
  ///   - reject: Rejects if there's an error scheduling the notification

  func showLocalNotification(
    _ title: String, message: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let content = UNMutableNotificationContent()
    content.title = title
    content.body = message
    content.sound = .default

    // Create a trigger to show immediately
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
    let request = UNNotificationRequest(
      identifier: UUID().uuidString,
      content: content,
      trigger: trigger
    )

    UNUserNotificationCenter.current().add(request) { error in
      if let error = error {
        reject("E_NOTIFICATION_ERROR", "Failed to show notification: \(error.localizedDescription)", error)
      } else {
        resolve(nil)
      }
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
