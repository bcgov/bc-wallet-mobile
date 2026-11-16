@testable import BcscCoreTestable
import XCTest

/// `accountReadStatus` explains why `getAccount` resolved nil. It runs the same read as `readData`
/// (`readDataOrThrow`), so these tests pin two things: each storage state maps to the right status code,
/// and the status says "ok" exactly when `readData` returns an account.
final class AccountReadStatusTests: XCTestCase {
  private let sitIssuer = "https://idsit.gov.bc.ca"
  private let otherProvider = "https://idqa.gov.bc.ca/device/"

  private var storage = StorageService()
  private var dataURL = URL(fileURLWithPath: "/")

  override func setUpWithError() throws {
    storage = StorageService()
    let root = try FileManager.default.url(
      for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
    )
    dataURL = root.appendingPathComponent("\(storage.currentBundleID)/data")
    try? FileManager.default.removeItem(at: dataURL)
    // Pin the environment so basePath doesn't depend on the PROD fallback / directory scan.
    XCTAssertTrue(storage.saveIssuerToFile(issuer: sitIssuer))
  }

  override func tearDownWithError() throws {
    try? FileManager.default.removeItem(at: dataURL)
  }

  // MARK: - Fixtures

  private var baseURL: URL {
    dataURL.appendingPathComponent("accounts_dir/SIT")
  }

  private func writeAccountList(_ contents: Data) throws {
    try FileManager.default.createDirectory(at: baseURL, withIntermediateDirectories: true)
    try contents.write(to: baseURL.appendingPathComponent(accountListURLComponent))
  }

  private func writeAccountList(ids: [String]) throws {
    try writeAccountList(JSONSerialization.data(withJSONObject: ["accounts": ids]))
  }

  private func writeAccountMetadata(_ contents: Data, accountID: String) throws {
    let dir = baseURL.appendingPathComponent(accountID)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    try contents.write(to: dir.appendingPathComponent(AccountFiles.accountMetadata.rawValue))
  }

  private func makeAccount(id: String) -> Account {
    Account(id: id, clientID: "client-1", issuer: sitIssuer, securityMethod: .deviceAuth)
  }

  /// Seeds a readable account through the production write path.
  @discardableResult
  private func seedValidAccount() throws -> String {
    let accountID = UUID().uuidString
    try storage.updateAccountListEntry(accountID: accountID)
    XCTAssertTrue(
      storage.writeData(
        data: makeAccount(id: accountID),
        file: .accountMetadata,
        pathDirectory: .applicationSupportDirectory
      )
    )
    return accountID
  }

  private func readAccount() -> Account? {
    storage.readData(file: .accountMetadata, pathDirectory: .applicationSupportDirectory)
  }

  // MARK: - Status codes

  func testValidAccountReportsOk() throws {
    let accountID = try seedValidAccount()

    let status = storage.accountReadStatus()

    XCTAssertEqual(status["status"], "ok")
    XCTAssertEqual(status["environment"], "SIT")
    XCTAssertNil(status["detail"])
    XCTAssertEqual(readAccount()?.id, accountID)
  }

  func testMissingAccountListReportsAccountListMissing() {
    let status = storage.accountReadStatus()

    XCTAssertEqual(status["status"], "account_list_missing")
    XCTAssertEqual(status["environment"], "SIT")
    XCTAssertNil(status["detail"])
  }

  func testEmptyAccountsArrayReportsAccountListEmpty() throws {
    try writeAccountList(ids: [])

    XCTAssertEqual(storage.accountReadStatus()["status"], "account_list_empty")
  }

  func testEmptyFirstAccountIDReportsAccountListEmpty() throws {
    try writeAccountList(ids: [""])

    XCTAssertEqual(storage.accountReadStatus()["status"], "account_list_empty")
  }

  func testAccountListWithoutAccountsKeyReportsAccountListEmpty() throws {
    try writeAccountList(JSONSerialization.data(withJSONObject: ["other": "value"]))

    XCTAssertEqual(storage.accountReadStatus()["status"], "account_list_empty")
  }

