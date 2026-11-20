@testable import BcscCoreTestable
import XCTest

/// `readLegacyRecord` reports each record as ok, absent, locked or unreadable. The getters and the report
/// share one read per record (`LegacyRecordRead`), so these tests pin the classification of that read:
/// pure mappings first, then real files in the same storage directory `AccountReadStatusTests` uses.
final class LegacyRecordStatusTests: XCTestCase {
  private let sitIssuer = "https://idsit.gov.bc.ca"
  private let otherProvider = "https://idqa.gov.bc.ca/device/"
  private let logger = AppLogger(subsystem: "LegacyRecordStatusTests", category: "Tests")

  private var storage = StorageService()
  private var dataURL = URL(fileURLWithPath: "/")
  private var accountID = ""

  override func setUpWithError() throws {
    storage = StorageService()
    let root = try FileManager.default.url(
      for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
    )
    dataURL = root.appendingPathComponent("\(storage.currentBundleID)/data")
    try? FileManager.default.removeItem(at: dataURL)
    // Pin the environment so basePath doesn't depend on the PROD fallback / directory scan.
    XCTAssertTrue(storage.saveIssuerToFile(issuer: sitIssuer))
    accountID = UUID().uuidString
  }

  override func tearDownWithError() throws {
    try? FileManager.default.removeItem(at: dataURL)
  }

  // MARK: - Helpers

  private let fileReadError = NSError(domain: NSCocoaErrorDomain, code: NSFileReadNoPermissionError)

  private func report<Value>(
    _ read: LegacyRecordRead<Value>,
    _ record: LegacyRecordName,
    isProtectedDataAvailable: Bool = true
  ) -> [String: Any] {
    read.report(for: record, isProtectedDataAvailable: isProtectedDataAvailable)
  }

  private func status(_ report: [String: Any]) -> String? {
    report["status"] as? String
  }

  private func reason(_ report: [String: Any]) -> String? {
    report["reason"] as? String
  }

  private var accountDirURL: URL {
    dataURL.appendingPathComponent("accounts_dir/SIT").appendingPathComponent(accountID)
  }

  private func seedAccountList() throws {
    try storage.updateAccountListEntry(accountID: accountID)
  }

  private func writeAccountFile(_ file: AccountFiles, _ contents: Data) throws {
    try FileManager.default.createDirectory(at: accountDirURL, withIntermediateDirectories: true)
    try contents.write(to: accountDirURL.appendingPathComponent(file.rawValue))
  }

  private func archive(_ root: Any) throws -> Data {
    try NSKeyedArchiver.archivedData(withRootObject: root, requiringSecureCoding: false)
  }

  private func makeCredential() -> Credential {
    Credential(issuer: sitIssuer, subject: "subject-1", label: "label", created: Date(timeIntervalSince1970: 0))
  }

  // MARK: - Report shape

  func testOkReportCarriesTheValue() {
    let result = report(LegacyRecordRead<[String: Any]>.ok(["key": "value"]), .accountFlags)

    XCTAssertEqual(status(result), "ok")
    XCTAssertEqual((result["value"] as? [String: Any])?["key"] as? String, "value")
    XCTAssertNil(result["reason"])
  }

  func testEmptyValuesReportAbsent() {
    let empties: [(String, [String: Any])] = [
      ("empty NSMutableDictionary", report(LegacyRecordRead.ok(NSMutableDictionary()), .accountFlags)),
      ("empty dictionary", report(LegacyRecordRead<[String: String]>.ok([:]), .tokens)),
      ("empty array of dictionaries", report(LegacyRecordRead<[[String: Any]]>.ok([]), .evidence)),
      ("empty NSArray", report(LegacyRecordRead.ok(NSArray()), .savedServices)),
    ]

    for (name, result) in empties {
      XCTAssertEqual(status(result), "absent", name)
      XCTAssertNil(result["value"], name)
      XCTAssertNil(result["reason"], name)
    }
  }

  func testAbsentReportHasOnlyAStatus() {
    let result = report(LegacyRecordRead<Any>.absent, .credential)

    XCTAssertEqual(result.count, 1)
    XCTAssertEqual(status(result), "absent")
  }

