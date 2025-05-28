//
//  JWECrypto.swift
//  jose
//
//  Created by marcosc on 2016-12-08.
//  Copyright © 2016 idim. All rights reserved.
//

import Foundation

protocol JWEDecrypter {
    func decrypt(jwe: JWE) throws -> Data
}

protocol JWEEncrypter {
    func encrypt(jwe: JWE, clearText: [UInt8]) throws
}

class RSAEncrypter: JWEEncrypter {
    let publicKey: SecKey
    init(publicKey: SecKey) {
        self.publicKey = publicKey
    }
    
    func encrypt(jwe: JWE, clearText: [UInt8]) throws {
        
        // generate clear cek
        let nbytes = jwe.header.enc.cekBitLength / 8
        let cekMaterial = SecureRandom.nextBytes(count: nbytes)
        // encrypt cek
        let cek = try Base64URL.encode(RSA1_5.encrypteCEK(publicKey: publicKey, cekMaterial: cekMaterial))
        
        // encrypt the clearText
        
        
        // Compose the AAD
        let aad = try [UInt8](jwe.header.serialize().utf8)
        
        // Encrypt the plain text according to the JWE enc
        
        // Generate a random 128 bit (16 byte) Initialisation Vector(IV) for use in AES-CBC encryption.
        let iv = SecureRandom.nextBytes(count: AESCBC.IV_BIT_LENGTH/8)
        
        let compositeKey = try CompositeKey(cekMaterial)
        
        
        if let cipherText = try AESCBC.encryptAuthenticated(encKey: compositeKey.encKey, iv: iv, clearText: clearText, aad: aad) {
            
            // Do MAC
            let hmac = HMAC.compute(macKey: compositeKey.macKey.arrayOfBytes(), aad: aad, iv: iv, e: (cipherText.arrayOfBytes()))
            
            let authTag = hmac.subdata(in: 0 ..< compositeKey.truncatedMacLength)
            jwe.encryptedKey = cek
            jwe.iv =  Base64URL.encode(iv)
            jwe.authTag = Base64URL.encode(authTag)
            jwe.cipherText = Base64URL.encode(cipherText)
        } else {
            throw JOSEException("Couldn't encrypt clearText")
        }
    }
    
}
class SecureRandom {
    /// Generates a random byte array
    ///
    /// - Parameter count: the desired number of random bytes
    /// - Returns: The random byte array with the given count number of bytes.
    class func nextBytes(count: Int) -> [UInt8] {
        var data = Data(count: count)
        let bytes = data.withUnsafeMutableBytes({ (bytes: UnsafeMutablePointer<UInt8>) -> UnsafeMutablePointer<UInt8> in
            return bytes
        })

        let status = SecRandomCopyBytes(kSecRandomDefault, count, bytes)
//        print(status)
        return data.arrayOfBytes()
        
    }
}
class RSADecrypter: JWEDecrypter {
    let privateKey: SecKey
    init(privateKey: SecKey) {
        self.privateKey = privateKey
    }
    func decrypt(jwe: JWE) throws -> Data {
        // Validate required JWE parts
        if (jwe.encryptedKey.isEmpty) {
            throw JOSEException("Missing JWE encrypted key");
        }
        
        if (jwe.iv.isEmpty) {
            throw JOSEException("Missing JWE initialization vector (IV)");
        }
        
        if (jwe.authTag.isEmpty) {
            throw JOSEException("Missing JWE authentication tag");
        }
        if (JWEAlgorithm.RSA1_5.name == jwe.header.alg.name) {
            
            let keyLength = jwe.header.enc.cekBitLength
            
            // Protect against MMA attack by generating random CEK on failure,
            // see http://www.ietf.org/mail-archive/web/jose/current/msg01832.html
            var secretKey: Data
            if let cek = RSA1_5.decryptCEK(privateKey: privateKey, encryptedCEK: jwe.encryptedKey, bitLength: keyLength) {
                secretKey = cek
            } else {
                // CEK length mismatch, signalled by null instead of
                // exception to prevent MMA attack
                secretKey = Data(SecureRandom.nextBytes(count: keyLength))
            }
            
            // decrypt content
            
            let aad = try Data([UInt8](jwe.header.serialize().utf8))
            let iv = Base64URL.decode(jwe.iv)
            let e = Base64URL.decode(jwe.cipherText)
            let at = Base64URL.decode(jwe.authTag)
            
            if(jwe.header.enc.name == EncryptionMethod.A128CBC_HS256.name ||
                jwe.header.enc.name == EncryptionMethod.A192CBC_HS384.name ||
                jwe.header.enc.name == EncryptionMethod.A256CBC_HS512.name) {
                
                if let plainText = try AESCBC.decryptAuthenticated(secretKey: secretKey, iv: iv, e: e, aad: aad, authTag: at) {
                    return plainText
                } else {
                    throw JOSEException("Decryption failed")
                }
            } else {
                throw JOSEException("Unsupported JWE encryption method [\(jwe.header.enc.name)]")
            }
            // end decrypt content
        }
        throw JOSEException("Unsupported JWE algorithm [\(jwe.header.alg.name)]")
    }
    
    
}
class CompositeKey {
    //        MAC_KEY = initial MAC_KEY_LEN octets of K,
    //        ENC_KEY = final ENC_KEY_LEN octets of K,
    
