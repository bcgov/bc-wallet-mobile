@testable import BcscCoreTestable
import XCTest

/// #4921 — the directory an account is filed under comes from `StorageService.basePath`, which is
/// derived from the stored `issuer` file and silently falls back to PROD twice over. These tests
/// cover the two halves of the reported failure: an account filed under the wrong environment, and
/// an existing account going invisible when the issuer file is (re)seeded afterwards.
///
/// Both assert how it *should* behave, wrapped in `XCTExpectFailure` so the suite stays green until
/// the switch is fixed.
///
/// TODO (bm): drop the wrappers once it is fixed — XCTest flags them as unexpected passes.
final class StorageEnvironmentNamespaceTests: XCTestCase {
  private let sitIssuer = "https://idsit.gov.bc.ca"

  private var storage = StorageService()
  private var dataURL = URL(fileURLWithPath: "/")

  private var accountsDirURL: URL {
    dataURL.appendingPathComponent("accounts_dir")
  }

  private var issuerFileURL: URL {
    dataURL.appendingPathComponent("issuer")
  }

  override func setUpWithError() throws {
    storage = StorageService()
    let root = try FileManager.default.url(
      for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
    )
    dataURL = root.appendingPathComponent("\(storage.currentBundleID)/data")
    try? FileManager.default.removeItem(at: dataURL)
  }

  override func tearDownWithError() throws {
    try? FileManager.default.removeItem(at: dataURL)
  }

  private func exists(_ url: URL) -> Bool {
    FileManager.default.fileExists(atPath: url.path)
  }

  /// Writes an account the way `setAccount` does: account_list first, then account_metadata, both
  /// through the real storage paths.
  private func seedAccount(issuer: String) throws -> String {
    let accountID = UUID().uuidString
    try storage.updateAccountListEntry(accountID: accountID)
    let account = Account(
      id: accountID, clientID: "client-1", issuer: issuer, securityMethod: .deviceAuth
    )
    XCTAssertTrue(
      storage.writeData(data: account, file: .accountMetadata, pathDirectory: .applicationSupportDirectory),
      "writeData should succeed for the seeded account"
    )
    return accountID
  }

  /// With no issuer file and no account directories to infer from, the environment is PROD — the
  /// condition `BcscCore.getIssuer` then reports to JS as "no issuer set".
  func testNoIssuerFileAndNoAccountsResolvesToProd() {
    XCTAssertFalse(exists(issuerFileURL))
    XCTAssertEqual(storage.issuer, storage.productionIssuer)
    XCTAssertTrue(storage.basePath.hasSuffix("/accounts_dir/PROD"), "got \(storage.basePath)")
  }

  /// An account created in that window is filed under PROD even though the account itself (and the
  /// API traffic) belong to SIT. `setAccount` never uses the issuer it is handed to pick the path.
  func testAccountIsFiledUnderTheEnvironmentItsIssuerNames() throws {
    let accountID = try seedAccount(issuer: sitIssuer)

    XCTExpectFailure("#4921: filed under PROD rather than the SIT issuer it was handed") {
      XCTAssertTrue(exists(accountsDirURL.appendingPathComponent("SIT/account_list")))
      XCTAssertFalse(exists(accountsDirURL.appendingPathComponent("PROD/account_list")))
    }

    // Reachable either way — today only because the directory scan infers PROD.
    XCTAssertEqual(storage.currentAccountID, accountID)
    let readBack: Account? = storage.readData(
      file: .accountMetadata, pathDirectory: .applicationSupportDirectory
    )
    XCTAssertEqual(readBack?.issuer, sitIssuer, "the record says SIT while living in the PROD directory")
  }

  /// The lockout: `initIssuer` seeds the build-default issuer because `getIssuer` reported nil
  /// (PROD fallback + no issuer file), the namespace flips, and the existing account disappears.
  /// This is what surfaces at Unlock as E_ACCOUNT_NOT_FOUND / account_not_found (2822).
  func testAccountRemainsFoundAfterTheIssuerFileIsSeeded() throws {
    let accountID = try seedAccount(issuer: sitIssuer)
    XCTAssertEqual(storage.currentAccountID, accountID)

    XCTAssertTrue(storage.saveIssuerToFile(issuer: sitIssuer))
    XCTAssertTrue(storage.basePath.hasSuffix("/accounts_dir/SIT"), "got \(storage.basePath)")

    XCTExpectFailure("#4921: seeding the issuer file moves the namespace out from under the account") {
      XCTAssertEqual(storage.currentAccountID, accountID)
      let readBack: Account? = storage.readData(
        file: .accountMetadata, pathDirectory: .applicationSupportDirectory
      )
      XCTAssertEqual(readBack?.id, accountID, "unlock reads the security method from this record")
    }
  }

  /// The inverse, and why "all my files were in PROD" and "stuck at Unlock" are the same bug: a
  /// correct SIT install whose issuer file is lost keeps working off the directory scan, so nothing
  /// ever rewrites the file — the install sits one account-removal away from resolving to PROD.
  /// TODO: (bm): should fail once fixed — losing the issuer file must not strand the account.
  func testIssuerFileLossIsMaskedByTheDirectoryScan() throws {
    XCTAssertTrue(storage.saveIssuerToFile(issuer: sitIssuer))
    let accountID = try seedAccount(issuer: sitIssuer)
    XCTAssertTrue(exists(accountsDirURL.appendingPathComponent("SIT/account_list")))

    try FileManager.default.removeItem(at: issuerFileURL)

    XCTAssertEqual(storage.issuer, sitIssuer, "inferred from the SIT account directory")
    XCTAssertEqual(storage.currentAccountID, accountID)

    // Remove just the account directory, as removeAccount/factory reset does (account_list stays).
    XCTAssertTrue(storage.removeAccountFiles(accountID: accountID))

    XCTAssertEqual(storage.issuer, storage.productionIssuer, "nothing left to infer from: PROD")
    XCTAssertTrue(storage.basePath.hasSuffix("/accounts_dir/PROD"), "got \(storage.basePath)")
    XCTAssertTrue(
      exists(accountsDirURL.appendingPathComponent("SIT/account_list")),
      "the orphaned SIT account_list is now in a directory the app no longer reads"
    )
  }
}
