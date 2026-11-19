//
//  RegistrationStore.swift
//  bc-services-card
//
//  Saves and clears the device registration, kept free of React Native so it can be unit tested.
//  BcscCore wraps it: `setRegistration` and `clearRegistration` reject with the `DiagnosticRejection` thrown here.
//

import Foundation
import Security

/// Reads and writes the account record. `StorageService` in the app, a stand-in in unit tests.
protocol RegistrationAccountStorage {
  func readAccount() -> Account?
  func writeAccount(_ account: Account) -> Bool
}

extension StorageService: RegistrationAccountStorage {
  func readAccount() -> Account? {
    readData(file: AccountFiles.accountMetadata, pathDirectory: defaultSearchPathDirectory)
  }

  func writeAccount(_ account: Account) -> Bool {
    writeData(data: account, file: AccountFiles.accountMetadata, pathDirectory: defaultSearchPathDirectory)
  }
}

/// The device registration: the client ID and issuer on the account record, and the registration access
/// token in the keychain. Nothing else writes the client ID (`setAccount` keeps the one that is stored).
///
/// Every token is kept under the client ID (`{clientID}/tokens/{type}/1`), so the order of the two writes
/// decides what an interrupted save leaves behind:
/// - `save` writes the token first. Until the account names the new client ID the previous token is still
///   the one that is read, so the previous registration stays whole.
/// - `clear` blanks the client ID first. From then on the token cannot be read, whether or not its
///   keychain item was removed.
final class RegistrationStore {
  private let accountStorage: RegistrationAccountStorage
  private let tokenStorage: TokenStorageServiceProtocol
  private let logger = AppLogger(
    subsystem: Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard",
    category: "RegistrationStore"
  )

  init(accountStorage: RegistrationAccountStorage, tokenStorage: TokenStorageServiceProtocol) {
    self.accountStorage = accountStorage
    self.tokenStorage = tokenStorage
  }

  /// Keychain ID of the registration access token for `clientID`, in the format `getToken` reads.
  static func tokenID(clientID: String) -> String {
    "\(clientID)/tokens/\(TokenType.Registration.rawValue)/1"
  }

  /// Saves the client ID, issuer and registration access token together. A nil token leaves the stored
  /// token as it is. If the account cannot be saved the token is put back, so a failed save leaves the
  /// previous registration in place.
  ///
  /// - Throws: `DiagnosticRejection` with a `setRegistration.<stage>` site, matching Android.
  func save(clientID: String, issuer: String, registrationAccessToken: String?) throws {
    let method = "setRegistration"

    guard !clientID.isEmpty, !issuer.isEmpty, registrationAccessToken?.isEmpty != true else {
      throw DiagnosticRejection(
        code: "E_INVALID_PARAMETERS",
        message: "clientID and issuer are required, and a registration access token cannot be empty.",
        site: "\(method).validate"
      )
    }

    guard let account = accountStorage.readAccount() else {
      throw DiagnosticRejection(
        code: "E_ACCOUNT_NOT_FOUND", message: "Account not found.", site: "\(method).read_account"
      )
    }

    let tokenID = Self.tokenID(clientID: clientID)
    // What the keychain held under this ID before the save, to put back if the account write fails
    var replacedToken: Token?

    if let registrationAccessToken {
      var diagnostic: String?
      replacedToken = tokenStorage.get(id: tokenID, diagnostic: &diagnostic)

      let result = tokenStorage.save(
        token: Token(id: tokenID, type: .Registration, token: registrationAccessToken),
        attrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
      )
      guard result.succeeded else {
        throw DiagnosticRejection(
          code: "E_TOKEN_SAVE_FAILED",
          message: "Failed to save the registration access token to the keychain.",
          site: "\(method).save_token",
          diagnostics: [
            "osStatus": Int(result.status),
            "detail": result.detail,
            "isProtectedDataAvailable": result.isProtectedDataAvailable,
          ]
        )
      }
    }

    let previousClientID = account.clientID
    // A v3 archive has no client ID of its own (it is read from client_registration), so it is written here
    guard previousClientID != clientID || account.issuer != issuer || account.clientIDMissingFromArchive else {
      logger.log("\(method): registration access token saved, account unchanged")
      return
    }

    account.clientID = clientID
    account.issuer = issuer

    guard accountStorage.writeAccount(account) else {
      let tokenRolledBack = registrationAccessToken == nil || restoreToken(replacedToken, id: tokenID)
      throw DiagnosticRejection(
        code: "E_SAVE_ACCOUNT_FAILED",
        message: "Failed to save the account with its registration.",
        site: "\(method).save_account",
        diagnostics: ["tokenRolledBack": tokenRolledBack]
      )
    }

    if !previousClientID.isEmpty, previousClientID != clientID {
      // The previous client ID's token can no longer be read. Removing it only tidies the keychain.
      _ = tokenStorage.delete(id: Self.tokenID(clientID: previousClientID))
    }

    logger.log("\(method): registration saved")
  }

  /// Removes the client ID and the registration access token. The account keeps its issuer, security
  /// method and nickname. Succeeds when there is no account or no registration to clear.
  ///
  /// The other tokens are stored under the client ID too, so the caller deletes them first.
  ///
  /// - Throws: `DiagnosticRejection` with a `clearRegistration.<stage>` site, matching Android.
  func clear() throws {
    let method = "clearRegistration"

    guard let account = accountStorage.readAccount() else {
      logger.log("\(method): no account, nothing to clear")
      return
    }

    let previousClientID = account.clientID

    // Saved as an empty string, never left out: an archive with no client ID is read as a v3 one, and
    // would take the client ID back from the v3 client_registration file.
    if !previousClientID.isEmpty || account.clientIDMissingFromArchive {
      account.clientID = ""

      guard accountStorage.writeAccount(account) else {
        throw DiagnosticRejection(
          code: "E_SAVE_ACCOUNT_FAILED",
          message: "Failed to save the account without its registration.",
          site: "\(method).save_account"
        )
      }
    }

    // The account no longer names the client ID, so this token cannot be read again either way
    _ = tokenStorage.delete(id: Self.tokenID(clientID: previousClientID))

    logger.log("\(method): registration cleared")
  }

  /// Puts back what the keychain held under `id` before a save: the token it replaced, or nothing.
  private func restoreToken(_ replacedToken: Token?, id: String) -> Bool {
    guard let replacedToken else {
      var diagnostic: String?
      // delete() returns false for a missing item as well, so check that the item is gone instead
      _ = tokenStorage.delete(id: id)
      return tokenStorage.get(id: id, diagnostic: &diagnostic) == nil
    }

    return tokenStorage.save(
      token: replacedToken, attrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ).succeeded
  }
}
