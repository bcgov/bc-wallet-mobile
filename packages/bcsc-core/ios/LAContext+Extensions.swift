//
//  LAContext+Extensions.swift
//  bcsc-core
//
//  Created by BC Wallet Mobile on 2024-11-24.
//

import LocalAuthentication
import UIKit

protocol LAContextProtocol {
  func canEvaluatePolicy(_ policy: LAPolicy, error: NSErrorPointer) -> Bool
  func evaluatePolicy(_ policy: LAPolicy, localizedReason: String) async throws -> Bool
}

extension LAContext: LAContextProtocol {}

enum BiometricType: String {
  case none
  case touchID
  case faceID
  case opticID
}

extension LAContext {
  @MainActor
  static func performLocalAuthenticate(reason: String = "Authentication required") async -> Bool {
    let context = LAContext()
    var error: NSError?

    guard canPerformLocalAuthenticate(context: context, error: &error) else {
      print("Local Authentication error: ", error?.localizedDescription ?? "Unknown error")
      return false
    }

    do {
      return try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)
    } catch {
      print("Local Authentication error: ", error.localizedDescription)
      return false
    }
  }

  static func canPerformLocalAuthenticate(context: LAContextProtocol = LAContext(), error: inout NSError?) -> Bool {
    return context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
  }

  static func getBiometricType() -> BiometricType {
    let context = LAContext()
    var error: NSError?

    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
      return .none
    }

    switch context.biometryType {
    case .none:
      return .none
    case .touchID:
      return .touchID
    case .faceID:
      return .faceID
    case .opticID:
      return .opticID
    @unknown default:
      return .none
    }
  }

  static func canPerformBiometricAuthentication() -> Bool {
    let context = LAContext()
    var error: NSError?
    return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
  }
}
