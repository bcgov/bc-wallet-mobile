//
//  Data.swift
//  bc-services-card
//
//  Created by S. Mandrusiak on 2017-05-01.
//  Copyright © Province of British Columbia. All rights reserved.
//

import Foundation

//public extension Data {
//    mutating func sha256Fingerprint() -> String {
//        var sha256Buffer = Data(count: Int(CC_SHA256_DIGEST_LENGTH))
//        _ = sha256Buffer.withUnsafeMutableBytes{ (bufferBytes: UnsafeMutablePointer<UInt8>) in
//            _ = self.withUnsafeMutableBytes { (certBytes: UnsafeMutablePointer<UInt8>) in
//                CC_SHA256(certBytes, CC_LONG(self.count), bufferBytes)
//            }
//        }
//        var string = ""
//        for i in 0..<sha256Buffer.count {
//            string += String(format: "%02X ", sha256Buffer[i])
//        }
//        return string.trimmingCharacters(in: .whitespacesAndNewlines)
//    }
//}

extension Data {
    init(modulus: Data, exponent: Data) {
        // Make sure neither the modulus nor the exponent start with a null byte
        var modulusBytes = [CUnsignedChar](UnsafeBufferPointer<CUnsignedChar>(start: (modulus as NSData).bytes.bindMemory(to: CUnsignedChar.self, capacity: modulus.count), count: modulus.count / MemoryLayout<CUnsignedChar>.size))
        let exponentBytes = [CUnsignedChar](UnsafeBufferPointer<CUnsignedChar>(start: (exponent as NSData).bytes.bindMemory(to: CUnsignedChar.self, capacity: exponent.count), count: exponent.count / MemoryLayout<CUnsignedChar>.size))
        
        // Make sure modulus starts with a 0x00
        if let prefix = modulusBytes.first , prefix != 0x00 {
            modulusBytes.insert(0x00, at: 0)
        }
        
        // Lengths
        let modulusLengthOctets = modulusBytes.count.encodedOctets()
        let exponentLengthOctets = exponentBytes.count.encodedOctets()
        
        // Total length is the sum of components + types
        let totalLengthOctets = (modulusLengthOctets.count + modulusBytes.count + exponentLengthOctets.count + exponentBytes.count + 2).encodedOctets()
        
        // Combine the two sets of data into a single container
        var builder: [CUnsignedChar] = []
        let data = NSMutableData()
        
        // Container type and size
        builder.append(0x30)
        builder.append(contentsOf: totalLengthOctets)
        data.append(builder, length: builder.count)
        builder.removeAll(keepingCapacity: false)
        
        // Modulus
        builder.append(0x02)
        builder.append(contentsOf: modulusLengthOctets)
        data.append(builder, length: builder.count)
        builder.removeAll(keepingCapacity: false)
        data.append(modulusBytes, length: modulusBytes.count)
        
        // Exponent
        builder.append(0x02)
        builder.append(contentsOf: exponentLengthOctets)
        data.append(builder, length: builder.count)
        data.append(exponentBytes, length: exponentBytes.count)
        
        self.init(bytes: data.bytes, count: data.length)
        
        //self.init(data: data)
    }
    
    func localWrite(to fileUrl: inout URL) throws {
        let accessGranted = fileUrl.startAccessingSecurityScopedResource()
        
        defer {
            if accessGranted {
                fileUrl.stopAccessingSecurityScopedResource()
            }
        }
        
        try self.write(to: fileUrl, options: [.atomic, .completeFileProtection])
        var rv = URLResourceValues()
        rv.isExcludedFromBackup = true
        try fileUrl.setResourceValues(rv)
    }
}

extension NSInteger {
    func encodedOctets() -> [CUnsignedChar] {
        // Short form
        if self < 128 {
            return [CUnsignedChar(self)];
        }
        
        // Long form
        let i = (self / 256) + 1
        var len = self
        var result: [CUnsignedChar] = [CUnsignedChar(i + 0x80)]
        
        for _ in 0..<i {
            result.insert(CUnsignedChar(len & 0xFF), at: 1)
            len = len >> 8
        }
        
        return result
    }
}