  func testMalformedAccountListReportsUnreadableWithJSONErrorDetail() throws {
    try writeAccountList(Data("not json".utf8))

    let status = storage.accountReadStatus()

    XCTAssertEqual(status["status"], "account_list_unreadable")
    XCTAssertEqual(status["detail"], "\(NSCocoaErrorDomain):\(NSPropertyListReadCorruptError)")
  }

  func testMissingAccountMetadataReportsAccountFileMissing() throws {
    try writeAccountList(ids: [UUID().uuidString])

    XCTAssertEqual(storage.accountReadStatus()["status"], "account_file_missing")
  }

  func testCorruptAccountMetadataReportsDecodeFailedWithDetail() throws {
    let accountID = UUID().uuidString
    try writeAccountList(ids: [accountID])
    try writeAccountMetadata(Data("not an archive".utf8), accountID: accountID)

    let status = storage.accountReadStatus()

    XCTAssertEqual(status["status"], "account_decode_failed")
    XCTAssertNotNil(status["detail"])
  }

  /// The archive is fine but keyed by another environment's provider — what an account looks like
  /// when it was written under one issuer and is read under another.
  func testAccountArchivedUnderAnotherProviderReportsProviderMismatch() throws {
    let accountID = UUID().uuidString
    try writeAccountList(ids: [accountID])
    let archive = try NSKeyedArchiver.archivedData(
      withRootObject: [otherProvider: makeAccount(id: accountID)], requiringSecureCoding: false
    )
    try writeAccountMetadata(archive, accountID: accountID)

    let status = storage.accountReadStatus()

    XCTAssertEqual(status["status"], "account_provider_mismatch")
    XCTAssertNil(status["detail"])
  }

  /// The report goes to remote logs: detail must be `domain:code` only — no paths, IDs or messages.
  func testDetailNeverContainsPathsOrIDs() throws {
    let accountID = UUID().uuidString
    try writeAccountList(ids: [accountID])
    try writeAccountMetadata(Data("not an archive".utf8), accountID: accountID)

    let status = storage.accountReadStatus()
    let detail = try XCTUnwrap(status["detail"])

    XCTAssertNotNil(detail.range(of: #"^[A-Za-z0-9_.]+:-?\d+$"#, options: .regularExpression), "got \(detail)")
    for value in status.values {
      XCTAssertFalse(value.contains(accountID))
      XCTAssertFalse(value.contains("/"))
    }
  }

  // MARK: - Parity with readData

  /// The reviewer's concern: if the status and the real read ever disagree, the report gives the wrong
  /// reason. For every storage state, `readData` must return an account iff the status is "ok".
  func testStatusIsOkExactlyWhenReadDataReturnsAnAccount() throws {
    let scenarios: [(name: String, arrange: () throws -> Void)] = [
      ("no account list", {}),
      ("empty account list", { try self.writeAccountList(ids: []) }),
      ("malformed account list", { try self.writeAccountList(Data("{".utf8)) }),
      ("missing metadata", { try self.writeAccountList(ids: [UUID().uuidString]) }),
      ("corrupt metadata", {
        let id = UUID().uuidString
        try self.writeAccountList(ids: [id])
        try self.writeAccountMetadata(Data([0x00, 0x01]), accountID: id)
      }),
      ("other provider", {
        let id = UUID().uuidString
        try self.writeAccountList(ids: [id])
        try self.writeAccountMetadata(
          NSKeyedArchiver.archivedData(
            withRootObject: [self.otherProvider: self.makeAccount(id: id)], requiringSecureCoding: false
          ),
          accountID: id
        )
      }),
      ("valid account", { try self.seedValidAccount() }),
    ]

    for scenario in scenarios {
      try? FileManager.default.removeItem(at: baseURL)
      try scenario.arrange()

      let isOk = storage.accountReadStatus()["status"] == "ok"
      let didRead = readAccount() != nil

      XCTAssertEqual(isOk, didRead, "\(scenario.name): status ok=\(isOk) but readData returned account=\(didRead)")
    }
  }
}
