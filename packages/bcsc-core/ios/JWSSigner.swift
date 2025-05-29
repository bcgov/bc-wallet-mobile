//
//  JWSSigner.swift
//  jose
//
//  Created by marcosc on 2016-12-09.
//  Copyright © 2016 idim. All rights reserved.
//

import Foundation
protocol JWSSigner {
    func sign(alg: JWSAlgorithm, signingInput: [UInt8]) throws -> Data 
}
class RSASigner: JWSSigner {
    let privateKey: SecKey
    init(privateKey: SecKey) {
        self.privateKey = privateKey
    }
    func sign(alg: JWSAlgorithm, signingInput: [UInt8]) throws -> Data {
        // generate hash of the plain data to sign
        
        var hashData = Data(count: alg.digestLength)
        let hash = hashData.withUnsafeMutableBytes({ (bytes: UnsafeMutablePointer<UInt8>) -> UnsafeMutablePointer<UInt8> in
            return bytes
        })
        
        switch alg.name {
        case JWSAlgorithm.RS256.name:
            CC_SHA256(signingInput,
                      CC_LONG(signingInput.count),
                      hash)
        case JWSAlgorithm.RS384.name:
            CC_SHA384(signingInput,
                      CC_LONG(signingInput.count),
                      hash)
        case JWSAlgorithm.RS512.name:
            CC_SHA512(signingInput,
                      CC_LONG(signingInput.count),
                      hash)
        default:
            throw JOSEException("Unsupported JWS algorightm \(alg.name)")
        }
        
        var resultData = Data(count: SecKeyGetBlockSize(privateKey))
        let resultPointer = resultData.withUnsafeMutableBytes({ (bytes: UnsafeMutablePointer<UInt8>) -> UnsafeMutablePointer<UInt8> in
            return bytes
        })
        var resultLength = resultData.count
        
        // sign the hash
        let status = SecKeyRawSign(privateKey, alg.padding!, hash, hashData.count, resultPointer, &resultLength)
        if status != errSecSuccess {
            throw JOSEException("Unable to sign message: \(status)")
        }
        hash.deinitialize(count: alg.digestLength)
        return resultData
    }
}
 
