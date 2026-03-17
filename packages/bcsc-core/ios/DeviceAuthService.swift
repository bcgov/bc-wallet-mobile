//
//  DeviceAuthService.swift
//  bcsc-core
//
//  Created by BC Wallet Mobile on 2024-11-24.
//

import Foundation
import LocalAuthentication

protocol DeviceAuthServiceProtocol {
  func performAuthentication(reason: String) async -> Bool
  func canPerformAuthentication() -> Bool
  func getBiometricType() -> BiometricType
  func canPerformBiometricAuthentication() -> Bool
}

struct DeviceAuthService: DeviceAuthServiceProtocol {
  @MainActor
  func performAuthentication(reason: String = "Authentication required") async -> Bool {
    return await LAContext.performLocalAuthenticate(reason: reason)
  }

  func canPerformAuthentication() -> Bool {
    var error: NSError?
    return LAContext.canPerformLocalAuthenticate(error: &error)
  }

  func getBiometricType() -> BiometricType {
    return LAContext.getBiometricType()
  }

  func canPerformBiometricAuthentication() -> Bool {
    return LAContext.canPerformBiometricAuthentication()
  }
}
