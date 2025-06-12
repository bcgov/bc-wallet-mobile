//
//  RSAUtil.swift
//  jose
//
//  Created by marcosc on 2016-12-06.
//  Copyright © 2016 idim. All rights reserved.
//

import Foundation

class RSAUtil {
    static let publicKeyLabel: CFString = "Public Key" as CFString
    static let privateKeyLabel: CFString = "Private Key" as CFString
    
    class func generateKeyPair(pubLabel: CFString, privLabel: CFString) -> (publicKey: SecKey, privateKey: SecKey) {
        let publicKeyAttributes: NSDictionary = [kSecAttrLabel: publicKeyLabel, kSecAttrIsPermanent: kCFBooleanTrue]
        let privateKeyAttributes: NSDictionary = [kSecAttrLabel: privateKeyLabel, kSecAttrIsPermanent: kCFBooleanTrue, kSecAttrCanSign: kCFBooleanTrue]
        let params: NSDictionary = [kSecAttrKeyType: kSecAttrKeyTypeRSA, kSecAttrKeySizeInBits: 2048, kSecPublicKeyAttrs: publicKeyAttributes, kSecPrivateKeyAttrs: privateKeyAttributes]
        var pubKey: SecKey?
        var priKey: SecKey?
        
        SecKeyGeneratePair(params, &pubKey, &priKey)
        return getKeysFromKeychain()!
    }
    
    //MARK: - Key Retrieval
    class func getKeysFromKeychain() -> (publicKey: SecKey, privateKey: SecKey)? {
        var publicKey: SecKey!
        var privateKey: SecKey!
        
        if let result = findRSA(publicKeyLabel) {
            publicKey = result as! SecKey
        }
        if let result = findRSA(privateKeyLabel) {
            privateKey = result as! SecKey
        }
        if privateKey != nil && publicKey != nil {
            return (publicKey, privateKey)
        }else {
            return nil
        }
    }
    
    class func secKeyRefToData(inputKey: SecKey) -> Data? {
        // First Temp add to keychain
        let tempTag = "jwtutil.temp"
        let addParameters :NSDictionary = [
            String(kSecClass): kSecClassKey,
            String(kSecAttrApplicationTag): tempTag,
            String(kSecAttrKeyType): kSecAttrKeyTypeRSA,
            String(kSecValueRef): inputKey,
            String(kSecReturnData):kCFBooleanTrue,
            kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        var keyPtr: AnyObject?
        let result = SecItemAdd(addParameters, &keyPtr)
        switch result {
        case noErr:
            let data = keyPtr! as! Data
            
            //takeRetainedValue() as! NSData
            
            // Remove from Keychain again:
            SecItemDelete(addParameters)
            return data
        case errSecDuplicateItem:
            SecItemDelete(addParameters)
            return nil
            
        case errSecItemNotFound:
            return nil
            
        default:
            return nil
        }
        
    }
    class func convertSecKeyToBase64(inputKey: SecKey) ->String? {
        let data = secKeyRefToData(inputKey: inputKey)
        let encodingParameter = NSData.Base64EncodingOptions(rawValue: 0)
        return data?.base64EncodedString(options: encodingParameter)
    }
    
    //MARK: - Find RSA Key
    class func findRSA(_ label: CFString) -> CFTypeRef? {
        let attributes: NSDictionary = [kSecClass: kSecClassKey, kSecAttrLabel: label, kSecAttrIsPermanent: kCFBooleanTrue, kSecReturnRef: kCFBooleanTrue]
        var result: CFTypeRef?
        SecItemCopyMatching(attributes, &result)
        return result
    }
    
    class func toX509(modulus: Data, exponent: Data) -> Data {
        let combinedData = Data(modulus: modulus, exponent: exponent)
        return combinedData.dataByPrependingX509Header()
        
    }
    
    class func obtainKey(_ tag: String) -> SecKey? {
        // Migrate before fetching
        migrateLegacyItem(tag: tag)
        
        var keyRef: AnyObject?
        let query: Dictionary<String, AnyObject> = [
            String(kSecAttrKeyType): kSecAttrKeyTypeRSA,
            String(kSecReturnRef): kCFBooleanTrue as CFBoolean,
            String(kSecClass): kSecClassKey as CFString,
            String(kSecAttrApplicationTag): tag as CFString,
            ]
        
        let status = SecItemCopyMatching(query as CFDictionary, &keyRef)
        
        switch status {
        case noErr:
            if let ref = keyRef {
                return (ref as! SecKey)
            }
        default:
            break
        }
        
        return nil
    }
    
