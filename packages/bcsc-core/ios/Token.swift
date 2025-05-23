//
//  Token.swift
//  BCSC
//
//  Created by Spencer Mandrusiak on 2017-02-03.
//  Copyright © 2017 Province of British Columbia. All rights reserved.
//

import UIKit

enum TokenType: Int {
    case accessToken = 0
    case refreshToken
    case registrationAccessToken
}

class Token: NSObject, NSCoding {
    let id: String
    let type: TokenType
    let token: String
    let created: Date
    let expiry: Date?
    
    var isExpired: Bool {
        guard let expiry = self.expiry else {
            return false
        }
        return Date() > expiry
    }

    init(id: String, type: TokenType, token: String, created: Date = Date(), expiry: Date? = nil) {
        self.id = id
        self.type = type
        self.token = token
        self.created = created
        self.expiry = expiry
    }
    
    func encode(with encoder: NSCoder) {
        encoder.encode(id, forKey: .id)
        encoder.encode(type.rawValue, forKey: .type)
        encoder.encode(token, forKey: .token)
        encoder.encode(created, forKey: .created)
        encoder.encode(expiry, forKey: .expiry)
    }
    
    required init?(coder decoder: NSCoder) {
        // id was added in 0.9.2 so need to default
        let optionalId = decoder.decodeObject(forKey: .id) as? String
        id = optionalId != nil ? optionalId! : ""
        let rawType = decoder.decodeInteger(forKey: .type)
        type = TokenType(rawValue: rawType)!
        token = decoder.decodeObject(forKey: .token) as! String
        created = decoder.decodeObject(forKey: .created) as! Date
        expiry = decoder.decodeObject(forKey: .expiry) as? Date
    }
}


//MARK: - Token Keys
extension String {
    fileprivate static let id = "id"
    fileprivate static let type = "subject"
    fileprivate static let token = "label"
    fileprivate static let created = "issuer"
    fileprivate static let expiry = "created"
}