    let secretKey: Data
    let macKey: Data
    let encKey: Data
    let truncatedMacLength: Int
    convenience init(_ secretKeyBytes: [UInt8]) throws {
        try self.init(Data(secretKeyBytes))
    }
    init(_ secretKey: Data) throws {
        self.secretKey = secretKey

        if (secretKey.count == 32) {
            
            // AES_128_CBC_HMAC_SHA_256
            // 256 bit key -> 128 bit MAC key + 128 bit AES key
            macKey = secretKey.subdata(in: 0 ..< 16)
            encKey = secretKey.subdata(in: 16 ..< 32)
            truncatedMacLength = 16;
            
        } else if (secretKey.count == 48) {
            
            // AES_192_CBC_HMAC_SHA_384
            // 384 bit key -> 129 bit MAC key + 192 bit AES key
            macKey = secretKey.subdata(in: 0 ..< 24)
            encKey = secretKey.subdata(in: 24 ..< 48)
            truncatedMacLength = 24;
            
            
        } else if (secretKey.count == 64) {
            
            // AES_256_CBC_HMAC_SHA_512
            // 512 bit key -> 256 bit MAC key + 256 bit AES key
            macKey = secretKey.subdata(in: 0 ..< 32)
            encKey = secretKey.subdata(in: 32 ..< 64)
            truncatedMacLength = 32;
            
        } else {
            throw JOSEException("Unsupported AES/CBC/PKCS5Padding/HMAC-SHA2 key length, must be 256, 384 or 512 bits, but is \(secretKey.count)")
        }
        
    }
}
class AESCBC {
    static let IV_BIT_LENGTH = 128
    
    /// Encrypts the specified plain text using AES/CBC/PKCS5Padding/HMAC-SHA2.
    /// See RFC 7518 (JWA), section 5.2.2.1
    /// See draft-mcgrew-aead-aes-cbc-hmac-sha2-01
    /// - Parameters:
    ///   - encKey: The secret key. Must be 256 or 512 bits long.
    ///   - iv: The initialisation vector (IV). Must not be null
    ///   - clearText: The plain text.
    ///   - aad: The additional authenticated data.
    /// - Returns: the encrypted payload
    /// - Throws: JOSEException if the encryption can't be performed
    class func encryptAuthenticated(encKey: Data, iv: [UInt8], clearText: [UInt8], aad: [UInt8]) throws -> Data? {
        // Extract MAC + AES/CBC keys from input secret key
        if let cipherText = encrypt(encKey: encKey, iv: iv, clearText: clearText) {
            return cipherText
        }
        return nil
    }
    private class func encrypt(encKey: Data, iv: [UInt8], clearText: [UInt8]) -> Data? {
        let keyDataBytes = encKey.withUnsafeBytes {
            [UInt8](UnsafeBufferPointer(start: $0, count: encKey.count))
        }
        let cryptor = Cryptor(operation:.encrypt, algorithm:.aes, padding:kCCOptionPKCS7Padding, key:keyDataBytes, iv:iv)
        
