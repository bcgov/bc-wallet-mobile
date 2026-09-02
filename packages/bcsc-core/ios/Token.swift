//
//  Token.swift
//  BCSC
//
//  Created by Spencer Mandrusiak on 2017-02-03.
//  Copyright © 2017 Province of British Columbia. All rights reserved.
//

import UIKit

enum TokenType: Int {
  case Access = 0
  case Refresh
  case Registration
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
    id = decoder.decodeObject(forKey: .id) as? String ?? ""
    type = TokenType(rawValue: decoder.decodeInteger(forKey: .type)) ?? .Access

    // A token without its value or issue date is unusable; there is no sensible default.
    guard let token = decoder.decodeObject(forKey: .token) as? String,
          let created = decoder.decodeObject(forKey: .created) as? Date
    else { return nil }
    self.token = token
    self.created = created

    expiry = decoder.decodeObject(forKey: .expiry) as? Date
  }
}

// MARK: - Token Keys

private extension String {
  static let id = "id"
  static let type = "subject"
  static let token = "label"
  static let created = "issuer"
  static let expiry = "created"
}
