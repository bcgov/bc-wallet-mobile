//
//  AuthorizationRequest.swift
//  bcsc-core
//
//  This model is designed to be compatible with the v3 native app's AuthorizationRequest
//  stored in the authorization_request file. It uses NSCoding for NSKeyedArchiver compatibility.
//

import Foundation

/// Address information for the user
@objc(Address)
class Address: NSObject, NSCoding, NSSecureCoding {
  static var supportsSecureCoding: Bool = true

  var streetAddress: String?
  var locality: String?
  var postalCode: String?
  var country: String?
  var region: String?

  enum CodingKeys: String {
    case streetAddress
    case locality
    case postalCode
    case country
    case region
  }

  override init() {
    super.init()
  }

  init(
    streetAddress: String?, locality: String?, postalCode: String?, country: String?,
    region: String?
  ) {
    self.streetAddress = streetAddress
    self.locality = locality
    self.postalCode = postalCode
    self.country = country
    self.region = region
  }

  func encode(with coder: NSCoder) {
    coder.encode(streetAddress, forKey: CodingKeys.streetAddress.rawValue)
    coder.encode(locality, forKey: CodingKeys.locality.rawValue)
    coder.encode(postalCode, forKey: CodingKeys.postalCode.rawValue)
    coder.encode(country, forKey: CodingKeys.country.rawValue)
    coder.encode(region, forKey: CodingKeys.region.rawValue)
  }

  required init?(coder: NSCoder) {
    streetAddress = coder.decodeObject(forKey: CodingKeys.streetAddress.rawValue) as? String
    locality = coder.decodeObject(forKey: CodingKeys.locality.rawValue) as? String
    postalCode = coder.decodeObject(forKey: CodingKeys.postalCode.rawValue) as? String
    country = coder.decodeObject(forKey: CodingKeys.country.rawValue) as? String
    region = coder.decodeObject(forKey: CodingKeys.region.rawValue) as? String
  }

  /// Convert to dictionary for React Native
  func toDictionary() -> [String: Any?] {
    return [
      "streetAddress": streetAddress,
      "locality": locality,
      "postalCode": postalCode,
      "country": country,
      "region": region,
    ]
  }

  /// Create from dictionary (from React Native)
  static func fromDictionary(_ dict: [String: Any]) -> Address {
    let address = Address()
    address.streetAddress = dict["streetAddress"] as? String
    address.locality = dict["locality"] as? String
    address.postalCode = dict["postalCode"] as? String
    address.country = dict["country"] as? String
    address.region = dict["region"] as? String
    return address
  }
}

/// Request status enum matching v3's RequestStatus
@objc enum RequestStatus: Int {
  case initialized = 0
  case requested = 1
  case authorized = 2
  case completed = 3
  case cancelled = 4
  case error = 5
}

/// Authorization method enum matching v3's AuthorizationMethod
@objc enum AuthorizationMethodType: Int {
  case none = 0
  case counter = 1
  case face = 2
  case videoCall = 3
  case backCheck = 4
  case selfVerify = 5
}

/// AuthorizationRequest model compatible with v3 native app storage.
/// This is persisted to the authorization_request file in Application Support directory
/// using NSKeyedArchiver.
@objc(AuthorizationRequest)
class AuthorizationRequest: NSObject, NSCoding, NSSecureCoding {
  static var supportsSecureCoding: Bool = true

  // Device/user codes
  var deviceCode: String?
  var userCode: String?

  // User identity info
  var birthdate: Date?
  var csn: String? // Card Serial Number
  var verifiedEmail: String?

  // User profile info
  var firstName: String?
  var lastName: String?
  var middleNames: String?
  var address: Address?

  // Request metadata
  var status: RequestStatus = .initialized
  var method: AuthorizationMethodType = .none
  var audience: String?
  var scope: String?
  var redirectURI: String?
  var requestedAt: Date?
  var expiry: Date?
  var authorizationExpiry: Date?

  // Token hint
  var idTokenHint: String?

  // Verification options
  var verificationOptions: String?
  var verificationURIVideo: String?

  // BackCheck verification
  var backCheckSubmittedDate: Date?
  var backCheckVerificationId: String?

  // Evidence upload
  var evidenceUploadURI: String?

  // Identification process type
  var cardProcess: String?

  // Coding keys matching v3's encoding
  private enum CodingKeys: String {
    case process
    case status
    case method
    case audience
    case csn
    case birthdate
    case redirectURI
    case scope
    case requestedAt
    case expiry
    case authorizationExpiry
    case userCode
    case deviceCode
    case verified_email
    case verificationOptions
    case verificationURIVideo
    case backCheckVerificationId
    case backCheckSubmittedDate
    case firstName
    case middleNames
    case lastName
    case address
    case regularServicePeriods
    case unavailableServicePeriods
    case allowedEvidenceTypes
    case evidenceUploadURI
    case timeZone
  }

