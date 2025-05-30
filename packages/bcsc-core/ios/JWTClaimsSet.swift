//
//  JWTClaimsSet.swift
//  jose
//
//  Created by marcosc on 2016-12-07.
//  Copyright © 2016 idim. All rights reserved.
//

import Foundation

class JWTClaimsSet {
    enum Names {
    // registered claim names
    static let ISSUER_CLAIM = "iss";
    static let SUBJECT_CLAIM = "sub";
    static let AUDIENCE_CLAIM = "aud";
    static let EXPIRATION_TIME_CLAIM = "exp";
    static let NOT_BEFORE_CLAIM = "nbf";
    static let ISSUED_AT_CLAIM = "iat";
    static let JWT_ID_CLAIM = "jti";
    }
    private let claims: Dictionary<String, Any>
    
    var issuer: String? {
        return getClaimAsString(Names.ISSUER_CLAIM)
    }
    var subject: String? {
        return getClaimAsString(Names.SUBJECT_CLAIM)
    }
    var audience: String? {
        return getClaimAsString(Names.AUDIENCE_CLAIM)
    }
    var expirationTime: Date? {
        return getClaimAsDate(Names.EXPIRATION_TIME_CLAIM)
    }
    var notBeforeTIme: Date? {
        return getClaimAsDate(Names.NOT_BEFORE_CLAIM)
    }
    var issuedAt: Date? {
        return getClaimAsDate(Names.ISSUED_AT_CLAIM)
    }
    var jwtID: String? {
        return getClaimAsString(Names.JWT_ID_CLAIM)
    }
    
    init(_ claims: Dictionary<String, Any>) {
        self.claims = claims
    }
    func getClaimAsDate(_ name: String) -> Date? {
        if let interval: TimeInterval = claims[name] as! TimeInterval? {
            return Date(timeIntervalSince1970: interval)
        }
        return nil
        
    }
    func getClaimAsString(_ name: String) -> String? {
        if let val: String = claims[name] as! String? {
            return val
        }
        return nil
    }
    
    func getClaimAsInt(_ name: String) -> Int? {
        if let val: Int = claims[name] as? Int {
            return val
        }
        return nil
    }
    
    func getClaim(_ name:String) -> Any? {
        return claims[name]
    }
    func toJSONString() throws -> String {
        do {
            let data = try JSONSerialization.data(withJSONObject: claims, options: [])
            return String(data: data, encoding: String.Encoding.utf8)!
        }
        catch {
            throw NSError(domain: "MyDomain", code: 1, userInfo: [NSLocalizedDescriptionKey: "Something went wrong"])
//            AnalyticsService.shared.trackError(errorCode: AnalyticsErrorCode.err120, body: AnalyticsErrorBody.err120ToJSONStringMethodFailure)
//            throw BcscError.err_120_toJSONString_method_failure
        }
    }
    /// Parse the given string into a JWTClaimsSet
    ///
    /// - Parameter s: a base64URL encoded string
    /// - Returns: JWTClaimsSet
    /// - Throws: JOSEException if the string can not be parsed
    class func parse(_ s: String) throws -> JWTClaimsSet{
        if let claims:Dictionary<String, Any> = try JSONSerialization.jsonObject(with: Base64URL.decode(s), options: .mutableContainers) as? Dictionary<String, Any> {
            return JWTClaimsSet(claims)
        } else {
            throw JOSEException("unable to parse JWSClaimsSet from: " + Base64URL.decodeAsString(s))
        }
    }
    
    class Builder {
        var claims = Dictionary<String, Any>()
        func issuer(_ issuer: String) -> Builder {
            return claim(name: Names.ISSUER_CLAIM, value: issuer)
        }
        func subject(_ subject: String) -> Builder {
            return claim(name: Names.SUBJECT_CLAIM, value: subject)
        }
        func audience(_ audience: String) -> Builder {
            return claim(name: Names.AUDIENCE_CLAIM, value: audience)
        }
        func expirationTime(_ expiry: Date) -> Builder {
            claim(name: Names.EXPIRATION_TIME_CLAIM, value: expiry)
            return self
        }
        func issueTime(_ issuedAt: Date) -> Builder {
            claim(name: Names.ISSUED_AT_CLAIM, value: issuedAt)
            return self
        }
        
        func notBefore(_ nbf: Date) -> Builder {
            claim(name: Names.NOT_BEFORE_CLAIM, value: nbf)
            return self
        }
        func jwtID(_ jwtID: String) -> Builder {
            return claim(name: Names.JWT_ID_CLAIM, value: jwtID)
        }
        
        @discardableResult func claim(name: String, value: String) -> Builder {
            claims[name] = String.init(value.utf8) //String(value.utf8)
            return self
        }
        @discardableResult func claim(name: String, value: Date) -> Builder {
            claims[name] = Int(value.timeIntervalSince1970)
            return self
        }

        @discardableResult func claim(name: String, value: Any) -> Builder {
            claims[name] = value
            return self
        }
        func build() -> JWTClaimsSet {
            return JWTClaimsSet(claims)
        }
    }
    
    class func builder() -> Builder {
        return Builder()
    }
    
    func asDictionary() -> Dictionary<String, Any> {
        return claims
    }
}
