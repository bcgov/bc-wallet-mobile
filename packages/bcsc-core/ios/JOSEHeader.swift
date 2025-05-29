//
//  JOSEHeader.swift
//  jose
//
//  Created by marcosc on 2016-12-06.
//  Copyright © 2016 idim. All rights reserved.
//

import Foundation

struct PublicServerKeyState {
    public static var serverPublicKey: SecKey?
    public static var serverPublicKeyId: String?
}

class JOSEHeader {
    // keep the full header for other optional attributes
    private let header: Dictionary<String, String>
    private let encodedHeader: String?
    
    init(header: Dictionary<String, String>, encoded: String) {
        self.header = header
        self.encodedHeader = encoded
    }
    init(header: Dictionary<String, String>) {
        self.header = header
        self.encodedHeader = nil
    }
    func serialize() throws -> String {
        
        if(encodedHeader != nil) {
            
            return encodedHeader!
        }
        
        return try Base64URL.encode(toJSONString())
    }
    func toJSONString() throws -> String {
        let data = try JSONSerialization.data(withJSONObject: header, options: [])
        return String(data: data, encoding: String.Encoding.utf8)!
    }

    func getHeaderValue(_ name: String) -> String? {
        return header[name]
    }
}

// JWSHeader

class JWSHeader: JOSEHeader {
    let alg: JWSAlgorithm
    
    init(alg: JWSAlgorithm, header: Dictionary<String, String>, encoded: String) {
        self.alg = alg
        super.init(header: header, encoded: encoded)
    }
    init(alg: JWSAlgorithm, header: Dictionary<String, String>) {
        self.alg = alg
        super.init(header: header)
    }
    convenience init(alg: JWSAlgorithm, kid: String) {
        var header = Dictionary<String, String>()
        header["alg"] = alg.name
        
        if kid.trim() != "" {
            header["kid"] = kid
        }
        
        self.init(alg: alg, header: header)
        
    }
    class func parse(_ s: String) throws -> JWSHeader {
        if let header:Dictionary<String, String> = try JSONSerialization.jsonObject(with: Base64URL.decode(s), options: .mutableContainers) as? Dictionary<String, String> {
            return JWSHeader.init(alg: JWSAlgorithm.parse(header["alg"]!), header: header, encoded: s)
        } else {
            throw JOSEException("unable to parse JWSHeader: " + s)
        }

    }
    
}

// JWSAlgorithm

class JWSAlgorithm {
    let name: String
    let padding: SecPadding?
    var digestLength: Int {
        switch name {
        case JWSAlgorithm.RS256.name:
            return Int(CC_SHA256_DIGEST_LENGTH)
        case JWSAlgorithm.RS384.name:
            return Int(CC_SHA384_DIGEST_LENGTH)
        case JWSAlgorithm.RS512.name:
            return Int(CC_SHA512_DIGEST_LENGTH)
        default:
            return -1
        }
    }
    convenience init(_ name: String) {
        self.init(name, nil)
    }
    init(_ name: String, _ padding: SecPadding?) {
        self.name = name
        self.padding = padding
    }
    /**
     * HMAC using SHA-256 hash algorithm (required).
     */
    static let HS256 = JWSAlgorithm("HS256")
    
    
    /**
     * HMAC using SHA-384 hash algorithm (optional).
     */
    static let HS384 = JWSAlgorithm("HS384")
    
    
    /**
     * HMAC using SHA-512 hash algorithm (optional).
     */
    static let HS512 = JWSAlgorithm("HS512")
    
    
    /**
     * RSASSA-PKCS-v1_5 using SHA-256 hash algorithm (recommended).
     */
    static let RS256 = JWSAlgorithm("RS256", SecPadding.PKCS1SHA256)
    
    
    /**
     * RSASSA-PKCS-v1_5 using SHA-384 hash algorithm (optional).
     */
    static let RS384 = JWSAlgorithm("RS384", SecPadding.PKCS1SHA384)
    
    
    /**
     * RSASSA-PKCS-v1_5 using SHA-512 hash algorithm (optional).
     */
    static let RS512 = JWSAlgorithm("RS512", SecPadding.PKCS1SHA512)
    
    
    /**
     * ECDSA using P-256 curve and SHA-256 hash algorithm (recommended).
     */
    static let ES256 = JWSAlgorithm("ES256")
    
    
    /**
     * ECDSA using P-384 curve and SHA-384 hash algorithm (optional).
     */
    static let ES384 = JWSAlgorithm("ES384")
    
    
    /**
     * ECDSA using P-521 curve and SHA-512 hash algorithm (optional).
     */
    static let ES512 = JWSAlgorithm("ES512")
    
    
    /**
     * RSASSA-PSS using SHA-256 hash algorithm and MGF1 mask generation
     * function with SHA-256 (optional).
     */
    static let PS256 = JWSAlgorithm("PS256")
    
    
    /**
     * RSASSA-PSS using SHA-384 hash algorithm and MGF1 mask generation
     * function with SHA-384 (optional).
     */
    static let PS384 = JWSAlgorithm("PS384")
    
    
    /**
     * RSASSA-PSS using SHA-512 hash algorithm and MGF1 mask generation
     * function with SHA-512 (optional).
     */
    static let PS512 = JWSAlgorithm("PS512")
    class func parse(_ s: String) -> JWSAlgorithm {
        if (s == HS256.name) {
            return HS256;
        } else if (s == HS384.name) {
            return HS384;
        } else if (s == HS512.name) {
            return HS512;
        } else if (s == RS256.name) {
            return RS256;
        } else if (s == RS384.name) {
            return RS384;
        } else if (s == RS512.name) {
            return RS512;
        } else if (s == ES256.name) {
            return ES256;
        } else if (s == ES384.name) {
            return ES384;
        } else if (s == ES512.name) {
            return ES512;
        } else if (s == PS256.name) {
            return PS256;
        } else if (s == PS384.name) {
            return PS384;
        } else if (s == PS512.name) {
            return PS512;
        } else {
            return JWSAlgorithm(s);
        }
        
    }
}

