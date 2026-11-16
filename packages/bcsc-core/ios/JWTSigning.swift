//
//  JWTSigning.swift
//  bc-services-card
//
//  Signing stages and bridge-rejection diagnostics, kept free of React Native so they can be unit tested.
//  BcscCore wraps these: `signJWT` runs `JWTSigning`, `rejectWithDiagnostics` sends a `DiagnosticRejection`.
//

import Foundation

/// A promise rejection for the RN bridge. `message` is fixed text (never `localizedDescription`, which can contain
/// paths); `diagnostics` hold status codes and counts only. This all reaches remote logs and problem reports.
struct DiagnosticRejection: Error {
  let code: String
  let message: String
  /// `method.stage`, matching Android, so reports show which stage failed.
  let site: String
  let error: Error?
  let diagnostics: [String: Any]

  init(code: String, message: String, site: String, error: Error? = nil, diagnostics: [String: Any] = [:]) {
    self.code = code
    self.message = message
    self.site = site
    self.error = error
    self.diagnostics = diagnostics
  }

  /// The error passed to `reject`. RN serializes its userInfo onto the JS error as `error.userInfo`.
  var nsError: NSError {
    var userInfo = diagnostics
    userInfo[NSLocalizedDescriptionKey] = message
    userInfo["site"] = site
    if let nsError = error as NSError? {
      // domain:code only; localizedDescription can contain paths
      userInfo["detail"] = "\(nsError.domain):\(nsError.code)"
    }
    return NSError(domain: "BcscCore", code: 0, userInfo: userInfo)
  }
}

enum SigningDiagnostics {
  /// Caps per-key diagnostic arrays so the bridge payload size stays predictable.
  static let maxKeys = 5

  /// Error type and, for keychain errors, OSStatus. Never the description, which can contain paths.
  static func errorDiagnostics(_ error: Error) -> [String: Any] {
    var diagnostics: [String: Any] = ["errorType": String(describing: type(of: error))]
    if let keychainError = error as? KeychainError {
      switch keychainError {
      case let .keychainUnavailable(status), let .unexpectedStatus(status):
        diagnostics["osStatus"] = Int(status)
      default:
        break
      }
    }
    return diagnostics
  }

  /// Key creation dates, newest first and capped. Dates only: key tags are identifiers.
  static func keyCreatedDates(_ keys: [PrivateKeyInfo]) -> [String] {
    let iso8601 = ISO8601DateFormatter()
    return keys.sorted(by: { $0.created > $1.created })
      .prefix(maxKeys)
      .map { iso8601.string(from: $0.created) }
  }
}

/// Signs a JWT with the newest key. Each failing stage throws a `DiagnosticRejection` with site `method.stage`:
/// list_keys, select_key, get_key, sign.
struct JWTSigning {
  let keyPairManager: KeyPairManagerProtocol

  func sign(payload: JWTClaimsSet, method: String) throws -> String {
    let keys: [PrivateKeyInfo]
    do {
      keys = try keyPairManager.findAllPrivateKeys()
    } catch {
      throw DiagnosticRejection(
        code: "E_KEYSTORE_ERROR", message: "Failed to enumerate signing keys.",
        site: "\(method).list_keys", error: error, diagnostics: SigningDiagnostics.errorDiagnostics(error)
      )
    }

    guard let latestKeyInfo = keys.sorted(by: { $0.created > $1.created }).first else {
      throw DiagnosticRejection(
        code: "E_NO_KEYS_FOUND", message: "No keys available to sign the JWT.",
        site: "\(method).select_key", diagnostics: ["keyCount": 0]
      )
    }

    let signer: RSASigner
    do {
      let keyPair = try keyPairManager.getKeyPair(with: latestKeyInfo.tag)
      signer = RSASigner(privateKey: keyPair.private)
    } catch {
      var diagnostics = SigningDiagnostics.errorDiagnostics(error)
      diagnostics["keyCount"] = keys.count
      diagnostics["keyCreated"] = SigningDiagnostics.keyCreatedDates(keys)
      throw DiagnosticRejection(
        code: "E_KEYPAIR_RETRIEVAL_FAILED", message: "Failed to retrieve the signing key pair.",
        site: "\(method).get_key", error: error, diagnostics: diagnostics
      )
    }

    let header = JWSHeader(alg: .RS512, kid: latestKeyInfo.tag)
    var jwt = JWS(header: header, payload: payload)

    do {
      try jwt.sign(signer: signer)
      return try jwt.serialize()
    } catch {
      var diagnostics = SigningDiagnostics.errorDiagnostics(error)
      diagnostics["keyCount"] = keys.count
      throw DiagnosticRejection(
        code: "E_JWT_SIGN_FAILED", message: "Failed to sign or serialize the JWT.",
        site: "\(method).sign", error: error, diagnostics: diagnostics
      )
    }
  }
}
