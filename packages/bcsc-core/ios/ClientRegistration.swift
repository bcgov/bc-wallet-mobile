import Foundation

class ClientRegistration: NSObject, NSSecureCoding {
  static var supportsSecureCoding = true

  // var provider: Provider?
  // var keys: [JWK] = []
  var credential: Credential?
  var accessToken: String?
  var accessTokenID: String?
  var registrationClientURI: String?
  var redirectURI: String?
  var clientID: String?
  var created: Date?
  var updated: Date?

  override init() {
    super.init()
  }

  required init?(coder: NSCoder) {
    // Attempt to decode v3 fields but ignore if they fail (for migration compatibility)
    // V3 has a provider object we don't need in v4 - decode and ignore it
    _ = try? coder.decodeTopLevelObject(forKey: .provider)
    // V3 has a keys array we don't need in v4 - decode and ignore it
    _ = coder.decodeObject(forKey: .keys)

    let decodedCredential = coder.decodeObject(forKey: .credential)
    print(
      "ClientRegistration.init: Decoded credential object type: \(type(of: decodedCredential)), value: \(String(describing: decodedCredential))"
    )
    self.credential = decodedCredential as? Credential
    if self.credential == nil, decodedCredential != nil {
      print(
        "ClientRegistration.init: Failed to cast credential to Credential type, actual type: \(type(of: decodedCredential))"
      )
    }

    self.accessToken = coder.decodeObject(forKey: .accessToken) as? String
    self.accessTokenID = coder.decodeObject(forKey: .accessTokenID) as? String
    self.registrationClientURI = coder.decodeObject(forKey: .registrationClientURI) as? String
    self.redirectURI = coder.decodeObject(forKey: .redirectURI) as? String
    self.clientID = coder.decodeObject(forKey: .clientID) as? String
    self.created = coder.decodeObject(forKey: .created) as? Date
    self.updated = coder.decodeObject(forKey: .updated) as? Date
  }

  func encode(with coder: NSCoder) {
    // coder.encode(self.provider, forKey: .provider)
    // coder.encode(self.keys, forKey: .keys)
    coder.encode(self.credential, forKey: .credential)
    coder.encode(self.accessToken, forKey: .accessToken)
    coder.encode(self.accessTokenID, forKey: .accessTokenID)
    coder.encode(self.registrationClientURI, forKey: .registrationClientURI)
    coder.encode(self.redirectURI, forKey: .redirectURI)
    coder.encode(self.clientID, forKey: .clientID)
    coder.encode(self.created, forKey: .created)
    coder.encode(self.updated, forKey: .updated)
  }
}

// MARK: - ClientRegistration Keys

private extension String {
  static let provider = "provider"
  static let keys = "keys"
  static let credential = "credential"
  static let accessToken = "accessToken"
  static let accessTokenID = "accessTokenID"
  static let registrationClientURI = "registrationClientURI"
  static let redirectURI = "redirectURI"
  static let clientID = "clientID"
  static let created = "created"
  static let updated = "updated"
}
