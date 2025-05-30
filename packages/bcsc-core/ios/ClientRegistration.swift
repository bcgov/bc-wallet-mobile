import Foundation

class ClientRegistration: NSObject, NSSecureCoding {
    static var supportsSecureCoding = true

    // var provider: Provider?
    // var keys: [JWK] = []
    // var credential: Credential?
    var accessToken: String?
    var accessTokenID: String?
    var registrationClientURI: String?
    var redirectURI: String?
    var clientID: String?
    var created: Date?
    var updated: Date?

    required init?(coder: NSCoder) {
        // self.provider = coder.decodeObject(of: Provider.self, forKey: .provider)
        // self.keys = coder.decodeObject(of: [NSArray.self, JWK.self], forKey: .keys) as? [JWK] ?? []
        // self.credential = coder.decodeObject(of: Credential.self, forKey: .credential)
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
        // coder.encode(self.credential, forKey: .credential)
        coder.encode(self.accessToken, forKey: .accessToken)
        coder.encode(self.accessTokenID, forKey: .accessTokenID)
        coder.encode(self.registrationClientURI, forKey: .registrationClientURI)
        coder.encode(self.redirectURI, forKey: .redirectURI)
        coder.encode(self.clientID, forKey: .clientID)
        coder.encode(self.created, forKey: .created)
        coder.encode(self.updated, forKey: .updated)
    }
}

//MARK: - ClientRegistration Keys
fileprivate extension String {
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