// JWEHeader
// See https://tools.ietf.org/html/rfc7516#page-11
class JWEHeader: JOSEHeader {
    let alg: JWEAlgorithm
    let enc: EncryptionMethod
    let cty: String
    let kid: String
    
    init(alg: JWEAlgorithm, enc: EncryptionMethod) {
        var h = Dictionary<String, String>()
        
        h["alg"] = alg.name
        h["enc"] = enc.name
        h["cty"] = "JWT"
        h["kid"] = PublicServerKeyState.serverPublicKeyId

        self.alg = alg
        self.enc = enc
        self.cty = "JWT"
        self.kid = PublicServerKeyState.serverPublicKeyId ?? ""
        super.init(header: h)
        
    }
    init(alg: JWEAlgorithm, enc: EncryptionMethod, header: Dictionary<String, String>, encoded: String) {
        
        self.alg = alg
        self.enc = enc
        self.cty = "JWT"
        self.kid = PublicServerKeyState.serverPublicKeyId ?? ""

        super.init(header: header, encoded: encoded)
    }
    /// Parses the given compact JWE header string into a JWEHeader instance
    /// See https://tools.ietf.org/html/rfc7516#page-11
    /// - Parameter s: compact JWE header string
    /// - Returns: the JWEHeader instance represented by the compact form
    /// - Throws: JOSEException if the string cannot be parsed, or if the alg or enc are not recognized.
    static func parse(_ s: String) throws -> JWEHeader {
        if let header:Dictionary<String, String> = try JSONSerialization.jsonObject(with: Base64URL.decode(s), options: .mutableContainers) as? Dictionary<String, String> {
            
            return try JWEHeader.init(alg: JWEAlgorithm.parse(s: header["alg"]!), enc: EncryptionMethod.parse(header["enc"]!), header: header, encoded: s)
        } else {
            throw JOSEException("unable to parse JWEHeader: " + s)
        }
    }
}