        if let cipherText = cryptor.update(data: Data(clearText))?.final() {
            if(cipherText.count > 0) {
                return Data(bytes: cipherText, count: cipherText.count)
            }
        }
        return nil
    }
    
    class func decryptAuthenticated(secretKey: Data, iv: Data, e: Data, aad: Data, authTag: Data) throws -> Data? {
        //  MAC_KEY = initial MAC_KEY_LEN octets of K,
        // ENC_KEY = final ENC_KEY_LEN octets of K,
        let compositeKey = try CompositeKey(secretKey)
        // K the key
        // P plain text
        // A additional authn data
        // IV initialization vector
        // E ciphertext
        // AL The octet string AL is equal to the number of bits in the Additional Authenticated Data A expressed as a 64-bit unsigned big-endian integer.
        
        
        
        //        E = CBC-PKCS7-ENC(ENC_KEY, P),
        //        M = MAC(MAC_KEY, A || IV || E || AL),
        //        T = initial T_LEN octets of M.
        
        
        let m = HMAC.compute(macKey: compositeKey.macKey, aad: aad, iv: iv, e: e)
        let t = m.subdata(in: 0 ..< compositeKey.truncatedMacLength)
        
        let macCheckPassed = areEqual(a: t.arrayOfBytes(), b: authTag.arrayOfBytes())
        
        let keyDataBytes = compositeKey.encKey.withUnsafeBytes {
            [UInt8](UnsafeBufferPointer(start: $0, count: compositeKey.encKey.count))
        }
        let cryptor = Cryptor(operation:.decrypt, algorithm:.aes, padding:kCCOptionPKCS7Padding, key:keyDataBytes, iv:iv.arrayOfBytes())
        if let plainText = cryptor.update(data: e)?.final() {
            if(plainText.count > 0) {
                return Data(bytes: plainText, count: plainText.count)
            }
        }
        return nil
    }
    class func areEqual(a: [UInt8], b: [UInt8]) -> Bool {
        var result = UInt8(0)
        for i in 0 ..< a.count {
            result |= a[i] ^ b[i];
        }
        return (result == 0)
    }
    
}
///
/// Enumerates available algorithms
///
public enum Algorithm
{
    /// Advanced Encryption Standard
    case aes,
    /// Data Encryption Standard
    des,
    /// Triple DES
    tripleDES,
    /// CAST
    cast,
    /// RC2
    rc2,
    /// Blowfish
    blowfish
    
    /// Blocksize, in bytes, of algorithm.
    public func blockSize() -> Int {
        switch self {
        case .aes : return kCCBlockSizeAES128
        case .des : return kCCBlockSizeDES
        case .tripleDES : return kCCBlockSize3DES
        case .cast : return kCCBlockSizeCAST
        case .rc2: return kCCBlockSizeRC2
        case .blowfish : return kCCBlockSizeBlowfish
        }
    }
    /// Native, CommonCrypto constant for algorithm.
    func nativeValue() -> CCAlgorithm
    {
        switch self {
        case .aes : return CCAlgorithm(kCCAlgorithmAES)
        case .des : return CCAlgorithm(kCCAlgorithmDES)
        case .tripleDES : return CCAlgorithm(kCCAlgorithm3DES)
        case .cast : return CCAlgorithm(kCCAlgorithmCAST)
        case .rc2: return CCAlgorithm(kCCAlgorithmRC2)
        case .blowfish : return CCAlgorithm(kCCAlgorithmBlowfish)
        }
    }
    
    /// Determines the valid key size for this algorithm
    func validKeySize() -> ValidKeySize {
        switch self {
        case .aes : return .discrete([kCCKeySizeAES128, kCCKeySizeAES192, kCCKeySizeAES256])
        case .des : return .fixed(kCCKeySizeDES)
        case .tripleDES : return .fixed(kCCKeySize3DES)
        case .cast : return .range(kCCKeySizeMinCAST, kCCKeySizeMaxCAST)
        case .rc2: return .range(kCCKeySizeMinRC2, kCCKeySizeMaxRC2)
        case .blowfish : return .range(kCCKeySizeMinBlowfish, kCCKeySizeMaxBlowfish)
        }
    }
    