  override init() {
    super.init()
  }

  func encode(with coder: NSCoder) {
    coder.encode(status.rawValue, forKey: CodingKeys.status.rawValue)
    coder.encode(method.rawValue, forKey: CodingKeys.method.rawValue)
    coder.encode(audience, forKey: CodingKeys.audience.rawValue)
    coder.encode(csn, forKey: CodingKeys.csn.rawValue)
    coder.encode(birthdate, forKey: CodingKeys.birthdate.rawValue)
    coder.encode(redirectURI, forKey: CodingKeys.redirectURI.rawValue)
    coder.encode(scope, forKey: CodingKeys.scope.rawValue)
    coder.encode(requestedAt, forKey: CodingKeys.requestedAt.rawValue)
    coder.encode(expiry, forKey: CodingKeys.expiry.rawValue)
    coder.encode(authorizationExpiry, forKey: CodingKeys.authorizationExpiry.rawValue)
    coder.encode(userCode, forKey: CodingKeys.userCode.rawValue)
    coder.encode(deviceCode, forKey: CodingKeys.deviceCode.rawValue)
    coder.encode(verifiedEmail, forKey: CodingKeys.verified_email.rawValue)
    coder.encode(verificationOptions, forKey: CodingKeys.verificationOptions.rawValue)
    coder.encode(verificationURIVideo, forKey: CodingKeys.verificationURIVideo.rawValue)
    coder.encode(backCheckVerificationId, forKey: CodingKeys.backCheckVerificationId.rawValue)
    coder.encode(backCheckSubmittedDate, forKey: CodingKeys.backCheckSubmittedDate.rawValue)
    coder.encode(firstName, forKey: CodingKeys.firstName.rawValue)
    coder.encode(middleNames, forKey: CodingKeys.middleNames.rawValue)
    coder.encode(lastName, forKey: CodingKeys.lastName.rawValue)
    coder.encode(address, forKey: CodingKeys.address.rawValue)
    coder.encode(evidenceUploadURI, forKey: CodingKeys.evidenceUploadURI.rawValue)
    coder.encode(cardProcess, forKey: CodingKeys.process.rawValue)
  }

  required init?(coder decoder: NSCoder) {
    // Decode status
    let rawStatus = decoder.decodeInteger(forKey: CodingKeys.status.rawValue)
    status = RequestStatus(rawValue: rawStatus) ?? .initialized

    // Decode method - handle both integer and string for v3 compatibility
    let rawMethodInt = decoder.decodeInteger(forKey: CodingKeys.method.rawValue)
    if rawMethodInt != 0 {
      // Integer was found
      method = AuthorizationMethodType(rawValue: rawMethodInt) ?? .none
    } else if decoder.containsValue(forKey: CodingKeys.method.rawValue),
              let rawMethod = try? decoder.decodeTopLevelObject(forKey: CodingKeys.method.rawValue) as? String
    {
      // String was found (legacy v3 format)
      switch rawMethod {
      case "counter": method = .counter
      case "face": method = .face
      case "video_call": method = .videoCall
      case "back_check": method = .backCheck
      case "self": method = .selfVerify
      default: method = .none
      }
    } else {
      method = .none
    }

    // Decode strings
    audience = decoder.decodeObject(forKey: CodingKeys.audience.rawValue) as? String
    csn = decoder.decodeObject(forKey: CodingKeys.csn.rawValue) as? String
    redirectURI = decoder.decodeObject(forKey: CodingKeys.redirectURI.rawValue) as? String
    scope = decoder.decodeObject(forKey: CodingKeys.scope.rawValue) as? String
    userCode = decoder.decodeObject(forKey: CodingKeys.userCode.rawValue) as? String
    deviceCode = decoder.decodeObject(forKey: CodingKeys.deviceCode.rawValue) as? String
    verifiedEmail = decoder.decodeObject(forKey: CodingKeys.verified_email.rawValue) as? String
    verificationOptions = decoder.decodeObject(forKey: CodingKeys.verificationOptions.rawValue)
      as? String
    verificationURIVideo = decoder.decodeObject(forKey: CodingKeys.verificationURIVideo.rawValue)
      as? String
    backCheckVerificationId =
      decoder.decodeObject(forKey: CodingKeys.backCheckVerificationId.rawValue) as? String
    evidenceUploadURI = decoder.decodeObject(forKey: CodingKeys.evidenceUploadURI.rawValue)
      as? String
    firstName = decoder.decodeObject(forKey: CodingKeys.firstName.rawValue) as? String
    middleNames = decoder.decodeObject(forKey: CodingKeys.middleNames.rawValue) as? String
    lastName = decoder.decodeObject(forKey: CodingKeys.lastName.rawValue) as? String

    // Decode dates
    birthdate = decoder.decodeObject(forKey: CodingKeys.birthdate.rawValue) as? Date
    requestedAt = decoder.decodeObject(forKey: CodingKeys.requestedAt.rawValue) as? Date
    expiry = decoder.decodeObject(forKey: CodingKeys.expiry.rawValue) as? Date
    authorizationExpiry = decoder.decodeObject(forKey: CodingKeys.authorizationExpiry.rawValue)
      as? Date
    backCheckSubmittedDate =
      decoder.decodeObject(forKey: CodingKeys.backCheckSubmittedDate.rawValue) as? Date

    // Decode complex objects
    address = decoder.decodeObject(forKey: CodingKeys.address.rawValue) as? Address

    // Decode card process
    cardProcess = decoder.decodeObject(forKey: CodingKeys.process.rawValue) as? String
  }

