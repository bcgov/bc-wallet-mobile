//
//  JWE.swift
//  jose
//
//  Created by marcosc on 2016-12-06.
//  Copyright © 2016 idim. All rights reserved.
//

import Foundation

extension Data {
    public func arrayOfBytes() -> [UInt8] {
        let count = self.count / MemoryLayout<UInt8>.size
        var bytesArray = [UInt8](repeating: 0, count: count)
        (self as NSData).getBytes(&bytesArray, length:count * MemoryLayout<UInt8>.size)
        return bytesArray
    }

}

/// JWE
class JWE {
    //        BASE64URL(UTF8(JWE Protected Header)) || '.' ||
    //            BASE64URL(JWE Encrypted Key) || '.' ||
    //            BASE64URL(JWE Initialization Vector) || '.' ||
    //            BASE64URL(JWE Ciphertext) || '.' ||
    //            BASE64URL(JWE Authentication Tag)
    let state: State
    let header: JWEHeader
    var encryptedKey: String = ""
    var iv: String = ""
    var cipherText: String = ""
    var authTag: String = ""

    private var payload: String = ""
    
    enum State {
        case decrypted
        case encrypted
        case unencrypted
    }

    
    private init(header: JWEHeader, encryptedKey: String, iv: String, cipherText: String, authTag: String) {
        self.header = header
        self.encryptedKey = encryptedKey
        self.iv = iv
        self.cipherText = cipherText
        self.authTag = authTag
        self.state = State.encrypted
    }
    /// initialize an unencrypted JWE
    ///
    /// - Parameters:
    ///   - header: a JWE Header
    ///   - payload: a base64URL encoded string
    init(header: JWEHeader, payload: String) {
        self.header = header
        self.payload = payload
        self.state = State.unencrypted
    }
    
    func encrypt(withEncrypter: JWEEncrypter) throws {
        if(State.unencrypted == state) {
            try withEncrypter.encrypt(jwe: self, clearText: (self.payload.data(using: String.Encoding.utf8)?.arrayOfBytes())!)
        } else {
            throw JOSEException("JWE must be in unencrypted state to encrypt, but is \(state)")
        }
        
    }
    func decrypt(withDecrypter: JWEDecrypter) throws -> String {
        if (State.encrypted == state) {
            let plainText = try withDecrypter.decrypt(jwe: self)
            payload = String(bytes: plainText.arrayOfBytes(), encoding: String.Encoding.utf8) ?? ""
        }
        return payload
        
    }
    class func parse(s: String) throws -> JWE {
        let parts: [String] = s.components(separatedBy: ".")
        if(parts.count != 5) {
            throw JOSEException("Expected serialized JWE to have 5 parts but has [\(parts.count)]")
        }
        return try JWE(header: JWEHeader.parse(parts[0]), encryptedKey: parts[1], iv: parts[2], cipherText: parts[3], authTag: parts[4])
        
    }
    func serialize() throws -> String {
        return try header.serialize() + "." + encryptedKey + "." + iv + "." + cipherText + "." + authTag
        
    }
}