    /// Tests if a given keySize is valid for this algorithm
    func isValid(keySize: Int) -> Bool {
        return self.validKeySize().isValid(keySize: keySize)
    }
    
    /// Calculates the next, if any, valid keySize greater or equal to a given `keySize` for this algorithm
    func padded(keySize: Int) -> Int? {
        return self.validKeySize().padded(keySize: keySize)
    }
    
}
public enum ValidKeySize {
    case fixed(Int)
    case discrete([Int])
    case range(Int,Int)
    
    /**
     Determines if a given `keySize` is valid for this algorithm.
     */
    func isValid(keySize: Int) -> Bool {
        switch self {
        case .fixed(let fixed): return (fixed == keySize)
        case .range(let min, let max): return ((keySize >= min) && (keySize <= max))
        case .discrete(let values): return values.contains(keySize)
        }
    }
    
    /**
     Determines the next valid key size; that is, the first valid key size larger
     than the given value.
     Will return `nil` if the passed in `keySize` is greater than the max.
     */
    func padded(keySize: Int) -> Int? {
        switch self {
        case .fixed(let fixed):
            return (keySize <= fixed) ? fixed : nil
        case .range(let min, let max):
            return (keySize > max) ? nil : ((keySize < min) ? min : keySize)
        case .discrete(let values):
            return values.sorted().reduce(nil) { answer, current in
                return answer ?? ((current >= keySize) ? current : nil)
            }
        }
    }
    
    
}
///
/// Enumerates encryption mode
///
public enum Mode
{
    case ECB
    case CBC
    case CFB
    case CTR
//    case F8	//		= 5, // Unimplemented for now (not included)
//    case LRW//		= 6, // Unimplemented for now (not included)
    case OFB
//    case XTS
    case RC4
    case CFB8
    
    func nativeValue() -> CCMode {
        switch self {
        case .ECB : return CCMode(kCCModeECB)
        case .CBC : return CCMode(kCCModeCBC)
        case .CFB : return CCMode(kCCModeCFB)
        case .CTR : return CCMode(kCCModeCTR)
//        case .F8 : return CCMode(kCCModeF8)// Unimplemented for now (not included)
//        case .LRW : return CCMode(kCCModeLRW)// Unimplemented for now (not included)
        case .OFB : return CCMode(kCCModeOFB)
//        case .XTS : return CCMode(kCCModeXTS)
        case .RC4 : return CCMode(kCCModeRC4)
        case .CFB8 : return CCMode(kCCModeCFB8)
        }
    }
}

enum Operation {
    case encrypt, decrypt
    /// Convert to native `CCOperation`
    func nativeValue() -> CCOperation {
        switch self {
        case .encrypt : return CCOperation(kCCEncrypt)
        case .decrypt : return CCOperation(kCCDecrypt)
        }
    }
}
///
/// Links the native CommonCryptoStatus enumeration to Swiftier versions.
///
public enum Status : CCCryptorStatus, CustomStringConvertible, Error
{
    /// Successful
    case success,
    /// Parameter Error
    paramError,
    /// Buffer too Small
    bufferTooSmall,
    /// Memory Failure
    memoryFailure,
    /// Alignment Error
    alignmentError,
    /// Decode Error
    decodeError,
    /// Unimplemented
    unimplemented,
    /// Overflow
    overflow,
    /// Random Number Generator Err
    rngFailure
    
    ///
    /// Converts this value to a native `CCCryptorStatus` value.
    ///
    public func toRaw() -> CCCryptorStatus
    {
        switch self {
        case .success:          return CCCryptorStatus(kCCSuccess)
        case .paramError:       return CCCryptorStatus(kCCParamError)
        case .bufferTooSmall:   return CCCryptorStatus(kCCBufferTooSmall)
        case .memoryFailure:    return CCCryptorStatus(kCCMemoryFailure)
        case .alignmentError:   return CCCryptorStatus(kCCAlignmentError)
        case .decodeError:      return CCCryptorStatus(kCCDecodeError)
        case .unimplemented:    return CCCryptorStatus(kCCUnimplemented)
        case .overflow:         return CCCryptorStatus(kCCOverflow)
        case .rngFailure:       return CCCryptorStatus(kCCRNGFailure)
        }
    }
    
