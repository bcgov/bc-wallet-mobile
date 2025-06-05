//
//  Account.swift
//

import Foundation

class Account: NSObject, NSCoding, NSSecureCoding {
    static var supportsSecureCoding: Bool = true

    let id: String
    let issuer: String
    var clientID: String?
    private var _securityMethod: String
    
    // User full name
    var displayName: String?
    
    // Indicate if app has posted initial nickname
    // to server after existing user
    // has upgraded to v3.6.0 and did not
    // set their nickname
    var didPostNicknameToServer: Bool = false
    
    private(set) var nickname: String?
    
    // PIN Penalty helper properties
    private let DAY: TimeInterval = 86400
    private let HOUR: TimeInterval = 3600
    private let MINUTE: TimeInterval = 60
    private let attemptsIncrement = 5
    private let attemptsThreshold = 20
    private(set) var failedAttemptCount: Int = 0
    private var lastAttemptDate: Date?
    private lazy var penalties: [Int: TimeInterval] = {
        return [
            5: 1 * MINUTE,
            10: 10 * MINUTE,
            15: 1 * HOUR,
            attemptsThreshold: 1 * DAY
        ]
    }()
    
    required init?(coder decoder: NSCoder) {
        self.id = decoder.decodeObject(forKey: .id) as! String
        self.issuer = decoder.decodeObject(forKey: .issuer) as! String
        self.clientID = decoder.decodeObject(forKey: .clientID) as? String
        self._securityMethod = decoder.decodeObject(forKey: .securityMethod) as! String
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
        encoder.encode(_securityMethod, forKey: .securityMethod)
        encoder.encode(failedAttemptCount, forKey: .failedAttemptCount)
        encoder.encode(lastAttemptDate, forKey: .lastAttemptDate)
        encoder.encode(displayName, forKey: .displayName)
        encoder.encode(didPostNicknameToServer, forKey: .didPostNicknameToServer)
        encoder.encode(nickname, forKey: .nickname)
    }
}

// CodingKeys
extension String {
    fileprivate static let id = "id"
    fileprivate static let issuer = "issuer"
    fileprivate static let clientID = "client_id"
    fileprivate static let securityMethod = "security_method"
    fileprivate static let failedAttemptCount = "failed_attempt_count"
    fileprivate static let lastAttemptDate = "last_attempt_date"
    fileprivate static let displayName = "display_name"
    fileprivate static let didPostNicknameToServer = "did_post_nickname_to_server"
    fileprivate static let nickname = "nickname"
}
