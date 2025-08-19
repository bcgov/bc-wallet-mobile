import CryptoKit
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
  static let provider = "https://idsit.gov.bc.ca/device/"
  static let clientName = "BC Services Wallet"

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // MARK: - Private Helper Methods

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
    let clientAssertionJwtExpirationSeconds = 3600  // 1 hour

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
      return nil  // Error already handled by signJWT
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
        "E_GET_KEYPAIR_FAILED", "Failed to retrieve key pair: \(error.localizedDescription)", error)
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
        "Failed to sign or serialize JWT: \(error.localizedDescription)", error)
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
        kSecAttrSynchronizable as String: kSecAttrSynchronizableAny,  // Important for iCloud Keychain items
      ]
      SecItemDelete(query as CFDictionary)
    }

    print("BcscCore: Keychain cleared for this app.")
  }

  // MARK: - Public Methods

  @objc
  func getAllKeys(
    _ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
  ) {
    let keyPairManager = KeyPairManager()
    let keys = keyPairManager.findAllPrivateKeys()

    let result = keys.map { keyInfo -> [String: Any] in
      return [
        "keyType": keyInfo.keyType.name,
        "keySize": keyInfo.keySize,
        "id": keyInfo.tag,
        "created": keyInfo.created.timeIntervalSince1970,  // Convert Date to timestamp
      ]
    }

    resolve(result)
  }

  @objc
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
          "E_KEY_EXPORT", "Failed to export public key: \(nsError.localizedDescription)", nsError)

        return
      }

      guard let privateKeyData = SecKeyCopyExternalRepresentation(keyPair.private, &error) as Data?
      else {
        // Handle error, maybe reject the promise
        let nsError = error!.takeRetainedValue() as Error
        reject(
          "E_KEY_EXPORT", "Failed to export private key: \(nsError.localizedDescription)", nsError)

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
    let initialKeyId = "\(BcscCore.provider)/\(UUID().uuidString)/1"  // Use BcscCore.provider

    if let latestKeyInfo = keys.sorted(by: { $0.created > $1.created }).first {
      let existingTag = latestKeyInfo.tag
      var components = existingTag.split(separator: "/").map(String.init)

      // Check if the tag has at least one component (the numeric suffix)
      // and if that last component can be parsed as an Int.
      if let lastNumericString = components.last, var numericSuffix = Int(lastNumericString) {
        numericSuffix += 1
        components.removeLast()  // Remove the old numeric suffix string
        let baseId = components.joined(separator: "/")  // Reconstruct the base part of the ID
        let newKeyId = "\(baseId)/\(numericSuffix)"

        print(
          "BcscCore: generateKeyPair (private) - Latest key found: \(existingTag). Attempting to generate new incremented key with ID: \(newKeyId)"
        )
        do {
          // Assuming default keyType and keySize are handled by KeyPairManager.generateKeyPair or are acceptable.
          _ = try keyPairManager.generateKeyPair(withLabel: newKeyId)
          print(
            "BcscCore: generateKeyPair (private) - Successfully generated new incremented key with ID: \(newKeyId)"
          )
          return newKeyId
        } catch {
          print(
            "BcscCore: generateKeyPair (private) - Failed to generate new incremented key with ID \(newKeyId): \(error.localizedDescription)."
          )
          return nil  // Failed to generate the specifically requested incremented key.
        }
      } else {
        // Parsing the existing tag failed (e.g., not in expected format or last part not a number).
        // Fallback: generate a completely new key using a fresh initial ID pattern.
        print(
          "BcscCore: generateKeyPair (private) - Could not parse or increment existing key tag: \(existingTag). Attempting to generate a new key with a fresh initial ID pattern."
        )
        // Use the same pattern for the new key ID as in the 'no keys found' case for consistency, but with a new UUID.
        let freshGeneratedKeyId = "\(BcscCore.provider)/\(UUID().uuidString)/1"
        print(
          "BcscCore: generateKeyPair (private) - Attempting to generate a new key with ID: \(freshGeneratedKeyId) due to parsing failure of existing key."
        )
        do {
          _ = try keyPairManager.generateKeyPair(withLabel: freshGeneratedKeyId)
          print(
            "BcscCore: generateKeyPair (private) - Successfully generated new key with ID: \(freshGeneratedKeyId) after parsing failure."
          )
          return freshGeneratedKeyId
        } catch {
          print(
            "BcscCore: generateKeyPair (private) - Failed to generate new key with ID \(freshGeneratedKeyId) after parsing failure: \(error.localizedDescription)"
          )
          return nil
        }
      }
    } else {
      // No keys found, attempt to generate a new one
      print(
        "BcscCore: generateKeyPair (private) - No keys found. Attempting to generate a new key with ID: \(initialKeyId)"
      )
      do {
        _ = try keyPairManager.generateKeyPair(withLabel: initialKeyId)  // Assuming default keyType and keySize are handled by this method or are acceptable.
        print(
          "BcscCore: generateKeyPair (private) - Successfully generated new key with ID: \(initialKeyId)"
        )
        return initialKeyId
      } catch {
        print(
          "BcscCore: generateKeyPair (private) - Failed to generate new key with ID \(initialKeyId): \(error.localizedDescription)"
        )
        return nil
      }
    }
  }

  @objc
  func getToken(
    _ tokenTypeNumber: NSNumber, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {  // Changed parameter to NSNumber
    let tokenTypeAsInt = tokenTypeNumber.intValue
    let tokenStorageService = KeychainTokenStorageService()
    let storage = StorageService()
    let account: Account? = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory)

    guard let currentAccount = account else {
      reject("E_ACCOUNT_NOT_FOUND", "Account or clientID not found.", nil)
      return
    }

    guard let tokenType = TokenType(rawValue: tokenTypeAsInt) else {
      reject("E_INVALID_TOKEN_TYPE", "Invalid token type number: \(tokenTypeAsInt)", nil)
      return
    }

    let id = "\(currentAccount.clientID)/tokens/\(tokenType.rawValue)/1"

    if let token = tokenStorageService.get(id: id) {
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
      resolve(nil)
    }
  }

  /// Creates a JWT for evidence request using device code and client ID.
  ///
  /// - Parameters:
  ///   - deviceCode: The device code to include in the JWT.
  ///   - clientID: The client ID to include in the JWT.
  /// - Resolves: The hashed string in hexadecimal format.
  /// - Rejects: An error if the input is not valid base64 or if hashing fails.
  @objc
  func createEvidenceRequestJWT(
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
        "Account must have an 'issuer', 'clientID' and 'securityMethod' fields", nil)  // Error already handled by signJWT
      return
    }
    resolve(serializedJWT)
  }

  @objc
  func setAccount(
    _ account: NSDictionary, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    print("BcscCore: setAccount called with account: \(account)")
    let accountID = UUID().uuidString
    let storage = StorageService()

    // Extract required fields from the dictionary
    guard let issuer = account["issuer"] as? String, let clientID = account["clientID"] as? String,
      let securityMethod = account["securityMethod"] as? String
    else {
      reject(
        "E_INVALID_ACCOUNT_DATA",
        "Account must have an 'issuer', 'clientID' and 'securityMethod' fields", nil)
      return
    }

    // Create Account object with required fields
    let newAccount = Account(
      id: accountID, clientID: clientID, issuer: issuer, securityMethod: securityMethod)

    if let displayName = account["displayName"] as? String {
      newAccount.displayName = displayName
    }

    if let didPostNicknameToServer = account["didPostNicknameToServer"] as? Bool {
      newAccount.didPostNicknameToServer = didPostNicknameToServer
    }

    if let nickname = account["nickname"] as? String {
      newAccount.nickname = nickname
    }

    if let failedAttemptCount = account["failedAttemptCount"] as? Int {
      newAccount.failedAttemptCount = failedAttemptCount
    }

    // Ensure account structure exists before writing
    do {
      try storage.createAccountStructureIfRequired(accountID: accountID)
    } catch {
      reject(
        "E_ACCOUNT_STRUCTURE_CREATION_FAILED",
        "Failed to create account structure: \(error.localizedDescription)", error)
      return
    }

    let success = storage.writeData(
      data: newAccount,
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory
    )

    if success {
      print("BcscCore: setAccount - Account successfully stored")
      resolve(nil)
    } else {
      reject("E_ACCOUNT_STORAGE_FAILED", "Failed to store account data", nil)
    }
  }

  @objc
  func getAccount(
    _ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
  ) {
    let storage = StorageService()  // Changed from PersistentStorage
    let account: Account? = storage.readData(
      file: AccountFiles.accountMetadata,
      pathDirectory: FileManager.SearchPathDirectory.applicationSupportDirectory)

    if let acc = account {
      let result: [String: Any?] = [
        "id": acc.id,
        "issuer": acc.issuer,
        "clientID": acc.clientID,
        // "_securityMethod": acc._securityMethod,
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

  @objc
  func getRefreshTokenRequestBody(
    _ issuer: String, clientID: String, refreshToken: String,
    resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
  ) {
    // Validate all parameters are provided
    guard !issuer.isEmpty, !clientID.isEmpty, !refreshToken.isEmpty else {
      reject(
        "E_INVALID_PARAMETERS",
        "All parameters (issuer, clientID, refreshToken) are required and cannot be empty.", nil)
      return
    }

    let assertionType = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
    let grantType = "refresh_token"

    // Create the client assertion JWT using the helper function
    guard
      let serializedJWT = createClientAssertionJWT(
        audience: issuer, issuer: clientID, subject: clientID, reject: reject)
    else {
      return  // Error already handled by createClientAssertionJWT
    }

    // Construct the body for the refresh token request using the provided refreshToken
    let body =
      "grant_type=\(grantType)&client_id=\(clientID)&client_assertion_type=\(assertionType)&client_assertion=\(serializedJWT)&refresh_token=\(refreshToken)"

    resolve(body)
  }

  @objc
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

  @objc
  func getDynamicClientRegistrationBody(
    _ fcmDeviceToken: NSString, deviceToken: NSString?, resolve: @escaping RCTPromiseResolveBlock,
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
          error)
        return
      }
    } else {
      // No keys found, generate a new one
      guard let newKeyId = generateKeyPair() else {
        reject(
          "E_KEY_GENERATION_FAILED",
          "Failed to generate or retrieve key pair for client registration", nil)
        return
      }

      do {
        keyPair = try keyPairManager.getKeyPair(with: newKeyId)
        keyId = newKeyId
      } catch {
        reject(
          "E_GET_KEYPAIR_FAILED",
          "Failed to retrieve newly generated key pair: \(error.localizedDescription)", error)
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
      to: builder, fcmDeviceToken: fcmDeviceToken as String, deviceToken: deviceToken as String?)

    // Add additional client registration specific claims
    builder.claim(name: DeviceInfoKeys.hasOtherAccounts, value: hasOtherAccounts)

    if let securityMethod = accountSecurityMethod {
      builder.claim(name: DeviceInfoKeys.appSecurityOption, value: securityMethod.rawValue)
    }

    let deviceInfoClaims = builder.build()
    let deviceInfoJWT = JWS(
      header: JWSHeader(alg: JWSAlgorithm("none"), kid: ""), payload: deviceInfoClaims)

    // Convert device info JWT to JSON string
    guard let deviceInfoJWTAsString = try? deviceInfoJWT.serialize() else {
      reject(
        "E_DEVICE_INFO_JWT_CONVERSION_FAILED", "Failed to convert device info JWT to JSON string",
        nil)
      return
    }

    // Create client registration data with real values
    let clientRegistrationData: [String: Any] = [
      "client_name": BcscCore.clientName,
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
          ]
        ]
      ],
      "grant_types": [
        "authorization_code"
      ],
      "application_type": "native",
      "redirect_uris": [
        "http://localhost:8080/"
      ],
    ]

    do {
      // print("BcscCore: getDynamicClientRegistrationBody - Client Registration Data: \(clientRegistrationData)")
      let jsonData = try JSONSerialization.data(withJSONObject: clientRegistrationData, options: [])
      let jsonString = String(data: jsonData, encoding: .utf8) ?? "{}"

      resolve(jsonString)
    } catch {
      reject(
        "E_JSON_SERIALIZATION_FAILED",
        "Failed to serialize client registration data: \(error.localizedDescription)", error)
    }
  }

  @objc
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
        nil)
      return
    }

    // Create the client assertion JWT using the helper function with additional code claim
    let additionalClaims = ["code": confirmationCode]
    guard
      let serializedJWT = createClientAssertionJWT(
        audience: issuer, issuer: clientID, subject: clientID, additionalClaims: additionalClaims,
        reject: reject)
    else {
      return  // Error already handled by createClientAssertionJWT
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
  @objc
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
        base64Encoded: base64String, options: Data.Base64DecodingOptions(rawValue: UInt(0)))

      let base64Decoded: String = String(
        data: decodedData! as Data,
        encoding: String.Encoding(rawValue: String.Encoding.utf8.rawValue))!
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
  @objc
  func createQuickLoginJWT(
    _ accessToken: String, clientId: String, issuer: String, clientRefId: String,
    key: NSDictionary, fcmDeviceToken: String, deviceToken: String?, 
    resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
  ) {

    guard
      !accessToken.isEmpty && !clientId.isEmpty && !issuer.isEmpty && !clientRefId.isEmpty && !fcmDeviceToken.isEmpty
    else {
      reject(
        "E_INVALID_PARAMETERS",
        "All required parameters (accessToken, clientId, issuer, clientRefId, fcmDeviceToken) cannot be empty.",
        nil)
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
    guard
      let signedJWT = makeSignedJWTForAccountLogin(
        accessToken: accessToken,
        clientId: clientId,
        issuer: issuer,
        clientRefId: clientRefId,
        fcmDeviceToken: fcmDeviceToken,
        deviceToken: deviceToken,
        reject: reject)
    else {
      return  // Error already handled in makeSignedJWT
    }

    print("signedJWT: \(signedJWT)")

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
        "Failed to encrypt JWT: \(error.localizedDescription)", error)
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
      guard
        let payload = makeJWTPayloadForAccountLogin(
          accessToken: accessToken,
          clientId: clientId,
          issuer: issuer,
          clientRefId: clientRefId,
          fcmDeviceToken: fcmDeviceToken,
          deviceToken: deviceToken)
      else {
        reject("E_JWT_PAYLOAD_CREATION_FAILED", "Failed to create JWT payload", nil)
        return nil
      }

      return signJWT(payload: payload, reject: reject)
    } catch {
      reject(
        "E_JWT_CREATION_FAILED",
        "Failed to create account login JWT: \(error.localizedDescription)", error)
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
      accessToken: accessToken, jwtID: randomUDID, clientID: clientId)

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
  private func assertionFactoryHMAC(accessToken: String, jwtID: String, clientID: String) -> String
  {
    let accessTokenBytes: [UInt8] = Array(accessToken.utf8)
    let clientIdBytes: [UInt8] = Array(clientID.lowercased().utf8)  // Lowercase here to match ias-ios
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
  private func encryptJWTWithPublicKey(serializedJWT: String, publicKey: SecKey, reject: @escaping RCTPromiseRejectBlock) throws -> String? {
    do {
      let jwe = try JWE(
        header: JWEHeader(alg: JWEAlgorithm.RSA1_5, enc: EncryptionMethod.A128CBC_HS256),
        payload: serializedJWT)
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
    to builder: JWTClaimsSet.Builder, fcmDeviceToken: String, deviceToken: String?
  ) -> Bool {
    guard
      let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString")
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
        name: DeviceInfoKeys.deviceID, value: UIDevice.current.identifierForVendor?.uuidString ?? ""
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
  @objc
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
  // Support for the new architecture (Fabric)
  #if RCT_NEW_ARCH_ENABLED
    @objc
    class func moduleName() -> String! {
      return "BcscCore"
    }
  #endif

}