    ///
    /// Human readable descriptions of the values. (Not needed in Swift 2.0?)
    ///
    static let descriptions = [ success: "Success",                 paramError: "ParamError",
                                bufferTooSmall: "BufferTooSmall",   memoryFailure: "MemoryFailure",
                                alignmentError: "AlignmentError",   decodeError: "DecodeError",
                                unimplemented: "Unimplemented",     overflow: "Overflow",
                                rngFailure: "RNGFailure"]
    
    ///
    /// Obtain human-readable string from enum value.
    ///
    public var description: String
    {
        return (Status.descriptions[self] != nil) ? Status.descriptions[self]! : ""
    }
    ///
    /// Create enum value from raw `CCCryptorStatus` value.
    ///
    public static func fromRaw(status: CCCryptorStatus) -> Status?
    {
        var from = [ kCCSuccess: success, kCCParamError: paramError,
                     kCCBufferTooSmall: bufferTooSmall, kCCMemoryFailure: memoryFailure,
                     kCCAlignmentError: alignmentError, kCCDecodeError: decodeError, kCCUnimplemented: unimplemented,
                     kCCOverflow: overflow, kCCRNGFailure: rngFailure]
        return from[Int(status)]
        
    }
}
class Cryptor {
    fileprivate var status: Status
    fileprivate var context = UnsafeMutablePointer<CCCryptorRef?>.allocate(capacity: 1)
    var accumulator : [UInt8] = []
    
    convenience init(operation: Operation, algorithm: Algorithm, padding: Int, key: [UInt8], iv : [UInt8]) {
        guard let paddedKeySize = algorithm.padded(keySize:key.count) else {
            fatalError("FATAL_ERROR: Invalid key size")
        }
        
        self.init(operation:operation, algorithm:algorithm, padding:padding, keyBuffer:zeroPad(array: key, blockSize: paddedKeySize), keyByteCount:paddedKeySize, ivBuffer:iv)
    }
    
