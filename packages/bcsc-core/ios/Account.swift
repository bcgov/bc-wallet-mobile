//
//  Account.swift
//

import Foundation
import LocalAuthentication

class Account: NSObject, NSCoding, NSSecureCoding {
  static var supportsSecureCoding: Bool = true

  let id: String
  var issuer: String
  var clientID: String
  var securityMethod: AccountSecurityMethod
  let clientIDMissingFromArchive: Bool

  /// User full name
  var displayName: String?

  /// Indicate if app has posted initial nickname
  /// to server after existing user
  /// has upgraded to v3.6.0 and did not
  /// set their nickname
  var didPostNicknameToServer: Bool = false

  var nickname: String?

  /// Regular initializer
  init(
    id: String,
    clientID: String,
    issuer: String,
    securityMethod: AccountSecurityMethod = AccountSecurityMethod(rawValue: "app_pin_no_device_authn")!
  ) {
    self.id = id
    self.clientID = clientID
    self.issuer = issuer
    self.securityMethod = securityMethod
    self.clientIDMissingFromArchive = false
    super.init()
  }

  required init?(coder decoder: NSCoder) {
    guard let id = decoder.decodeObject(forKey: .id) as? String,
          let issuer = decoder.decodeObject(forKey: .issuer) as? String
    else { return nil }

    self.id = id
    self.issuer = issuer

    let decodedClientID = decoder.decodeObject(forKey: .clientID) as? String
    self.clientID = decodedClientID ?? ""
    self.clientIDMissingFromArchive = decodedClientID == nil

    let securityMethodString = decoder.decodeObject(forKey: .securityMethod) as? String ?? ""
    self.securityMethod = AccountSecurityMethod(rawValue: securityMethodString) ?? .pinNoDeviceAuth

    self.displayName = decoder.decodeObject(forKey: .displayName) as? String
    self.didPostNicknameToServer = decoder.decodeBool(forKey: .didPostNicknameToServer)
    self.nickname = decoder.decodeObject(forKey: .nickname) as? String
  }

  func encode(with encoder: NSCoder) {
    encoder.encode(id, forKey: .id)
    encoder.encode(issuer, forKey: .issuer)
    encoder.encode(clientID, forKey: .clientID)
    encoder.encode(securityMethod.rawValue, forKey: .securityMethod)
    encoder.encode(displayName, forKey: .displayName)
    encoder.encode(didPostNicknameToServer, forKey: .didPostNicknameToServer)
    encoder.encode(nickname, forKey: .nickname)
  }

  /// Return true if securityMethod is PIN and has PIN setup in keychain
  func hasPINSetup(keychainService: PINKeychainServiceProtocol = PINKeychainService()) -> Bool {
    let secretID = PINSecret.composeID(issuer: self.issuer, accountID: self.id)
    return securityMethod.isPIN && keychainService.getSecret(secretID) != nil
  }
}

extension AccountSecurityMethod {
  /// Return either pinNoDeviceAuth or pinWithDeviceAuth
  /// depending on user has device authentication enabled or not
  static func getCurrentPINMethod(context: LAContextProtocol = LAContext()) -> AccountSecurityMethod {
    var error: NSError?
    if LAContext.canPerformLocalAuthenticate(context: context, error: &error) {
      // Has device authentication on
      return .pinWithDeviceAuth
    }

    return .pinNoDeviceAuth
  }

  var isPIN: Bool {
    return [.pinNoDeviceAuth, .pinWithDeviceAuth].contains(self)
  }
}

/// CodingKeys
private extension String {
  static let id = "id"
  static let issuer = "issuer"
  static let clientID = "client_id"
  static let securityMethod = "security_method"
  static let displayName = "display_name"
  static let didPostNicknameToServer = "did_post_nickname_to_server"
  static let nickname = "nickname"
}