    #warning("TODO: remove when all items have been migrated")
    /// Migrate item with kSecAttrAccessible to kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    private class func migrateLegacyItem( tag: String) {
        let query: NSDictionary = [
            kSecAttrKeyType: kSecAttrKeyTypeRSA,
            kSecClass: kSecClassKey,
            kSecAttrApplicationTag: tag
        ]
        
        let updateAttributes: NSDictionary = [
            kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        _ = SecItemUpdate(query, updateAttributes)
    }
    
    class func obtainKeyBits(_ tag: String) -> Data? {
        var keyDataRef: AnyObject?
        let query: Dictionary<String, AnyObject> = [
            String(kSecAttrKeyType): kSecAttrKeyTypeRSA,
            String(kSecReturnData): kCFBooleanTrue as CFBoolean,
            String(kSecClass): kSecClassKey as CFString,
            String(kSecAttrApplicationTag): tag as CFString,
            ]
        
        let status = SecItemCopyMatching(query as CFDictionary, &keyDataRef)
        
        switch status {
            case noErr:
                return keyDataRef as? Data
            default:
                break
        }
        
        return nil
    }
    
    class func updateKey(tag: String, data: Data) -> OSStatus {
        let query: Dictionary<String, AnyObject> = [
            String(kSecAttrKeyType): kSecAttrKeyTypeRSA,
            String(kSecClass): kSecClassKey as CFString,
            String(kSecAttrApplicationTag): tag as CFString]
        
        
        return SecItemUpdate(query as CFDictionary, [String(kSecValueData): data] as CFDictionary)
    }
    class func combineData(exponent: Data, modulus: Data) -> Data {
        let combinedData = Data(modulus: modulus, exponent: exponent)
        return combinedData
    }
    class func insertPublicKey(tag: String, exponent: Data, modulus: Data, attrAccessible: CFString = kSecAttrAccessibleWhenUnlockedThisDeviceOnly) -> SecKey? {
        let combinedData = Data(modulus: modulus, exponent: exponent)
        
        var publicAttributes = Dictionary<String, AnyObject>()
        publicAttributes[String(kSecAttrKeyType)] = kSecAttrKeyTypeRSA
        publicAttributes[String(kSecClass)] = kSecClassKey as CFString
        publicAttributes[String(kSecAttrApplicationTag)] = tag as CFString
        publicAttributes[String(kSecValueData)] = combinedData as CFData
        publicAttributes[String(kSecReturnPersistentRef)] = true as CFBoolean
        publicAttributes[String(kSecAttrAccessible)] = attrAccessible
        
        var persistentRef: AnyObject?
        var status: OSStatus
        if RSAUtil.obtainKey(tag) != nil {
            status = updateKey(tag: tag, data: combinedData)
        } else {
            //status = SecItemDelete(publicAttributes as CFDictionary)
            //print(status)
            status = SecItemAdd(publicAttributes as CFDictionary, &persistentRef)
        }
        if status != noErr && status != errSecDuplicateItem {
            return nil
        }
        
        return RSAUtil.obtainKey(tag)
    }
    class func splitIntoComponents(keyData: Data) -> (modulus: Data, exponent: Data)? {
        // Get the bytes from the keyData
        let pointer = (keyData as NSData).bytes.bindMemory(to: CUnsignedChar.self, capacity: keyData.count)
        let keyBytes = [CUnsignedChar](UnsafeBufferPointer<CUnsignedChar>(start:pointer, count:keyData.count / MemoryLayout<CUnsignedChar>.size))
        
        // Assumption is that the data is in DER encoding
        // If we can parse it, then return successfully
        var i: NSInteger = 0
        
        // First there should be an ASN.1 SEQUENCE
        if keyBytes[0] != 0x30 {
            return nil
        } else {
            i += 1
        }
        // Total length of the container
        if let _ = NSInteger(octetBytes: keyBytes, startIdx: &i) {
            // First component is the modulus
            if keyBytes[i] == 0x02 {
                i += 1
                if let modulusLength = NSInteger(octetBytes: keyBytes, startIdx: &i) {
                    // NSRange(location: i, length: modulusLength).toRange()!
                    let modulus = keyData.subdata(in: Range.init(NSRange(location: i, length: modulusLength))!)
                    //var k = Range.i
                    i += modulusLength
                    
                    // Second should be the exponent
                    if keyBytes[i] == 0x02 {
                        i += 1
                        if let exponentLength = NSInteger(octetBytes: keyBytes, startIdx: &i) {
                            let exponent = keyData.subdata(in: Range.init(NSRange(location: i, length: exponentLength))!)
                            i += exponentLength
                            
                            return (modulus, exponent)
                        }
                    }
                }
            }
        }
        
