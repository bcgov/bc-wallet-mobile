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

  // User full name
  var displayName: String?

  // Indicate if app has posted initial nickname
  // to server after existing user
  // has upgraded to v3.6.0 and did not
  // set their nickname
  var didPostNicknameToServer: Bool = false

  var nickname: String?

  // PIN Penalty helper properties
  private let DAY: TimeInterval = 86400
  private let HOUR: TimeInterval = 3600
  private let MINUTE: TimeInterval = 60
  private let attemptsIncrement = 5
  private let attemptsThreshold = 20
  var failedAttemptCount: Int = 0
  private var lastAttemptDate: Date?
  private lazy var penalties: [Int: TimeInterval] = [
    5: 1 * MINUTE,
    10: 10 * MINUTE,
    15: 1 * HOUR,
    attemptsThreshold: 1 * DAY,
  ]

  // Regular initializer
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
    super.init()
  }

  required init?(coder decoder: NSCoder) {
    self.id = decoder.decodeObject(forKey: .id) as! String
    self.issuer = decoder.decodeObject(forKey: .issuer) as! String
    self.clientID = decoder.decodeObject(forKey: .clientID) as! String
    let securityMethodString = decoder.decodeObject(forKey: .securityMethod) as! String
    self.securityMethod = AccountSecurityMethod(rawValue: securityMethodString)!
    self.failedAttemptCount = decoder.decodeInteger(forKey: .failedAttemptCount)
    self.lastAttemptDate = decoder.decodeObject(forKey: .lastAttemptDate) as? Date
    self.displayName = decoder.decodeObject(forKey: .displayName) as? String
    self.didPostNicknameToServer = decoder.decodeBool(forKey: .didPostNicknameToServer)
    self.nickname = decoder.decodeObject(forKey: .nickname) as? String
  }

  func encode(with encoder: NSCoder) {
    encoder.encode(id, forKey: .id)
    encoder.encode(issuer, forKey: .issuer)
    encoder.encode(clientID, forKey: .clientID)
    encoder.encode(securityMethod.rawValue, forKey: .securityMethod)
    encoder.encode(failedAttemptCount, forKey: .failedAttemptCount)
    encoder.encode(lastAttemptDate, forKey: .lastAttemptDate)
    encoder.encode(displayName, forKey: .displayName)
    encoder.encode(didPostNicknameToServer, forKey: .didPostNicknameToServer)
    encoder.encode(nickname, forKey: .nickname)
  }

  /// Return true if securityMethod is PIN and has PIN setup in keychain
  func hasPINSetup(keychainService: PINKeychainServiceProtocol = PINKeychainService()) -> Bool {
    let secretID = PINSecret.composeID(issuer: self.issuer, accountID: self.id)
    return securityMethod.isPIN && keychainService.getSecret(secretID) != nil
  }

  /// Verify PIN with penalty management
  func verifyPIN(
    _ pin: String,
    pinService: PINServiceProtocol = PINService(),
    verifyDate: Date = Date()
  ) -> VerifyPINResult {
    guard isServingPenalty(verifyDate: verifyDate) <= 0 else {
      // Serving penalty, return the remaining time
      return .failedWithPenalty(isServingPenalty(verifyDate: verifyDate))
    }

    // Update last attempt date
    lastAttemptDate = verifyDate

    guard !verifyPINWithoutPenalty(pin, pinService: pinService) else {
      // Verify success - reset failed attempt count
      failedAttemptCount = 0
      return .success
    }

    // Increment failed attempt count
    failedAttemptCount += 1

    return getFailedAttemptResult(verifyDate: verifyDate)
  }

  /// Verify PIN without penalty enforcement
  func verifyPINWithoutPenalty(_ pin: String, pinService: PINServiceProtocol = PINService()) -> Bool {
    return pinService.verifyPINAndGetHash(issuer: self.issuer, accountID: self.id, pin: pin) != nil
  }

  /// Return remaining penalty time, <= 0 if no penalty
  func isServingPenalty(verifyDate: Date = Date()) -> TimeInterval {
    switch getFailedAttemptResult(verifyDate: verifyDate) {
    case .failedWithAlert(_, _), .success:
      return 0
    case let .failedWithPenalty(penalty):
      return penalty
    }
  }

  /// Get the appropriate result for current failed attempt state
  private func getFailedAttemptResult(verifyDate: Date) -> VerifyPINResult {
    var timeHasPassedSinceLastAttempt: TimeInterval = 0
    if let lastAttemptDate = self.lastAttemptDate {
      timeHasPassedSinceLastAttempt = verifyDate.timeIntervalSince(lastAttemptDate)
    }

    if let penalty = penalties[failedAttemptCount] {
      return .failedWithPenalty(penalty - timeHasPassedSinceLastAttempt)
    } else if (failedAttemptCount >= attemptsThreshold) && ((failedAttemptCount % attemptsIncrement) == 0) {
      // Over threshold and has passed all allowed fails in between
      return .failedWithPenalty(penalties[attemptsThreshold]! - timeHasPassedSinceLastAttempt)
    } else if (failedAttemptCount % attemptsIncrement) <= attemptsIncrement - 2 {
      // Less than increment - 2
      return .failedWithAlert("Incorrect PIN", "Enter your PIN")
    } else {
      // Less than increment - 1
      return .failedWithAlert(
        "Incorrect PIN",
        "Enter your PIN. For security, if you enter another incorrect PIN, it will temporarily lock the app."
      )
    }
  }
}

enum VerifyPINResult: Equatable {
  case failedWithAlert(String, String)
  case failedWithPenalty(TimeInterval)
  case success
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

// CodingKeys
private extension String {
  static let id = "id"
  static let issuer = "issuer"
  static let clientID = "client_id"
  static let securityMethod = "security_method"
  static let failedAttemptCount = "failed_attempt_count"
  static let lastAttemptDate = "last_attempt_date"
  static let displayName = "display_name"
  static let didPostNicknameToServer = "did_post_nickname_to_server"
  static let nickname = "nickname"
}
