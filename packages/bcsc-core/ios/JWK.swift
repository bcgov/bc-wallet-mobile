//
//  JWK.swift
//  jose
//
//  Created by marcosc on 11/6/16.
//  Copyright © 2016 mcsi. All rights reserved.
//

import Foundation
/*
 
 {"kty":"RSA",
 "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx
 4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMs
 tn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2
 QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbI
 SD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqb
 w0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
 "e":"AQAB",
 "alg":"RS256",
 "kid":"2011-04-29"}
 */
class JWK: NSObject, NSCoding {
    enum KeyType: String {
        case EC, RSA, oct
    }
    let kty: KeyType
    let alg: String
    let kid: String
    let e: String
    let n: String

    func encode(with encoder: NSCoder) {
        encoder.encode(kty.rawValue, forKey: .keyType)
        encoder.encode(alg, forKey: .algorithm)
        encoder.encode(kid, forKey: .keyID)
        encoder.encode(e, forKey: .exponent)
        encoder.encode(n, forKey: .modulus)
    }
    required init?(coder decoder: NSCoder) {
        let rawKty = decoder.decodeObject(forKey: .keyType) as! String
        kty = KeyType(rawValue: rawKty)!
        alg = decoder.decodeObject(forKey: .algorithm) as! String
        kid = decoder.decodeObject(forKey: .keyID) as! String
        e = decoder.decodeObject(forKey: .exponent) as! String
        n = decoder.decodeObject(forKey: .modulus) as! String
    }
    init(kid: String, kty: KeyType, alg: String, e: String, n: String) {
        self.kid = kid
        self.e = e
        self.n = n
        self.kty = kty
        self.alg = alg
        
    }
    init?(kid: String, kty: String, alg: String, e: String, n: String) {
        guard let keyType = KeyType(rawValue: kty) else {
            return nil
            
        }
        self.kid = kid
        self.e = e
        self.n = n
        self.kty = keyType
        self.alg = alg
        
    }
    
    init?(json: NSDictionary) {
        guard let kid = json["kid"] as? String,
            let e = json["e"] as? String,
            let n = json["n"] as? String,
            let ktyJson = json["kty"] as? String,
            let alg = json["alg"] as? String
            else {
                return nil
        }
        
        guard let kty = KeyType(rawValue: ktyJson) else {
            return nil
            
        }
        self.kid = kid
        self.e = e
        self.n = n
        self.kty = kty
        self.alg = alg
        
    }
    
    class func jwkFromSecKey(publicKey: SecKey, kid: String) -> JWK {
        let keyData = RSAUtil.secKeyRefToData(inputKey: publicKey)
        let (modulus, exponent) = RSAUtil.splitIntoComponents(keyData: keyData!)!
        
        return JWK(kid: kid, kty: JWK.KeyType.RSA, alg: "RSA512", e: Base64URL.encode(exponent), n: Base64URL.encode(modulus))

    }
    class func jwkToSecKey(jwk: JWK) -> SecKey? {
        let exponent = Base64URL.decode(jwk.e)
        let modulus =  Base64URL.decode(jwk.n)
        
        let tag = "com.mcsi.op." + jwk.kid
        return RSAUtil.insertPublicKey(tag: tag, exponent: exponent, modulus: modulus)

    }
    class func jwkSetFromJson(jsonString: String) -> Dictionary<String, JWK> {
        let json =  try? JSONSerialization.jsonObject(with: jsonString.data(using: String.Encoding.utf8)!, options: []) as? [String: Any]
        
        
        var keys : Dictionary<String, JWK> = [:]
        let jsonKeys = json?["keys"] as! [Any]
        for case let result as NSDictionary in jsonKeys {
            if let key = JWK(json: result) {
                keys[key.kid] = key
            }
        }
        return keys
    }
    class func jwkListFromJson(jsonString: String) -> [JWK] {
        let json =  try? JSONSerialization.jsonObject(with: jsonString.data(using: String.Encoding.utf8)!, options: []) as? [String: Any]
        
        
        var keys: [JWK] = []
        let jsonKeys = json?["keys"] as! [Any]
        for case let result as NSDictionary in jsonKeys {
            if let key = JWK(json: result) {
                keys.append(key)
            }
        }
        return keys
    }
    func toJson() throws -> String {
        do {
            let jwk: [String: String] = ["kid": self.kid, "alg": self.alg, "kty": self.kty.rawValue, "e": self.e, "n": self.n]
            
            let data = try JSONSerialization.data(withJSONObject: jwk, options: [])
            return String(data: data, encoding: String.Encoding.utf8)!
        }
        
        catch {
            // AnalyticsService.shared.trackError(errorCode: AnalyticsErrorCode.err120, body: AnalyticsErrorBody.err120ToJsonMethodFailure)
            // throw BcscError.err_120_toJson_method_failure
            throw error // Just throw the original JSON error instead
        }
    }
}

extension String {
    fileprivate static let keyType = "keyType"
    fileprivate static let algorithm = "algorithm"
    fileprivate static let keyID = "keyID"
    fileprivate static let exponent = "exponent"
    fileprivate static let modulus = "modulus"
}