  func testUnknownRecordReportsUnreadable() {
    XCTAssertNil(LegacyRecordName(rawValue: "nope"))
    XCTAssertEqual(status(LegacyRecordStatus.unknownRecordReport), "unreadable")
    XCTAssertEqual(reason(LegacyRecordStatus.unknownRecordReport), "unknown_record")
  }

  func testRecordNamesMatchTheJSContract() {
    XCTAssertEqual(
      LegacyRecordName.allCases.map(\.rawValue),
      ["account", "tokens", "credential", "authorizationRequest", "accountFlags", "evidence", "savedServices"]
    )
  }

  // MARK: - AccountReadFailure classification

  func testAccountReadFailureStatuses() {
    let cases: [(AccountReadFailure, available: String, unavailable: String)] = [
      (.accountListMissing, "absent", "absent"),
      (.accountListEmpty, "absent", "absent"),
      (.fileMissing, "absent", "absent"),
      (.fileUnreadable(fileReadError), "unreadable", "locked"),
      (.accountListUnreadable(fileReadError), "unreadable", "locked"),
      (.storageRootUnavailable(fileReadError), "unreadable", "locked"),
      (.decodeFailed(fileReadError), "unreadable", "unreadable"),
      (.noObjectForProvider, "unreadable", "unreadable"),
    ]

    for (failure, available, unavailable) in cases {
      for record in LegacyRecordName.allCases {
        let read = LegacyRecordRead<Any>.failed(.storage(failure))
        XCTAssertEqual(status(report(read, record, isProtectedDataAvailable: true)), available, "\(failure) \(record)")
        XCTAssertEqual(
          status(report(read, record, isProtectedDataAvailable: false)), unavailable, "\(failure) \(record)"
        )
        let accountRead = LegacyRecordRead<Any>.failed(.account(failure))
        XCTAssertEqual(status(report(accountRead, record)), available, "account \(failure) \(record)")
      }
    }
  }

  func testLockedReportHasNoReason() {
    let result = report(
      LegacyRecordRead<Any>.failed(.storage(.fileUnreadable(fileReadError))), .credential,
      isProtectedDataAvailable: false
    )

    XCTAssertEqual(result.count, 1)
    XCTAssertEqual(status(result), "locked")
  }

  /// Tokens (and anything else that hangs off the account) take the account's status and reason.
  func testAccountFailuresUseTheAccountStatusCode() {
    let cases: [(AccountReadFailure, String)] = [
      (.fileUnreadable(fileReadError), "account_file_unreadable:NSCocoaErrorDomain:257"),
      (.decodeFailed(NSError(domain: NSCocoaErrorDomain, code: 4864)), "account_decode_failed:NSCocoaErrorDomain:4864"),
      (.noObjectForProvider, "account_provider_mismatch"),
      (.accountListUnreadable(fileReadError), "account_list_unreadable:NSCocoaErrorDomain:257"),
    ]

    for (failure, expected) in cases {
      for record in [LegacyRecordName.account, .tokens] {
        XCTAssertEqual(reason(report(LegacyRecordRead<Any>.failed(.account(failure)), record)), expected)
      }
    }
  }

  func testRecordFileFailuresAreNamedAfterTheRecord() {
    let decodeError = NSError(domain: NSCocoaErrorDomain, code: 4864)
    let cases: [(LegacyRecordFailure, LegacyRecordName, String)] = [
      (.storage(.fileUnreadable(fileReadError)), .credential, "credential_file_unreadable:NSCocoaErrorDomain:257"),
      (.storage(.decodeFailed(decodeError)), .credential, "credential_decode_failed:NSCocoaErrorDomain:4864"),
      (.storage(.noObjectForProvider), .accountFlags, "accountFlags_unexpected_format"),
      (.storage(.storageRootUnavailable(fileReadError)), .evidence, "storage_root_unavailable:NSCocoaErrorDomain:257"),
      (
        .storage(.accountListUnreadable(fileReadError)),
        .accountFlags,
        "account_list_unreadable:NSCocoaErrorDomain:257"
      ),
      (.undecodable, .evidence, "evidence_decode_failed"),
      (.undecodable, .savedServices, "savedServices_decode_failed"),
      (.unexpectedFormat, .authorizationRequest, "authorizationRequest_unexpected_format"),
      (.keychainUnreadable("token_refresh_-25308"), .tokens, "token_refresh_-25308"),
    ]

    for (failure, record, expected) in cases {
      let result = report(LegacyRecordRead<Any>.failed(failure), record)
      XCTAssertEqual(status(result), "unreadable", expected)
      XCTAssertEqual(reason(result), expected)
    }
  }