    /**
     - parameter operation: the operation to perform see Operation (Encrypt, Decrypt)
     - parameter algorithm: the algorithm to use see Algorithm (AES, DES, TripleDES, CAST, RC2, Blowfish)
     - parameter mode: the mode used by algorithm see Mode (ECB, CBC, CFB, CTR, F8, LRW, OFB, XTS, RC4, CFB8)
     - parameter padding: the padding to use. When using NoPadding: each block of UPDATE must be correct size
     - parameter keyBuffer: pointer to key buffer
     - parameter keyByteCount: number of bytes in the key
     - parameter ivBuffer: initialization vector buffer
     
     */
    public init(operation: Operation, algorithm: Algorithm, padding: Int, keyBuffer: UnsafeRawPointer, keyByteCount: Int, ivBuffer: UnsafeRawPointer) {
        
        guard algorithm.isValid(keySize: keyByteCount) else  { fatalError("FATAL_ERROR: Invalid key size.") }
        
        let rawStatus = CCCryptorCreate(operation.nativeValue(), algorithm.nativeValue(), CCOptions(padding), keyBuffer, keyByteCount, ivBuffer, context)
        if let status = Status.fromRaw(status: rawStatus)
        {
            self.status = status
        }
        else
        {
            fatalError("CCCryptorCreate returned unexpected status.")
        }
        
    }
    
    
    func update(data: Data) -> Cryptor? {
        update(buffer: (data as NSData).bytes, byteCount:size_t(data.count))
        return self.status == Status.success ? self : nil
        
    }
    /**
     Retrieves the encrypted or decrypted data.
     
     - returns: the encrypted or decrypted data or nil if an error occured.
     */
    func final() -> [UInt8]?
    {
        let byteCount = Int(self.getOutputLength(inputByteCount: 0, isFinal: true))
        var dataOut = Array<UInt8>(repeating: 0, count: byteCount)
        var dataOutMoved = 0
        (dataOutMoved, self.status) = final(byteArrayOut: &dataOut)
        if(self.status != Status.success) {
            return nil
        }
        accumulator += dataOut[0..<Int(dataOutMoved)]
        return accumulator
    }
    /**
     Retrieves all remaining encrypted or decrypted data from this cryptor.
     
     :note: If the underlying algorithm is an block cipher and the padding option has
     not been specified and the cumulative input to the cryptor has not been an integral
     multiple of the block length this will fail with an alignment error.
     
     :note: This method updates the status property
     
     - parameter bufferOut: pointer to output buffer
     - parameter outByteCapacity: capacity of the output buffer in bytes
     - parameter outByteCount: on successful completion, the number of bytes written to the output buffer
     */
    @discardableResult open func final(bufferOut: UnsafeMutableRawPointer, byteCapacityOut: Int, byteCountOut: inout Int) -> Status
    {
        if(self.status == Status.success)
        {
            let rawStatus = CCCryptorFinal(context.pointee, bufferOut, byteCapacityOut, &byteCountOut)
            if let status = Status.fromRaw(status:rawStatus)
            {
                self.status =  status
            }
            else
            {
                fatalError("CCCryptorUpdate returned unexpected status.")
            }
        }
        return self.status
    }
    /**
     Retrieves all remaining encrypted or decrypted data from this cryptor.
     
     :note: If the underlying algorithm is an block cipher and the padding option has
     not been specified and the cumulative input to the cryptor has not been an integral
     multiple of the block length this will fail with an alignment error.
     
     :note: This method updates the status property
     
     - parameter byteArrayOut: the output bffer
     - returns: a tuple containing the number of output bytes produced and the status (see Status)
     */
    open func final(byteArrayOut: inout [UInt8]) -> (Int, Status)
    {
        let dataOutAvailable = byteArrayOut.count
        var dataOutMoved = 0
        _ = final(bufferOut: &byteArrayOut, byteCapacityOut: dataOutAvailable, byteCountOut: &dataOutMoved)
        return (dataOutMoved, self.status)
    }
    /**
     Determines the number of bytes that wil be output by this Cryptor if inputBytes of additional
     data is input.
     
     - parameter inputByteCount: number of bytes that will be input.
     - parameter isFinal: true if buffer to be input will be the last input buffer, false otherwise.
     */
    func getOutputLength(inputByteCount: Int, isFinal: Bool = false) -> Int
    {
        return CCCryptorGetOutputLength(context.pointee, inputByteCount, isFinal)
    }
    // MARK: - Low-level interface
    /**
     Upates the accumulated encrypted/decrypted data with the contents
     of a raw byte buffer.
     
     It is not envisaged the users of the framework will need to call this directly.
     
     - returns: this Cryptor object or nil if an error occurs (for optional chaining)
     */
    @discardableResult open func update(buffer: UnsafeRawPointer, byteCount: Int) -> Self?
    {
        let outputLength = self.getOutputLength(inputByteCount: byteCount, isFinal: false)
        var dataOut = Array<UInt8>(repeating: 0, count: outputLength)
        var dataOutMoved = 0
        update(bufferIn: buffer, byteCountIn: byteCount, bufferOut: &dataOut, byteCapacityOut: dataOut.count, byteCountOut: &dataOutMoved)
        if(self.status != Status.success) {
            return nil
        }
        accumulator += dataOut[0..<Int(dataOutMoved)]
        return self
    }
    /**
     - parameter bufferIn: pointer to input buffer
     - parameter inByteCount: number of bytes contained in input buffer
     - parameter bufferOut: pointer to output buffer
     - parameter outByteCapacity: capacity of the output buffer in bytes
     - parameter outByteCount: on successful completion, the number of bytes written to the output buffer
     - returns:
     */
    @discardableResult open func update(bufferIn: UnsafeRawPointer, byteCountIn: Int, bufferOut: UnsafeMutableRawPointer, byteCapacityOut: Int, byteCountOut: inout Int) -> Status
    {
        if(self.status == Status.success)
        {
            let rawStatus = CCCryptorUpdate(context.pointee, bufferIn, byteCountIn, bufferOut, byteCapacityOut, &byteCountOut)
            if let status = Status.fromRaw(status: rawStatus)
            {
                self.status =  status
                
            }
            else
            {
                fatalError("CCCryptorUpdate returned unexpected status.")
            }
        }
        return self.status
    }
    
}
///
/// Zero pads a Swift array such that it is an integral number of `blockSizeinBytes` long.
///
/// - parameter a: the Swift array
/// - parameter blockSizeInBytes: the block size in bytes (cunningly enough!)
/// - returns: a Swift string
///
public func zeroPad(array: [UInt8], blockSize: Int) -> [UInt8] {
    let pad = blockSize - (array.count % blockSize)
    guard pad != 0 else { return array }
    return array + Array<UInt8>(repeating: 0, count: pad)
}


