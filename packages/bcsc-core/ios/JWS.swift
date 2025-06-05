//
//  JWS.swift
//  jose
//
//  Created by marcosc on 2016-12-06.
//  Copyright © 2016 idim. All rights reserved.
//

import Foundation

class JWS {
    enum State {
        case unsigned, signed, verified
    }
    private var state: State
    let header: JWSHeader
    let payload: String
    var jwtPayload: JWTClaimsSet?
    private var signature: String

    private init(header: JWSHeader, payload: String, signature: String) {
        self.header = header
        self.payload = payload
        self.signature = signature
        self.state = State.signed
    }
    init(header: JWSHeader, payload: JWTClaimsSet) {
        self.jwtPayload = payload
        self.header = header
        self.payload = ""
        self.signature = ""
        self.state = State.unsigned
        
    }
    class func parse(s: String) throws -> JWS {
        let parts: [String] = s.components(separatedBy: ".")
        
        if(parts.count != 3) {
            throw JOSEException("Expected serialized JWS to have 3 parts but has [\(parts.count)]")
        }
        
        return try JWS(header: JWSHeader.parse(parts[0]), payload: parts[1], signature: parts[2])
    }
    func sign(signer: JWSSigner) throws {
        if(State.unsigned == state) {
            let signatureInput = try header.serialize() + "." + Base64URL.encode((jwtPayload?.toJSONString())!)
            if let signingInput = signatureInput.data(using: String.Encoding.utf8) {
                let signatureData = try signer.sign(alg: header.alg, signingInput: signingInput.arrayOfBytes())
                signature = Base64URL.encode(signatureData)
                state = State.signed
            } else {
                throw JOSEException("The JWS object couldn't generate the input to sign")
            }
        } else {
            throw JOSEException("The JWS object must be in an unsigned state to sign")
        }
    }
    func serialize() throws -> String {
        if(State.unsigned == state && header.alg.name != "none") {
            throw JOSEException("The JWS object must be in a signed or verified state to serialize")
        }
        
        let compact = try header.serialize() + "." + Base64URL.encode((jwtPayload?.toJSONString())!) + "." + signature
        return compact
    }
    
    func getJwtClaimsSet() throws -> JWTClaimsSet? {
        switch state {
        case .verified:
            return try JWTClaimsSet.parse(payload)
        case .signed:
            return try JWTClaimsSet.parse(payload)
        case .unsigned:
            return jwtPayload
        }
    }
    func verify(verifier: JWSVerifier) throws -> Bool {
        
        let signatureInput = try header.serialize() + "." + payload
        
        if let signingInput = signatureInput.data(using: String.Encoding.utf8) {
            if (try verifier.verify(header: header, signingInput: signingInput, signature: signature)) {
                state = State.verified
                return true
            }
            return false
        }

        throw JOSEException("Cannot verify signature with input [\(signatureInput)]")
    }
    var status : State {
        return state
    }
}
