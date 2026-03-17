//
//  CommonCryptoWrapper.swift
//  bcsc-core
//
//  Created by BC Wallet Mobile on 2024-11-24.
//

import CommonCrypto
import Foundation

protocol CommonCryptoWrapperProtocol {
  func deriveKey(password: String, salt: [UInt8], prf: CCPseudoRandomAlgorithm, rounds: UInt32, derivedKeyLength: UInt)
    -> [UInt8]
}

struct CommonCryptoWrapper: CommonCryptoWrapperProtocol {
  func deriveKey(
    password: String,
    salt: [UInt8],
    prf: CCPseudoRandomAlgorithm,
    rounds: UInt32,
    derivedKeyLength: UInt
  ) -> [UInt8] {
    var derivedKey = [UInt8](repeating: 0, count: Int(derivedKeyLength))

    let result = CCKeyDerivationPBKDF(
      CCPBKDFAlgorithm(kCCPBKDF2),
      password,
      password.count,
      salt,
      salt.count,
      prf,
      rounds,
      &derivedKey,
      derivedKey.count
    )

    guard result == kCCSuccess else {
      return []
    }

    return derivedKey
  }
}
