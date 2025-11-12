import CommonCrypto

class HMAC {
    
    /**
     Computes an HMAC for the given data.
     
     - Parameters:
       - macKey: The secret key.
       - algorithm: The CCHmacAlgorithm (e.g., kCCHmacAlgSHA256, kCCHmacAlgSHA512).
       - data: The data to authenticate.
     - Returns: The full HMAC as Data.
     */
    class func compute(macKey: Data, algorithm: CCHmacAlgorithm, data: Data) -> Data {
        
        // Determine the correct digest length for the algorithm
        let digestLength: Int
        switch Int(algorithm) {
            case kCCHmacAlgSHA1:
                digestLength = Int(CC_SHA1_DIGEST_LENGTH)
            case kCCHmacAlgSHA256:
                digestLength = Int(CC_SHA256_DIGEST_LENGTH)
            case kCCHmacAlgSHA384:
                digestLength = Int(CC_SHA384_DIGEST_LENGTH)
            case kCCHmacAlgSHA512:
                digestLength = Int(CC_SHA512_DIGEST_LENGTH)
            default:
                // This should not be hit if using standard JWE algorithms
                // You could throw an error here instead
                fatalError("Unsupported HMAC Algorithm")
        }
        
        var resultData = Data(count: digestLength)
        
        // Use withUnsafeBytes to get pointers directly from the Data objects
        // This avoids the extra [UInt8] copy you had before
        _ = resultData.withUnsafeMutableBytes { resultPtr in
            macKey.withUnsafeBytes { keyPtr in
                data.withUnsafeBytes { dataPtr in
                    CCHmac(
                        algorithm,
                        keyPtr.baseAddress, keyPtr.count,
                        dataPtr.baseAddress, dataPtr.count,
                        resultPtr.baseAddress
                    )
                }
            }
        }
        
        return resultData
    }
    
    /**
     Computes HMAC for JWE authenticated encryption.
     This method combines AAD, IV, ciphertext, and AL (Additional authenticated data Length) 
     according to the JWE specification.
     
     - Parameters:
       - macKey: The MAC key as byte array
       - aad: Additional authenticated data
       - iv: Initialization vector
       - e: Encrypted ciphertext
     - Returns: The HMAC as Data
     */
    class func compute(macKey: [UInt8], aad: [UInt8], iv: [UInt8], e: [UInt8]) -> Data {
        // Create the data to MAC according to JWE spec:
        // MAC(MAC_KEY, A || IV || E || AL)
        // where AL is the number of bits in A expressed as a 64-bit big-endian integer
        
        var dataToMac = Data()
        
        // 1. Additional authenticated data (A)
        dataToMac.append(Data(aad))
        
        // 2. Initialization vector (IV)
        dataToMac.append(Data(iv))
        
        // 3. Encrypted ciphertext (E)
        dataToMac.append(Data(e))
        
        // 4. AL - Length of additional authenticated data in bits as 64-bit big-endian
        let aadBitLength = UInt64(aad.count * 8)
        let alData = toByteArray(aadBitLength.bigEndian)
        dataToMac.append(Data(alData))
        
        // 5. Compute HMAC using SHA-256 (standard for JWE)
        return compute(macKey: Data(macKey), algorithm: CCHmacAlgorithm(kCCHmacAlgSHA256), data: dataToMac)
    }
    
    // Your helper function is perfect
    class func toByteArray<T>(_ value: T) -> [UInt8] {
        var value = value
        return withUnsafeBytes(of: &value) { Array($0) }
    }
}
