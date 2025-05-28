//
//  HMAC.swift
//  jose
//
//  Created by marcosc on 2016-12-08.
//  Copyright © 2016 idim. All rights reserved.
//

import Foundation
class HMAC {
    class func compute(macKey: [UInt8], aad: [UInt8], iv: [UInt8], e: [UInt8]) -> Data {
        // K the key
        // P plain text
        // A additional authn data
        // IV initialization vector
        // E ciphertext
        // AL The octet string AL is equal to the number of bits in the Additional Authenticated Data A expressed as a 64-bit unsigned big-endian integer.
        
        //        M = MAC(MAC_KEY, A || IV || E || AL),
        
        let key = macKey
        //let inputLength = aad.count + iv.count + e.count + 1
        var input = Data()
        input.append(aad, count: aad.count)
        input.append(iv, count: iv.count)
        input.append(e, count: e.count)
        let al = toByteArray(UInt64(aad.count*8).bigEndian)
        input.append(al, count: al.count)
        
        
        let inputBytes = input.withUnsafeBytes{ [UInt8](UnsafeBufferPointer(start: $0, count: input.count))}
//        print(inputBytes)
        var resultData = Data(count: Int(CC_SHA256_DIGEST_LENGTH))
        
        _ = resultData.withUnsafeMutableBytes ({
            (resultBytes: UnsafeMutablePointer<UInt8>) -> UnsafeMutablePointer<UInt8> in
            CCHmac(CCHmacAlgorithm(kCCHmacAlgSHA256), key, key.count, inputBytes, input.count, resultBytes)
            return resultBytes
        })
//        print(resultData.arrayOfBytes())
        
        return resultData
    }
    class func compute(macKey: Data, aad: Data, iv: Data, e: Data) -> Data {
        return compute(macKey: macKey.arrayOfBytes(), aad: aad.arrayOfBytes(), iv: iv.arrayOfBytes(), e: e.arrayOfBytes())
    }
    class func toByteArray<T>(_ value: T) -> [UInt8] {
        var value = value
        return withUnsafeBytes(of: &value) { Array($0) }
    }
    
    
}