class JWEAlgorithm {
    let name: String
    /**
     * RSAES-PKCS1-V1_5 (RFC 3447) (required).
     */
    static let RSA1_5 = JWEAlgorithm("RSA1_5")
    /**
     * RSAES using Optimal Asymmetric Encryption Padding (OAEP) (RFC 3447),
     * with the default parameters specified by RFC 3447 in section A.2.1
     * (recommended).
     */
    static let RSA_OAEP = JWEAlgorithm("RSA-OAEP");
    
    
    /**
     * RSAES using Optimal Asymmetric Encryption Padding (OAEP) (RFC 3447),
     * with the SHA-256 hash function and the MGF1 with SHA-256 mask
     * generation function (recommended).
     */
    static let RSA_OAEP_256 = JWEAlgorithm("RSA-OAEP-256");
    
    
    /**
     * Advanced Encryption Standard (AES) Key Wrap Algorithm (RFC 3394)
     * using 128 bit keys (recommended).
     */
    static let A128KW = JWEAlgorithm("A128KW");
    
    
    /**
     * Advanced Encryption Standard (AES) Key Wrap Algorithm (RFC 3394)
     * using 192 bit keys (optional).
     */
    static let A192KW = JWEAlgorithm("A192KW");
    
    
    /**
     * Advanced Encryption Standard (AES) Key Wrap Algorithm (RFC 3394)
     * using 256 bit keys (recommended).
     */
    static let A256KW = JWEAlgorithm("A256KW");
    
    
    /**
     * Direct use of a shared symmetric key as the Content Encryption Key
     * (CEK) for the block encryption step (rather than using the symmetric
     * key to wrap the CEK) (recommended).
     */
    static let DIR = JWEAlgorithm("dir");
    
    
    /**
     * Elliptic Curve Diffie-Hellman Ephemeral Static (RFC 6090) key
     * agreement using the Concat KDF, as defined in section 5.8.1 of
     * NIST.800-56A, with the agreed-upon key being used directly as the
     * Content Encryption Key (CEK) (rather than being used to wrap the
     * CEK) (recommended).
     */
    static let ECDH_ES = JWEAlgorithm("ECDH-ES");
    
    
    /**
     * Elliptic Curve Diffie-Hellman Ephemeral Static key agreement per
     * "ECDH-ES", but where the agreed-upon key is used to wrap the Content
     * Encryption Key (CEK) with the "A128KW" function (rather than being
     * used directly as the CEK) (recommended).
     */
    static let ECDH_ES_A128KW = JWEAlgorithm("ECDH-ES+A128KW");
    
    
    /**
     * Elliptic Curve Diffie-Hellman Ephemeral Static key agreement per
     * "ECDH-ES", but where the agreed-upon key is used to wrap the Content
     * Encryption Key (CEK) with the "A192KW" function (rather than being
     * used directly as the CEK) (optional).
     */
    static let ECDH_ES_A192KW = JWEAlgorithm("ECDH-ES+A192KW");
    
    
    /**
     * Elliptic Curve Diffie-Hellman Ephemeral Static key agreement per
     * "ECDH-ES", but where the agreed-upon key is used to wrap the Content
     * Encryption Key (CEK) with the "A256KW" function (rather than being
     * used directly as the CEK) (recommended).
     */
    static let ECDH_ES_A256KW = JWEAlgorithm("ECDH-ES+A256KW");
    
    
    /**
     * AES in Galois/Counter Mode (GCM) (NIST.800-38D) 128 bit keys
     * (optional).
     */
    static let A128GCMKW = JWEAlgorithm("A128GCMKW");
    
    
    /**
     * AES in Galois/Counter Mode (GCM) (NIST.800-38D) 192 bit keys
     * (optional).
     */
    static let A192GCMKW = JWEAlgorithm("A192GCMKW");
    
    
    /**
     * AES in Galois/Counter Mode (GCM) (NIST.800-38D) 256 bit keys
     * (optional).
     */
    static let A256GCMKW = JWEAlgorithm("A256GCMKW");
    
    
    /**
     * PBES2 (RFC 2898) with HMAC SHA-256 as the PRF and AES Key Wrap
     * (RFC 3394) using 128 bit keys for the encryption scheme (optional).
     */
    static let PBES2_HS256_A128KW = JWEAlgorithm("PBES2-HS256+A128KW");
    
    
    /**
     * PBES2 (RFC 2898) with HMAC SHA-384 as the PRF and AES Key Wrap
     * (RFC 3394) using 192 bit keys for the encryption scheme (optional).
     */
    static let PBES2_HS384_A192KW = JWEAlgorithm("PBES2-HS384+A192KW");
    
    
    /**
     * PBES2 (RFC 2898) with HMAC SHA-512 as the PRF and AES Key Wrap
     * (RFC 3394) using 256 bit keys for the encryption scheme (optional).
     */
    static let PBES2_HS512_A256KW = JWEAlgorithm("PBES2-HS512+A256KW");
    
    
    
