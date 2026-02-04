import Foundation

class Credential: NSObject, NSSecureCoding {
  static var supportsSecureCoding = true

  // Core identification
  var issuer: String
  var subject: String
  var label: String

  // Timestamps
  var created: Date
  var lastUsed: Date?
  var updatedDate: Date?

  // BCSC specific fields
  var bcscEvent: String?
  var bcscReason: String?
  var bcscStatusDate: Date?
  var bcscEventDate: Date?

  // Device and account info
  var devicesCount: Int?
  var maxDevices: Int?
  var cardType: String?
  var accountType: String?

  /// Security and authentication
  var acr: Int? // Authentication Context Reference / LOA level

  // Card expiry
  var cardExpiry: String?
  var cardExpiryDateString: String?
  var cardExpiryWarningText: String?

  // UI state flags
  var hasShownExpiryAlert: Bool = false
  var hasShownFeedbackAlert: Bool = false

  // Token references (iOS specific)
  var accessTokenIDs: [String]?
  var refreshTokenIDs: [String]?

  /// Client registration reference
  var clientID: String?

  init(
    issuer: String,
    subject: String,
    label: String,
    created: Date,
    bcscEvent: String? = nil,
    bcscReason: String? = nil
  ) {
    self.issuer = issuer
    self.subject = subject
    self.label = label
    self.created = created
    self.bcscEvent = bcscEvent
    self.bcscReason = bcscReason
    super.init()
  }

  required init?(coder: NSCoder) {
    let issuer = coder.decodeObject(forKey: .issuer) as? String
    let subject = coder.decodeObject(forKey: .subject) as? String
    let label = coder.decodeObject(forKey: .label) as? String
    let created = coder.decodeObject(forKey: .created) as? Date

    // Only require core fields
    guard let issuer = issuer,
          let subject = subject,
          let label = label,
          let created = created
    else {
      return nil
    }

    self.issuer = issuer
    self.subject = subject
    self.label = label
    self.created = created

    // Optional fields
    self.bcscEvent = coder.decodeObject(forKey: .bcscEvent) as? String
    self.bcscReason = coder.decodeObject(forKey: .bcscReason) as? String
    self.lastUsed = coder.decodeObject(forKey: .lastUsed) as? Date
    self.updatedDate = coder.decodeObject(forKey: .updatedDate) as? Date
    self.bcscStatusDate = coder.decodeObject(forKey: .bcscStatusDate) as? Date
    self.bcscEventDate = coder.decodeObject(forKey: .bcscEventDate) as? Date
    self.devicesCount = coder.decodeObject(forKey: .devicesCount) as? Int
    self.maxDevices = coder.decodeObject(forKey: .maxDevices) as? Int
    self.cardType = coder.decodeObject(forKey: .cardType) as? String
    self.accountType = coder.decodeObject(forKey: .accountType) as? String
    self.acr = coder.decodeObject(forKey: .acr) as? Int
    self.cardExpiry = coder.decodeObject(forKey: .cardExpiry) as? String
    self.cardExpiryDateString = coder.decodeObject(forKey: .cardExpiryDateString) as? String
    self.cardExpiryWarningText = coder.decodeObject(forKey: .cardExpiryWarningText) as? String
    self.hasShownExpiryAlert = coder.decodeBool(forKey: .hasShownExpiryAlert)
    self.hasShownFeedbackAlert = coder.decodeBool(forKey: .hasShownFeedbackAlert)
    self.accessTokenIDs = coder.decodeObject(forKey: .accessTokenIDs) as? [String]
    self.refreshTokenIDs = coder.decodeObject(forKey: .refreshTokenIDs) as? [String]
    self.clientID = coder.decodeObject(forKey: .clientID) as? String

    super.init()
  }

  func encode(with coder: NSCoder) {
    // Required fields
    coder.encode(self.issuer, forKey: .issuer)
    coder.encode(self.subject, forKey: .subject)
    coder.encode(self.label, forKey: .label)
    coder.encode(self.created, forKey: .created)
    coder.encode(self.bcscEvent, forKey: .bcscEvent)
    coder.encode(self.bcscReason, forKey: .bcscReason)

    // Optional fields
    coder.encode(self.lastUsed, forKey: .lastUsed)
    coder.encode(self.updatedDate, forKey: .updatedDate)
    coder.encode(self.bcscStatusDate, forKey: .bcscStatusDate)
    coder.encode(self.bcscEventDate, forKey: .bcscEventDate)
    coder.encode(self.devicesCount, forKey: .devicesCount)
    coder.encode(self.maxDevices, forKey: .maxDevices)
    coder.encode(self.cardType, forKey: .cardType)
    coder.encode(self.accountType, forKey: .accountType)
    coder.encode(self.acr, forKey: .acr)
    coder.encode(self.cardExpiry, forKey: .cardExpiry)
    coder.encode(self.cardExpiryDateString, forKey: .cardExpiryDateString)
    coder.encode(self.cardExpiryWarningText, forKey: .cardExpiryWarningText)
    coder.encode(self.hasShownExpiryAlert, forKey: .hasShownExpiryAlert)
    coder.encode(self.hasShownFeedbackAlert, forKey: .hasShownFeedbackAlert)
    coder.encode(self.accessTokenIDs, forKey: .accessTokenIDs)
    coder.encode(self.refreshTokenIDs, forKey: .refreshTokenIDs)
    coder.encode(self.clientID, forKey: .clientID)
  }
}

// MARK: - Credential Keys

private extension String {
  static let issuer = "issuer"
  static let subject = "subject"
  static let label = "label"
  static let created = "created"
  static let lastUsed = "lastUsed"
  static let updatedDate = "updatedDate"
  static let bcscEvent = "bcscEvent"
  static let bcscReason = "bcscReason"
  static let bcscStatusDate = "bcscStatusDate"
  static let bcscEventDate = "bcscEventDate"
  static let devicesCount = "devicesCount"
  static let maxDevices = "maxDevices"
  static let cardType = "cardType"
  static let accountType = "accountType"
  static let acr = "acr"
  static let cardExpiry = "cardExpiry"
  static let cardExpiryDateString = "cardExpiryDateString"
  static let cardExpiryWarningText = "cardExpiryWarningText"
  static let hasShownExpiryAlert = "hasShownExpiryAlert"
  static let hasShownFeedbackAlert = "hasShownFeedbackAlert"
  static let accessTokenIDs = "accessTokenIDs"
  static let refreshTokenIDs = "refreshTokenIDs"
  static let clientID = "clientID"
}
