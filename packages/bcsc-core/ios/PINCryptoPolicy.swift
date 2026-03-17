//
//  PINCryptoPolicy.swift
//  bcsc-core
//
//  Created by BC Wallet Mobile on 2024-11-24.
//

import Foundation

protocol PINCryptoPolicyProtocol {
  func getSaltLength() -> Int
  func getKeyLength() -> Int
  func getIterationCount() -> Int
}

struct PINCryptoPolicy: PINCryptoPolicyProtocol {
  private let saltLength = 16
  private let keyLength = 64
  private let iterations = 600_000

  func getSaltLength() -> Int {
    return saltLength
  }

  func getKeyLength() -> Int {
    return keyLength
  }

  func getIterationCount() -> Int {
    return iterations
  }
}