    init(_ name: String) {
        self.name = name
    }
    class func parse(s: String) -> JWEAlgorithm {
        if (s == RSA1_5.name) {
            return RSA1_5;
        } else if (s == RSA_OAEP.name) {
            return RSA_OAEP;
        } else if (s == RSA_OAEP_256.name) {
            return RSA_OAEP_256;
        } else if (s == A128KW.name) {
            return A128KW;
        } else if (s == A192KW.name) {
            return A192KW;
        } else if (s == A256KW.name) {
            return A256KW;
        } else if (s == DIR.name) {
            return DIR;
        } else if (s == ECDH_ES.name) {
            return ECDH_ES;
        } else if (s == ECDH_ES_A128KW.name) {
            return ECDH_ES_A128KW;
        } else if (s == ECDH_ES_A192KW.name) {
            return ECDH_ES_A192KW;
        } else if (s == ECDH_ES_A256KW.name) {
            return ECDH_ES_A256KW;
        } else if (s == A128GCMKW.name) {
            return A128GCMKW;
        } else if (s == A192GCMKW.name) {
            return A192GCMKW;
        } else if (s == A256GCMKW.name) {
            return A256GCMKW;
        } else if (s == PBES2_HS256_A128KW.name) {
            return PBES2_HS256_A128KW;
        } else if (s == PBES2_HS384_A192KW.name) {
            return PBES2_HS384_A192KW;
        } else if (s == PBES2_HS512_A256KW.name) {
            return PBES2_HS512_A256KW;
        } else {
            return JWEAlgorithm(s);
        }
    }
}

class EncryptionMethod {
    let name: String
    /**
     * The Content Encryption Key (CEK) bit length, zero if not specified.
     */
    let cekBitLength : Int
    
    /**
     * AES_128_CBC_HMAC_SHA_256 authenticated encryption using a 256 bit
     * key (required).
     */
    static let A128CBC_HS256 = EncryptionMethod(name: "A128CBC-HS256", cekBitLength: 256);
    
    
    /**
     * AES_192_CBC_HMAC_SHA_384 authenticated encryption using a 384 bit
     * key (optional).
     */
    static let A192CBC_HS384 =
        EncryptionMethod(name: "A192CBC-HS384", cekBitLength: 384);
    
    
    /**
     * AES_256_CBC_HMAC_SHA_512 authenticated encryption using a 512 bit
     * key (required).
     */
    static let A256CBC_HS512 =
        EncryptionMethod(name: "A256CBC-HS512", cekBitLength: 512);
    
    /**
     * AES in Galois/Counter Mode (GCM) (NIST.800-38D) using a 128 bit key
     * (recommended).
     */
    static let A128GCM =
        EncryptionMethod(name: "A128GCM", cekBitLength: 128);
    
    
    /**
     * AES in Galois/Counter Mode (GCM) (NIST.800-38D) using a 192 bit key
     * (optional).
     */
    static let A192GCM =
        EncryptionMethod(name: "A192GCM", cekBitLength: 192);
    
    
    /**
     * AES in Galois/Counter Mode (GCM) (NIST.800-38D) using a 256 bit key
     * (recommended).
     */
    static let A256GCM =
        EncryptionMethod(name: "A256GCM", cekBitLength: 256);
    
    
    
    init(name: String, cekBitLength: Int) {
        self.name = name
        self.cekBitLength = cekBitLength
    }
    class func parse(_ s: String) throws -> EncryptionMethod {
        if (s == A128CBC_HS256.name) {
            
            return A128CBC_HS256;
            
        } else if (s == A192CBC_HS384.name) {
            
            return A192CBC_HS384;
            
        } else if (s == A256CBC_HS512.name) {
            
            return A256CBC_HS512;
            
        } else if (s == A128GCM.name) {
            
            return A128GCM;
            
        } else if (s == A192GCM.name) {
            
            return A192GCM;
            
        } else if (s == A256GCM.name) {
            
            return A256GCM;
        } else {
            throw JOSEException("Unknown encryption method: " + s)
        }
    }
}