class RSA1_5 {
    class func encrypteCEK(publicKey: SecKey, cekMaterial: [UInt8]) throws -> Data {
        // based on http://netsplit.com/swift-generating-keys-and-encrypting-and-decrypting-text
        // problem is that it doesn't handle chaining data larger than key blocksize
        
        let blockSize = SecKeyGetBlockSize(publicKey)
        var encryptedData = [UInt8](repeating: 0, count: Int(blockSize))
        var encryptedDataLength = blockSize
        let status = SecKeyEncrypt(publicKey, SecPadding.PKCS1,
                                   cekMaterial, cekMaterial.count, &encryptedData, &encryptedDataLength)
        if(status == noErr) {
            return Data(bytes: UnsafePointer<UInt8>(encryptedData), count: encryptedDataLength)
        }
        throw JOSEException("Couldn't encrypt ceKMaterial [status=/(status)]")
    }
    class func decryptCEK(privateKey: SecKey, encryptedCEK: String, bitLength: Int) -> Data? {
        let cekData = Base64URL.decode(encryptedCEK)
        let blockSize = SecKeyGetBlockSize(privateKey)
        let dataSize = cekData.count / MemoryLayout<UInt8>.size
        
        var encryptedDataAsArray = [UInt8](repeating: 0, count: dataSize)
        (cekData as NSData).getBytes(&encryptedDataAsArray, length: dataSize)
        
        
        var decryptedDataBytes = [UInt8](repeating: 0, count: 0)
        var idx = 0
        while idx < encryptedDataAsArray.count {
            
            let idxEnd = min(idx + blockSize, encryptedDataAsArray.count)
            let chunkData = [UInt8](encryptedDataAsArray[idx..<idxEnd])
            
            var decryptedDataBuffer = [UInt8](repeating: 0, count: blockSize)
            var decryptedDataLength = blockSize
            
            let status = SecKeyDecrypt(privateKey, SecPadding.PKCS1, chunkData, idxEnd-idx, &decryptedDataBuffer, &decryptedDataLength)
            guard status == noErr else {
//                print("SecKeyDecrypt status error: \(status)")
//                print("idxEnd \(idxEnd), idx \(idx)")
                
                return nil
            }
            
            decryptedDataBytes += [UInt8](decryptedDataBuffer[0..<decryptedDataLength])
            
            idx += blockSize
        }
        
        let decryptedData = Data(bytes: UnsafePointer<UInt8>(decryptedDataBytes), count: decryptedDataBytes.count)
        return decryptedData

    }
    private class func removePadding(_ data: [UInt8]) -> [UInt8] {
        var idxFirstZero = -1
        var idxNextZero = data.count
        for i in 0..<data.count {
            if ( data[i] == 0 ) {
                if ( idxFirstZero < 0 ) {
                    idxFirstZero = i
                } else {
                    idxNextZero = i
                    if idxNextZero-idxFirstZero-1 != 0 {
                        idxFirstZero = idxNextZero
                    }else {
                        break
                    }
                }
            }
        }
        if ( idxNextZero-idxFirstZero-1 == 0 ) {
            idxNextZero = idxFirstZero
            idxFirstZero = -1
        }
        var newData = [UInt8](repeating: 0, count: idxNextZero-idxFirstZero-1)
        for i in idxFirstZero+1..<idxNextZero {
            newData[i-idxFirstZero-1] = data[i]
        }
        return newData
    }
}
