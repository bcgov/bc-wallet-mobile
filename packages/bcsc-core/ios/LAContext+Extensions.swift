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

  /// True only when the user deliberately dismissed the prompt
  static func isUserCancellation(_ error: Error?) -> Bool {
    guard let laError = error as? LAError else {
      return false
    }
    return laError.code == .userCancel || laError.code == .userFallback
  }

  /// True when no device passcode is set, so device auth cannot be performed at all
  static func isAuthUnavailable(_ error: Error?) -> Bool {
    guard let laError = error as? LAError else {
      return false
    }
    return laError.code == .passcodeNotSet
  }

  /// Log/report-friendly description, e.g. "LAError.systemCancel (-4): Cancelled by system".
  static func describeAuthError(_ error: Error?) -> String {
    guard let error = error else {
      return "unknown error"
    }
    let nsError = error as NSError
    guard nsError.domain == LAError.errorDomain else {
      return "\(nsError.domain) (\(nsError.code)): \(nsError.localizedDescription)"
    }
    return "LAError.\(laErrorName(nsError.code)) (\(nsError.code)): \(nsError.localizedDescription)"
  }

  private static func laErrorName(_ code: Int) -> String {
    switch LAError.Code(rawValue: code) {
    case .authenticationFailed: return "authenticationFailed"
    case .userCancel: return "userCancel"
    case .userFallback: return "userFallback"
    case .systemCancel: return "systemCancel"
    case .passcodeNotSet: return "passcodeNotSet"
    case .appCancel: return "appCancel"
    case .invalidContext: return "invalidContext"
    case .notInteractive: return "notInteractive"
    case .biometryNotAvailable: return "biometryNotAvailable"
    case .biometryNotEnrolled: return "biometryNotEnrolled"
    case .biometryLockout: return "biometryLockout"
    default: return "unknown"
    }
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