  /// Reasons go to remote logs: short codes and `domain:code` only, never paths, IDs or messages.
  func testReasonsAreShortCodes() {
    let pathError = NSError(
      domain: NSCocoaErrorDomain, code: NSFileReadNoPermissionError,
      userInfo: [NSFilePathErrorKey: "/var/mobile/\(accountID)/client_registration"]
    )
    let failures: [LegacyRecordFailure] = [
      .account(.fileUnreadable(pathError)),
      .storage(.fileUnreadable(pathError)),
      .storage(.decodeFailed(pathError)),
      .storage(.noObjectForProvider),
      .undecodable,
      .unexpectedFormat,
    ]

    for failure in failures {
      for record in LegacyRecordName.allCases {
        let reasonText = reason(report(LegacyRecordRead<Any>.failed(failure), record)) ?? ""
        XCTAssertNotNil(
          reasonText.range(of: #"^[A-Za-z_]+(:[A-Za-z0-9_.]+:-?\d+)?$"#, options: .regularExpression),
          "got \(reasonText)"
        )
        XCTAssertFalse(reasonText.contains(accountID))
        XCTAssertFalse(reasonText.contains("/"))
      }
    }
  }

  // MARK: - Tokens

  private func outcome(_ status: OSStatus, token: String? = nil) -> TokenReadOutcome {
    TokenReadOutcome(token: token.map { Token(id: "id", type: .Access, token: $0) }, status: status)
  }

  private func combine(_ outcomes: [(String, TokenReadOutcome)]) -> [String: Any] {
    report(LegacyTokensRecord.combine(outcomes.map { (key: $0.0, outcome: $0.1) }), .tokens)
  }

  func testTokenTypesAndKeys() {
    XCTAssertEqual(LegacyTokensRecord.types.map(\.type.rawValue), [0, 1, 2])
    XCTAssertEqual(LegacyTokensRecord.types.map(\.key), ["access", "refresh", "registration"])
  }

  func testAllTokensMissingIsAbsent() {
    let result = combine([
      ("access", outcome(errSecItemNotFound)),
      ("refresh", outcome(errSecItemNotFound)),
      ("registration", outcome(errSecItemNotFound)),
    ])

    XCTAssertEqual(status(result), "absent")
  }

  func testFoundTokensAreOkWithTokenStringsOnly() {
    let result = combine([
      ("access", outcome(errSecItemNotFound)),
      ("refresh", outcome(errSecSuccess, token: "refresh-token")),
      ("registration", outcome(errSecSuccess, token: "registration-token")),
    ])

    XCTAssertEqual(status(result), "ok")
    XCTAssertEqual(
      result["value"] as? [String: String], ["refresh": "refresh-token", "registration": "registration-token"]
    )
  }

  func testInteractionNotAllowedIsLocked() {
    let result = combine([
      ("access", outcome(errSecSuccess, token: "access-token")),
      ("refresh", outcome(errSecInteractionNotAllowed)),
    ])

    XCTAssertEqual(status(result), "locked")
    XCTAssertNil(result["value"])
  }

  func testLockedWinsOverOtherFailures() {
    let result = combine([
      ("access", outcome(errSecAuthFailed)),
      ("refresh", outcome(errSecInteractionNotAllowed)),
    ])

    XCTAssertEqual(status(result), "locked")
  }

  func testOtherKeychainStatusIsUnreadableWithTheStatusInTheReason() {
    let result = combine([
      ("access", outcome(errSecItemNotFound)),
      ("refresh", outcome(errSecAuthFailed)),
      ("registration", outcome(errSecItemNotFound)),
    ])

    XCTAssertEqual(status(result), "unreadable")
    XCTAssertEqual(reason(result), "token_refresh_\(errSecAuthFailed)")
  }

  func testUndecodableTokenIsUnreadable() {
    let read = outcome(errSecSuccess)
    XCTAssertTrue(read.isUndecodable)

    let result = combine([("access", read), ("refresh", outcome(errSecItemNotFound))])

    XCTAssertEqual(status(result), "unreadable")
    XCTAssertEqual(reason(result), "token_access_decode_failed")
  }

  func testFirstTokenFailureIsTheReason() {
    let result = combine([
      ("access", outcome(errSecSuccess)),
      ("refresh", outcome(errSecAuthFailed)),
    ])

    XCTAssertEqual(reason(result), "token_access_decode_failed")
  }

  func testMissingTokenIsNotUndecodable() {
    XCTAssertFalse(outcome(errSecItemNotFound).isUndecodable)
    XCTAssertFalse(outcome(errSecSuccess, token: "t").isUndecodable)
  }

  // MARK: - Account (real files)

  func testAccountRecordStatesAgainstStorage() throws {
    XCTAssertEqual(status(report(storage.readAccountRecord(), .account)), "absent")

    try seedAccountList()
    XCTAssertEqual(status(report(storage.readAccountRecord(), .account)), "absent")

    try writeAccountFile(.accountMetadata, Data("not an archive".utf8))
    let corrupt = report(storage.readAccountRecord(), .account)
    XCTAssertEqual(status(corrupt), "unreadable")
    XCTAssertTrue(reason(corrupt)?.hasPrefix("account_decode_failed:") == true, "got \(reason(corrupt) ?? "nil")")

    let account = Account(id: accountID, clientID: "client-1", issuer: sitIssuer, securityMethod: .deviceAuth)
    XCTAssertTrue(storage.writeData(data: account, file: .accountMetadata, pathDirectory: .applicationSupportDirectory))
    guard case let .ok(read) = storage.readAccountRecord() else {
      return XCTFail("expected ok")
    }
    XCTAssertEqual(read.id, accountID)
  }

  func testUnreadableAccountListIsLockedOnlyWithoutProtectedData() throws {
    let baseURL = dataURL.appendingPathComponent("accounts_dir/SIT")
    try FileManager.default.createDirectory(at: baseURL, withIntermediateDirectories: true)
    try Data("{".utf8).write(to: baseURL.appendingPathComponent(accountListURLComponent))

    let read = storage.readCredentialRecord(logger: logger)

    XCTAssertEqual(status(report(read, .credential, isProtectedDataAvailable: false)), "locked")
    let unlocked = report(read, .credential, isProtectedDataAvailable: true)
    XCTAssertEqual(status(unlocked), "unreadable")
    XCTAssertEqual(reason(unlocked), "account_list_unreadable:NSCocoaErrorDomain:3840")
  }

  // MARK: - Account flags (real files)

  func testAccountFlagsStates() throws {
    XCTAssertEqual(status(report(storage.readAccountFlagsRecord(logger: logger), .accountFlags)), "absent")

    try seedAccountList()
    XCTAssertEqual(status(report(storage.readAccountFlagsRecord(logger: logger), .accountFlags)), "absent")

    XCTAssertTrue(
      storage.writeData(data: NSDictionary(), file: .accountFlag, pathDirectory: .applicationSupportDirectory)
    )
    XCTAssertEqual(status(report(storage.readAccountFlagsRecord(logger: logger), .accountFlags)), "absent")

    let flags: NSDictionary = ["isEmailVerified": true]
    XCTAssertTrue(storage.writeData(data: flags, file: .accountFlag, pathDirectory: .applicationSupportDirectory))
    let ok = report(storage.readAccountFlagsRecord(logger: logger), .accountFlags)
    XCTAssertEqual(status(ok), "ok")
    XCTAssertEqual((ok["value"] as? NSDictionary)?["isEmailVerified"] as? Bool, true)
  }

  func testCorruptAccountFlagsAreUnreadable() throws {
    try seedAccountList()
    try writeAccountFile(.accountFlag, Data("not an archive".utf8))

    let result = report(storage.readAccountFlagsRecord(logger: logger), .accountFlags)

    XCTAssertEqual(status(result), "unreadable")
    XCTAssertTrue(reason(result)?.hasPrefix("accountFlags_decode_failed:") == true, "got \(reason(result) ?? "nil")")
  }

  func testAccountFlagsWithTheWrongRootTypeAreUnreadable() throws {
    try seedAccountList()
    try writeAccountFile(.accountFlag, archive(["not", "a", "dictionary"]))

    let result = report(storage.readAccountFlagsRecord(logger: logger), .accountFlags)

    XCTAssertEqual(reason(result), "accountFlags_unexpected_format")
  }

  // MARK: - Credential (real files)

  func testCredentialStates() throws {
    XCTAssertEqual(status(report(storage.readCredentialRecord(logger: logger), .credential)), "absent")

    try seedAccountList()
    XCTAssertEqual(status(report(storage.readCredentialRecord(logger: logger), .credential)), "absent")

    try writeAccountFile(.clientRegistration, archive([String: ClientRegistration]()))
    XCTAssertEqual(status(report(storage.readCredentialRecord(logger: logger), .credential)), "absent")

    let registration = ClientRegistration()
    try writeAccountFile(.clientRegistration, archive([storage.provider: registration]))
    XCTAssertEqual(status(report(storage.readCredentialRecord(logger: logger), .credential)), "absent")

    registration.credential = makeCredential()
    try writeAccountFile(.clientRegistration, archive([storage.provider: registration]))
    guard case let .ok(credential) = storage.readCredentialRecord(logger: logger) else {
      return XCTFail("expected ok")
    }
    XCTAssertEqual(credential.subject, "subject-1")
  }

  func testCorruptCredentialIsUnreadable() throws {
    try seedAccountList()
    try writeAccountFile(.clientRegistration, Data("not an archive".utf8))

    let result = report(storage.readCredentialRecord(logger: logger), .credential)

    XCTAssertEqual(status(result), "unreadable")
    XCTAssertTrue(reason(result)?.hasPrefix("credential_decode_failed:") == true, "got \(reason(result) ?? "nil")")
  }

  func testCredentialWithTheWrongRootTypeIsUnreadable() throws {
    try seedAccountList()
    try writeAccountFile(.clientRegistration, archive(["not a registration"]))

    let read = storage.readCredentialRecord(logger: logger)

    guard case .failed(.unexpectedFormat) = read else {
      return XCTFail("expected unexpectedFormat, got \(read)")
    }
    XCTAssertEqual(reason(report(read, .credential)), "credential_unexpected_format")
  }

  // MARK: - Authorization request (real files)

  func testAuthorizationRequestStates() throws {
    try seedAccountList()
    XCTAssertEqual(
      status(report(storage.readAuthorizationRequestRecord(logger: logger), .authorizationRequest)), "absent"
    )

    // v3 writes an empty dictionary after removing a request.
    try writeAccountFile(.authorizationRequest, archive([String: AuthorizationRequest]()))
    XCTAssertEqual(
      status(report(storage.readAuthorizationRequestRecord(logger: logger), .authorizationRequest)), "absent"
    )

    let request = AuthorizationRequest()
    request.deviceCode = "device-code"
    try writeAccountFile(.authorizationRequest, archive([storage.provider: request]))
    guard case let .ok(keyed) = storage.readAuthorizationRequestRecord(logger: logger) else {
      return XCTFail("expected ok")
    }
    XCTAssertEqual(keyed.deviceCode, "device-code")

    try writeAccountFile(.authorizationRequest, archive(request))
    guard case let .ok(single) = storage.readAuthorizationRequestRecord(logger: logger) else {
      return XCTFail("expected ok")
    }
    XCTAssertEqual(single.deviceCode, "device-code")
  }

  func testAuthorizationRequestWithTheWrongRootTypeIsUnreadable() throws {
    try seedAccountList()
    try writeAccountFile(.authorizationRequest, archive(["not a request"]))

    let result = report(storage.readAuthorizationRequestRecord(logger: logger), .authorizationRequest)

    XCTAssertEqual(reason(result), "authorizationRequest_unexpected_format")
  }

  // MARK: - Evidence (real files)

  func testEvidenceStates() throws {
    try seedAccountList()
    XCTAssertEqual(status(report(storage.readEvidenceRecord(), .evidence)), "absent")

    let archiver = DocumentsArchiver()
    try writeAccountFile(.documents, XCTUnwrap(archiver.encode([:])))
    XCTAssertEqual(status(report(storage.readEvidenceRecord(), .evidence)), "absent")

    try writeAccountFile(
      .documents, XCTUnwrap(archiver.encode([sitIssuer: DocumentsDataModel(firstId: nil, secondId: nil)]))
    )
    guard case .ok = storage.readEvidenceRecord() else {
      return XCTFail("expected ok")
    }
  }

  func testCorruptEvidenceIsUnreadable() throws {
    try seedAccountList()
    try writeAccountFile(.documents, Data("not an archive".utf8))

    let result = report(storage.readEvidenceRecord(), .evidence)

    XCTAssertEqual(status(result), "unreadable")
    XCTAssertEqual(reason(result), "evidence_decode_failed")
  }

  // MARK: - Saved services (real files)

  func testSavedServicesStates() throws {
    try seedAccountList()
    XCTAssertEqual(status(report(storage.readSavedServicesRecord(logger: logger), .savedServices)), "absent")

    let archiver = ClientMetadataArchiver()
    try writeAccountFile(.clientMetadata, XCTUnwrap(archiver.encode(ClientMetadataResponseModel(clients: []))))
    let read = storage.readSavedServicesRecord(logger: logger)
    guard case let .ok(services) = read else {
      return XCTFail("expected ok")
    }
    XCTAssertTrue(services.isEmpty)
    XCTAssertEqual(status(report(read, .savedServices)), "absent")
  }

  func testSavedServicesForAnotherProviderAreUnreadable() throws {
    try seedAccountList()
    try writeAccountFile(.clientMetadata, archive([otherProvider: ClientMetadataResponseModel(clients: [])]))

    let result = report(storage.readSavedServicesRecord(logger: logger), .savedServices)

    XCTAssertEqual(status(result), "unreadable")
    XCTAssertEqual(reason(result), "savedServices_decode_failed")
  }

  /// m0003 deletes the legacy records and then calls removeAccount; its verify needs every record absent
  /// afterwards, while the issuer file and evidence photos (outside the account directory) stay.
  func testRemovingAccountFilesLeavesEveryRecordAbsentAndKeepsSharedFiles() throws {
    try seedAccountList()
    let account = Account(id: accountID, clientID: "client-1", issuer: sitIssuer, securityMethod: .deviceAuth)
    XCTAssertTrue(storage.writeData(data: account, file: .accountMetadata, pathDirectory: .applicationSupportDirectory))
    let flags: NSDictionary = ["isEmailVerified": true]
    XCTAssertTrue(storage.writeData(data: flags, file: .accountFlag, pathDirectory: .applicationSupportDirectory))
    let photosDir = dataURL.appendingPathComponent("accounts_dir/SIT/documents")
    try FileManager.default.createDirectory(at: photosDir, withIntermediateDirectories: true)
    let photo = photosDir.appendingPathComponent("evidence_1.jpg")
    try Data([0xFF, 0xD8]).write(to: photo)

    XCTAssertTrue(storage.removeAccountFiles(accountID: accountID))

    XCTAssertEqual(status(report(storage.readAccountRecord(), .account)), "absent")
    XCTAssertEqual(status(report(storage.readAccountFlagsRecord(logger: logger), .accountFlags)), "absent")
    XCTAssertFalse(FileManager.default.fileExists(atPath: accountDirURL.path))
    XCTAssertTrue(FileManager.default.fileExists(atPath: photo.path))
    XCTAssertEqual(storage.issuer, sitIssuer)
    // removeAccountFiles leaves account_list naming the removed account.
    XCTAssertEqual(storage.currentAccountID, accountID)
  }

  func testAccountScopedRecordsAreAbsentWithoutAnAccount() {
    let reports = [
      report(storage.readCredentialRecord(logger: logger), .credential),
      report(storage.readAuthorizationRequestRecord(logger: logger), .authorizationRequest),
      report(storage.readAccountFlagsRecord(logger: logger), .accountFlags),
      report(storage.readEvidenceRecord(), .evidence),
      report(storage.readSavedServicesRecord(logger: logger), .savedServices),
    ]

    for result in reports {
      XCTAssertEqual(status(result), "absent")
    }
  }
}
