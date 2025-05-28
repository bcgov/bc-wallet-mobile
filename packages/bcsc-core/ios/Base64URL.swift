//
//  Base64URL.swift
//  jose
//
//  Created by marcosc on 2016-12-06.
//  Copyright © 2016 idim. All rights reserved.
//

import Foundation
class Base64URL {
    class func encode(_ data: Data) -> String {
        var tempEncoding = data.base64EncodedString()
        // remove padding '=' signs
        tempEncoding = tempEncoding.components(separatedBy: "=")[0]
        // replace + with - (dash or hyphen)
        tempEncoding = tempEncoding.replacingOccurrences(of: "+", with: "-")
        // replace / with _ underscore
        tempEncoding = tempEncoding.replacingOccurrences(of: "/", with: "_")
        return tempEncoding
        
    }
    class func encode(_ bytes: [UInt8]) -> String {
        return encode(Data(bytes))
    }
    
    class func encode(_ s: String) -> String {
        return Base64URL.encode(s.data(using: String.Encoding.utf8)!)
    }
    class func decode(_ encodedString: String) -> Data {
        let tempEncodedString = Base64URL.toBase64(encodedString)
        return Data(base64Encoded: tempEncodedString, options: NSData.Base64DecodingOptions(rawValue:0))!
        
    }
    class func decodeAsString(_ encodedString: String) -> String {
        let data: Data = Base64URL.decode(encodedString)
        return String(data: data, encoding: .utf8)!
    }
    private class func toBase64(_ encodedString : String) -> String {
        var tempEncodedString = encodedString.replacingOccurrences(of: "-", with: "+")
        tempEncodedString = tempEncodedString.replacingOccurrences(of: "_", with: "/")
        // add padding if necessary
        let equalsToBeAdded = (encodedString as NSString).length % 4
        if(equalsToBeAdded > 0){
            for _ in 0..<equalsToBeAdded {
                tempEncodedString += "="
            }
        }
        return tempEncodedString
    }
}
