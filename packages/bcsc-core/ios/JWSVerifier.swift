//
//  JWSVerifier.swift
//  jose
//
//  Created by marcosc on 2016-12-08.
//  Copyright © 2016 idim. All rights reserved.
//

import Foundation

protocol JWSVerifier {
    func verify(header: JWSHeader, signingInput: Data, signature: String) throws -> Bool
}

class RSAVerifier: JWSVerifier {
    let rsaKey: SecKey
    init(rsaKey:SecKey) {
        self.rsaKey = rsaKey
    }
    func calculateDigest(alg: JWSAlgorithm, signedData: [UInt8]) throws -> [UInt8]? {
        if(JWSAlgorithm.RS256.name == alg.name) {
            var signedDataDigest = Array<UInt8>(repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
            if (CC_SHA256(signedData, CC_LONG(signedData.count), &signedDataDigest)) != nil {
                return signedDataDigest
            }
            
        } else if JWSAlgorithm.RS384.name == alg.name {
            var signedDataDigest = Array<UInt8>(repeating: 0, count: Int(CC_SHA384_DIGEST_LENGTH))
            if (CC_SHA384(signedData, CC_LONG(signedData.count), &signedDataDigest)) != nil {
                return signedDataDigest
            }
            
            
        } else if JWSAlgorithm.RS512.name == alg.name {
            var signedDataDigest = Array<UInt8>(repeating: 0, count: Int(CC_SHA512_DIGEST_LENGTH))
            if (CC_SHA512(signedData, CC_LONG(signedData.count), &signedDataDigest)) != nil {
                return signedDataDigest
            }
        } else {
             throw JOSEException("Unsupported JWS algorithm [\(alg.name)]")
        }
        return nil
    }
    func verify(header: JWSHeader, signingInput: Data, signature: String) throws -> Bool {
        
        if header.alg.name.isEmpty {
             throw JOSEException("Can not verify signature. JWEHeader is missing an algorithm")
        }
        
        if(JWSAlgorithm.RS256.name == header.alg.name ||
            JWSAlgorithm.RS384.name == header.alg.name ||
            JWSAlgorithm.RS512.name == header.alg.name) {
            // verify signature
            
            if let padding = header.alg.padding {
                
                let signedData = signingInput.arrayOfBytes()
                
                let signatureData = Base64URL.decode(signature)
                let signatureBytes = signatureData.withUnsafeBytes {
                    [UInt8](UnsafeBufferPointer(start: $0, count: signatureData.count))
                }
                let signatureLength = SecKeyGetBlockSize(rsaKey)
                
                // calculate digest into hashbytes
                if let digest = try calculateDigest(alg: header.alg, signedData: signedData) {
                    let status = SecKeyRawVerify(rsaKey,
                                                 padding,
                                                 digest,
                                                 digest.count,
                                                 signatureBytes,
                                                 signatureLength);
                    
//                    print("RSAVerifier.verify status=\(status)")
                    return status == errSecSuccess;
                } else {
                    
                    // unable to calculate digest
                    return false
                }
                
            } else {
                 throw JOSEException("Header does not specify padding and should for JWS algorithm [\(header.alg.name)]")
            }
            
        } else {
             throw JOSEException("Unsupported JWS algorithm [\(header.alg.name)]")
        }
    }
}