        return nil
    }
    class func toCertData(exponent: Data, modulus: Data) -> Data {
        return Data(modulus: modulus, exponent: exponent)
    }
    
    
}
///
/// Encoding/Decoding lengths as octets
///
private extension NSInteger {
    init?(octetBytes: [CUnsignedChar], startIdx: inout NSInteger) {
        if octetBytes[startIdx] < 128 {
            // Short form
            self.init(octetBytes[startIdx])
            startIdx += 1
        } else {
            // Long form
            let octets = NSInteger(octetBytes[startIdx] as UInt8 - 128)
            
            if octets > octetBytes.count - startIdx {
                self.init(0)
                return nil
            }
            
            var result = UInt64(0)
            
            for j in 1...octets {
                result = (result << 8)
                result = result + UInt64(octetBytes[startIdx + j])
            }
            
            startIdx += 1 + octets
            self.init(result)
        }
    }
}


private extension Data {
    func splitIntoComponents() -> (modulus: Data, exponent: Data)? {
        // Get the bytes from the keyData
        let pointer = (self as NSData).bytes.bindMemory(to: CUnsignedChar.self, capacity: self.count)
        let keyBytes = [CUnsignedChar](UnsafeBufferPointer<CUnsignedChar>(start:pointer, count:self.count / MemoryLayout<CUnsignedChar>.size))
        
        // Assumption is that the data is in DER encoding
        // If we can parse it, then return successfully
        var i: NSInteger = 0
        
        // First there should be an ASN.1 SEQUENCE
        if keyBytes[0] != 0x30 {
            return nil
        } else {
            i += 1
        }
        // Total length of the container
        if let _ = NSInteger(octetBytes: keyBytes, startIdx: &i) {
            // First component is the modulus
            if keyBytes[i] == 0x02 {
                i += 1
                if let modulusLength = NSInteger(octetBytes: keyBytes, startIdx: &i) {
                    let modulus = self.subdata(in:Range.init(NSRange(location: i, length: modulusLength))!)
                    i += modulusLength
                    
                    // Second should be the exponent
                    if keyBytes[i] == 0x02 {
                        i += 1
                        if let exponentLength = NSInteger(octetBytes: keyBytes, startIdx: &i) {
                            let exponent = self.subdata(in: Range.init(NSRange(location: i, length: exponentLength))!)
                            i += exponentLength
                            
                            return (modulus, exponent)
                        }
                    }
                }
            }
        }
        
        return nil
    }
    
    func dataByPrependingX509Header() -> Data {
        let result = NSMutableData()
        
        let encodingLength: Int = (self.count + 1).encodedOctets().count
        let OID: [CUnsignedChar] = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
                                    0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]
        
        var builder: [CUnsignedChar] = []
        
        // ASN.1 SEQUENCE
        builder.append(0x30)
        
        // Overall size, made of OID + bitstring encoding + actual key
        let size = OID.count + 2 + encodingLength + self.count
        let encodedSize = size.encodedOctets()
        builder.append(contentsOf: encodedSize)
        result.append(builder, length: builder.count)
        result.append(OID, length: OID.count)
        builder.removeAll(keepingCapacity: false)
        
        builder.append(0x03)
        builder.append(contentsOf: (self.count + 1).encodedOctets())
        builder.append(0x00)
        result.append(builder, length: builder.count)
        
        // Actual key bytes
        result.append(self)
        
        return result as Data
    }
    
    func dataByStrippingX509Header() -> Data {
        var bytes = [CUnsignedChar](repeating: 0, count: self.count)
        (self as NSData).getBytes(&bytes, length:self.count)
        
        var range = NSRange(location: 0, length: self.count)
        var offset = 0
        
        // ASN.1 Sequence
        if bytes[offset] == 0x30 {
            offset += 1
            
            // Skip over length
            let _ = NSInteger(octetBytes: bytes, startIdx: &offset)
            
            let OID: [CUnsignedChar] = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
                                        0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]
            let slice: [CUnsignedChar] = Array(bytes[offset..<(offset + OID.count)])
            
            if slice == OID {
                offset += OID.count
                
                // Type
                if bytes[offset] != 0x03 {
                    return self
                }
                
                offset += 1
                
                // Skip over the contents length field
                let _ = NSInteger(octetBytes: bytes, startIdx: &offset)
                
                // Contents should be separated by a null from the header
                if bytes[offset] != 0x00 {
                    return self
                }
                
                offset += 1
                range.location += offset
                range.length -= offset
            } else {
                return self
            }
        }
        
        return self.subdata(in: Range.init(range)!)
    }
}