  /// Convert to dictionary for React Native
  func toDictionary() -> [String: Any?] {
    var dict: [String: Any?] = [
      "deviceCode": deviceCode,
      "userCode": userCode,
      "csn": csn,
      "verifiedEmail": verifiedEmail,
      "firstName": firstName,
      "lastName": lastName,
      "middleNames": middleNames,
      "status": status.rawValue,
      "method": method.rawValue,
      "audience": audience,
      "scope": scope,
      "redirectURI": redirectURI,
      "verificationOptions": verificationOptions,
      "verificationURIVideo": verificationURIVideo,
      "backCheckVerificationId": backCheckVerificationId,
      "evidenceUploadURI": evidenceUploadURI,
      "cardProcess": cardProcess,
    ]

    // Convert dates to timestamps
    if let birthdate = birthdate {
      dict["birthdate"] = birthdate.timeIntervalSince1970
    }
    if let requestedAt = requestedAt {
      dict["requestedAt"] = requestedAt.timeIntervalSince1970
    }
    if let expiry = expiry {
      dict["expiry"] = expiry.timeIntervalSince1970
    }
    if let authorizationExpiry = authorizationExpiry {
      dict["authorizationExpiry"] = authorizationExpiry.timeIntervalSince1970
    }
    if let backCheckSubmittedDate = backCheckSubmittedDate {
      dict["backCheckSubmittedDate"] = backCheckSubmittedDate.timeIntervalSince1970
    }

    // Convert address to dictionary
    if let address = address {
      dict["address"] = address.toDictionary()
    }

    return dict
  }

  /// Create from dictionary (from React Native)
  static func fromDictionary(_ dict: [String: Any]) -> AuthorizationRequest {
    let request = AuthorizationRequest()

    request.deviceCode = dict["deviceCode"] as? String
    request.userCode = dict["userCode"] as? String
    request.csn = dict["csn"] as? String
    request.verifiedEmail = dict["verifiedEmail"] as? String
    request.firstName = dict["firstName"] as? String
    request.lastName = dict["lastName"] as? String
    request.middleNames = dict["middleNames"] as? String
    request.audience = dict["audience"] as? String
    request.scope = dict["scope"] as? String
    request.redirectURI = dict["redirectURI"] as? String
    request.verificationOptions = dict["verificationOptions"] as? String
    request.verificationURIVideo = dict["verificationURIVideo"] as? String
    request.backCheckVerificationId = dict["backCheckVerificationId"] as? String
    request.evidenceUploadURI = dict["evidenceUploadURI"] as? String
    request.cardProcess = dict["cardProcess"] as? String

    // Convert status from number
    if let statusRaw = dict["status"] as? Int,
       let statusValue = RequestStatus(rawValue: statusRaw)
    {
      request.status = statusValue
    }

    // Convert method from number
    if let methodRaw = dict["method"] as? Int,
       let methodValue = AuthorizationMethodType(rawValue: methodRaw)
    {
      request.method = methodValue
    }

    // Convert timestamps to dates
    if let birthdateTimestamp = dict["birthdate"] as? Double {
      request.birthdate = Date(timeIntervalSince1970: birthdateTimestamp)
    }
    if let requestedAtTimestamp = dict["requestedAt"] as? Double {
      request.requestedAt = Date(timeIntervalSince1970: requestedAtTimestamp)
    }
    if let expiryTimestamp = dict["expiry"] as? Double {
      request.expiry = Date(timeIntervalSince1970: expiryTimestamp)
    }
    if let authorizationExpiryTimestamp = dict["authorizationExpiry"] as? Double {
      request.authorizationExpiry = Date(timeIntervalSince1970: authorizationExpiryTimestamp)
    }
    if let backCheckSubmittedTimestamp = dict["backCheckSubmittedDate"] as? Double {
      request.backCheckSubmittedDate = Date(timeIntervalSince1970: backCheckSubmittedTimestamp)
    }

    // Convert address from dictionary
    if let addressDict = dict["address"] as? [String: Any] {
      request.address = Address.fromDictionary(addressDict)
    }

    return request
  }
}
