@testable import BcscCoreTestable
import Security
import XCTest

// MARK: - Stand-ins

/// Keeps the account as an archive and decodes a fresh object for every read, as the real storage does,
/// so a change the store makes to the object it read is only "stored" once it is written.
private final class MockRegistrationAccountStorage: RegistrationAccountStorage {
  private var archive: Data?
  var writeSucceeds = true
  private(set) var writeCount = 0
  /// Stands in for `StorageService` reading the client ID from v3's client_registration file when the
  /// account archive has none.
  var clientRegistrationClientID: String?

  init(account: Account? = nil) {
    archive = account.map(Self.archive)
  }

  init(archive: Data) {
    self.archive = archive
  }

  func readAccount() -> Account? {
    guard let archive else { return nil }
    registerV3ClassNames(for: Account.self)
    let unarchiver = try? NSKeyedUnarchiver(forReadingFrom: archive)
    unarchiver?.requiresSecureCoding = false
    let account = unarchiver?.decodeObject(forKey: NSKeyedArchiveRootObjectKey) as? Account

    if let account, account.clientIDMissingFromArchive, let clientRegistrationClientID {
      account.clientID = clientRegistrationClientID
    }
    return account
  }

  func writeAccount(_ account: Account) -> Bool {
    writeCount += 1
    guard writeSucceeds else { return false }
    archive = Self.archive(account)
    return true
  }

  private static func archive(_ account: Account) -> Data {
    let archiver = NSKeyedArchiver(requiringSecureCoding: false)
    archiver.encode(account, forKey: NSKeyedArchiveRootObjectKey)
    archiver.finishEncoding()
    return archiver.encodedData
  }
}

private final class MockTokenStorage: TokenStorageServiceProtocol {
  var tokens: [String: Token] = [:]
  var saveStatus: OSStatus = errSecSuccess
  private(set) var deletedIDs: [String] = []

  func save(token: Token, attrAccessible _: CFString) -> TokenSaveResult {
    guard saveStatus == errSecSuccess else {
      return TokenSaveResult(
        status: saveStatus,
        detail: "branch=add status=\(saveStatus)",
        isProtectedDataAvailable: false
      )
    }
    tokens[token.id] = token
    return TokenSaveResult(status: errSecSuccess, detail: "branch=add status=0", isProtectedDataAvailable: true)
  }

  func get(id: String, diagnostic _: inout String?) -> Token? {
    tokens[id]
  }

  func delete(id: String) -> Bool {
    deletedIDs.append(id)
    return tokens.removeValue(forKey: id) != nil
  }
}

/// Encode-only stand-in for a v3 account archive, which has no `client_id` key.
@objc(BCSCTestAccountWithoutClientID)
private final class AccountWithoutClientID: NSObject, NSCoding {
  override init() {}

  required init?(coder _: NSCoder) {
    nil
  }

  func encode(with coder: NSCoder) {
    coder.encode("v3-account-id", forKey: "id")
    coder.encode("https://idsit.gov.bc.ca/device/", forKey: "issuer")
    coder.encode("device_authentication", forKey: "security_method")
    coder.encode("Janey", forKey: "nickname")
  }
}

private func v3ArchiveWithoutClientID() -> Data {
  let archiver = NSKeyedArchiver(requiringSecureCoding: false)
  archiver.setClassName("bc_services_card.Account", for: AccountWithoutClientID.self)
  archiver.encode(AccountWithoutClientID(), forKey: NSKeyedArchiveRootObjectKey)
  archiver.finishEncoding()
  return archiver.encodedData
}

// MARK: - Tests

final class RegistrationStoreTests: XCTestCase {
  private let issuer = "https://idsit.gov.bc.ca/device/"

  private func makeAccount(clientID: String, issuer: String? = nil) -> Account {
    let account = Account(
      id: "account-1", clientID: clientID, issuer: issuer ?? self.issuer, securityMethod: .pinWithDeviceAuth
    )
    account.nickname = "My phone"
    account.didPostNicknameToServer = true
    return account
  }

  private func registrationToken(_ value: String, clientID: String) -> Token {
    Token(id: RegistrationStore.tokenID(clientID: clientID), type: .Registration, token: value)
  }

  private func makeStore(
    _ accountStorage: MockRegistrationAccountStorage, _ tokenStorage: MockTokenStorage
  ) -> RegistrationStore {
    RegistrationStore(accountStorage: accountStorage, tokenStorage: tokenStorage)
  }

  private func assertRejection(
    _ expression: @autoclosure () throws -> Void, code: String, site: String,
    file: StaticString = #filePath, line: UInt = #line
  ) -> DiagnosticRejection? {
    var rejection: DiagnosticRejection?
    XCTAssertThrowsError(try expression(), file: file, line: line) { error in
      rejection = error as? DiagnosticRejection
    }
    XCTAssertEqual(rejection?.code, code, file: file, line: line)
    XCTAssertEqual(rejection?.site, site, file: file, line: line)
    return rejection
  }

  func testTokenIDMatchesTheFormatGetTokenReads() {
    XCTAssertEqual(RegistrationStore.tokenID(clientID: "client-1"), "client-1/tokens/2/1")
  }

  // MARK: - save

  func testSaveNamesTheClientIDOnTheAccountAndStoresItsToken() throws {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: ""))
    let tokens = MockTokenStorage()

    try makeStore(accounts, tokens).save(clientID: "client-a", issuer: issuer, registrationAccessToken: "token-a")

    let saved = accounts.readAccount()
    XCTAssertEqual(saved?.clientID, "client-a")
    XCTAssertEqual(saved?.issuer, issuer)
    XCTAssertEqual(tokens.tokens["client-a/tokens/2/1"]?.token, "token-a")
    XCTAssertEqual(tokens.tokens["client-a/tokens/2/1"]?.type, .Registration)
  }

  func testSaveKeepsTheOtherAccountFields() throws {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: ""))

    try makeStore(accounts, MockTokenStorage())
      .save(clientID: "client-a", issuer: issuer, registrationAccessToken: "token-a")

    let saved = accounts.readAccount()
    XCTAssertEqual(saved?.id, "account-1")
    XCTAssertEqual(saved?.securityMethod, .pinWithDeviceAuth)
    XCTAssertEqual(saved?.nickname, "My phone")
    XCTAssertEqual(saved?.didPostNicknameToServer, true)
  }

  func testSaveWithTheSameClientIDReplacesOnlyTheToken() throws {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: "client-a"))
    let tokens = MockTokenStorage()
    tokens.tokens["client-a/tokens/2/1"] = registrationToken("token-old", clientID: "client-a")

    try makeStore(accounts, tokens).save(clientID: "client-a", issuer: issuer, registrationAccessToken: "token-new")

    XCTAssertEqual(tokens.tokens["client-a/tokens/2/1"]?.token, "token-new")
    XCTAssertEqual(accounts.writeCount, 0)
  }

  func testSaveRemovesThePreviousClientIDsToken() throws {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: "client-old"))
    let tokens = MockTokenStorage()
    tokens.tokens["client-old/tokens/2/1"] = registrationToken("token-old", clientID: "client-old")

    try makeStore(accounts, tokens).save(clientID: "client-new", issuer: issuer, registrationAccessToken: "token-new")

    XCTAssertEqual(accounts.readAccount()?.clientID, "client-new")
    XCTAssertEqual(tokens.tokens["client-new/tokens/2/1"]?.token, "token-new")
    XCTAssertNil(tokens.tokens["client-old/tokens/2/1"])
  }

  func testSaveWithANilTokenLeavesTheStoredTokenAlone() throws {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: ""))
    let tokens = MockTokenStorage()
    tokens.tokens["client-a/tokens/2/1"] = registrationToken("token-a", clientID: "client-a")

    try makeStore(accounts, tokens).save(clientID: "client-a", issuer: issuer, registrationAccessToken: nil)

    XCTAssertEqual(accounts.readAccount()?.clientID, "client-a")
    XCTAssertEqual(tokens.tokens["client-a/tokens/2/1"]?.token, "token-a")
    XCTAssertTrue(tokens.deletedIDs.isEmpty)
  }

  func testSaveWritesTheClientIDIntoAV3ArchiveThatHasNone() throws {
    let accounts = MockRegistrationAccountStorage(archive: v3ArchiveWithoutClientID())
    accounts.clientRegistrationClientID = "client-v3"
    XCTAssertEqual(accounts.readAccount()?.clientIDMissingFromArchive, true)

    // Same client ID and issuer as the account reports, so only the missing archive key makes it write
    try makeStore(accounts, MockTokenStorage())
      .save(clientID: "client-v3", issuer: issuer, registrationAccessToken: "token-v3")

    accounts.clientRegistrationClientID = nil
    let saved = accounts.readAccount()
    XCTAssertEqual(accounts.writeCount, 1)
    XCTAssertEqual(saved?.clientID, "client-v3")
    XCTAssertEqual(saved?.clientIDMissingFromArchive, false)
    XCTAssertEqual(saved?.nickname, "Janey")
  }

  func testSaveRejectsWithoutAnAccount() {
    let accounts = MockRegistrationAccountStorage()
    let tokens = MockTokenStorage()

    _ = try assertRejection(
      makeStore(accounts, tokens).save(clientID: "client-a", issuer: issuer, registrationAccessToken: "token-a"),
      code: "E_ACCOUNT_NOT_FOUND", site: "setRegistration.read_account"
    )

    XCTAssertTrue(tokens.tokens.isEmpty)
    XCTAssertEqual(accounts.writeCount, 0)
  }

  func testSaveRejectsAnEmptyClientIDIssuerOrToken() {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: "client-old"))
    let tokens = MockTokenStorage()
    let store = makeStore(accounts, tokens)

    _ = try assertRejection(
      store.save(clientID: "", issuer: issuer, registrationAccessToken: "token-a"),
      code: "E_INVALID_PARAMETERS", site: "setRegistration.validate"
    )
    _ = try assertRejection(
      store.save(clientID: "client-a", issuer: "", registrationAccessToken: "token-a"),
      code: "E_INVALID_PARAMETERS", site: "setRegistration.validate"
    )
    _ = try assertRejection(
      store.save(clientID: "client-a", issuer: issuer, registrationAccessToken: ""),
      code: "E_INVALID_PARAMETERS", site: "setRegistration.validate"
    )

    XCTAssertTrue(tokens.tokens.isEmpty)
    XCTAssertEqual(accounts.writeCount, 0)
    XCTAssertEqual(accounts.readAccount()?.clientID, "client-old")
  }

  func testFailedTokenSaveLeavesThePreviousRegistration() {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: "client-old"))
    let tokens = MockTokenStorage()
    tokens.tokens["client-old/tokens/2/1"] = registrationToken("token-old", clientID: "client-old")
    tokens.saveStatus = errSecInteractionNotAllowed

    let rejection = try assertRejection(
      makeStore(accounts, tokens)
        .save(clientID: "client-new", issuer: issuer, registrationAccessToken: "token-new"),
      code: "E_TOKEN_SAVE_FAILED", site: "setRegistration.save_token"
    )

    XCTAssertEqual(rejection?.diagnostics["osStatus"] as? Int, Int(errSecInteractionNotAllowed))
    XCTAssertEqual(rejection?.diagnostics["isProtectedDataAvailable"] as? Bool, false)
    XCTAssertEqual(accounts.writeCount, 0)
    XCTAssertEqual(accounts.readAccount()?.clientID, "client-old")
    XCTAssertEqual(tokens.tokens["client-old/tokens/2/1"]?.token, "token-old")
    XCTAssertNil(tokens.tokens["client-new/tokens/2/1"])
  }

  func testFailedAccountSaveRemovesTheNewClientIDsToken() {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: "client-old"))
    accounts.writeSucceeds = false
    let tokens = MockTokenStorage()
    tokens.tokens["client-old/tokens/2/1"] = registrationToken("token-old", clientID: "client-old")

    let rejection = try assertRejection(
      makeStore(accounts, tokens)
        .save(clientID: "client-new", issuer: issuer, registrationAccessToken: "token-new"),
      code: "E_SAVE_ACCOUNT_FAILED", site: "setRegistration.save_account"
    )

    XCTAssertEqual(rejection?.diagnostics["tokenRolledBack"] as? Bool, true)
    XCTAssertEqual(accounts.readAccount()?.clientID, "client-old")
    XCTAssertEqual(tokens.tokens["client-old/tokens/2/1"]?.token, "token-old")
    XCTAssertNil(tokens.tokens["client-new/tokens/2/1"])
  }

  func testFailedAccountSavePutsBackTheTokenItReplaced() {
    // The same client ID with another issuer: the token is replaced in place, then the account write fails
    let accounts = MockRegistrationAccountStorage(
      account: makeAccount(clientID: "client-a", issuer: "https://idqa.gov.bc.ca/device/")
    )
    accounts.writeSucceeds = false
    let tokens = MockTokenStorage()
    tokens.tokens["client-a/tokens/2/1"] = registrationToken("token-old", clientID: "client-a")

    let rejection = try assertRejection(
      makeStore(accounts, tokens).save(clientID: "client-a", issuer: issuer, registrationAccessToken: "token-new"),
      code: "E_SAVE_ACCOUNT_FAILED", site: "setRegistration.save_account"
    )

    XCTAssertEqual(rejection?.diagnostics["tokenRolledBack"] as? Bool, true)
    XCTAssertEqual(tokens.tokens["client-a/tokens/2/1"]?.token, "token-old")
    XCTAssertEqual(accounts.readAccount()?.issuer, "https://idqa.gov.bc.ca/device/")
  }

  // MARK: - clear

  func testClearRemovesTheClientIDAndItsToken() throws {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: "client-a"))
    let tokens = MockTokenStorage()
    tokens.tokens["client-a/tokens/2/1"] = registrationToken("token-a", clientID: "client-a")

    try makeStore(accounts, tokens).clear()

    let saved = accounts.readAccount()
    XCTAssertEqual(saved?.clientID, "")
    XCTAssertNil(tokens.tokens["client-a/tokens/2/1"])
    // The rest of the account is kept
    XCTAssertEqual(saved?.id, "account-1")
    XCTAssertEqual(saved?.issuer, issuer)
    XCTAssertEqual(saved?.securityMethod, .pinWithDeviceAuth)
    XCTAssertEqual(saved?.nickname, "My phone")
  }

  func testClearLeavesTheOtherTokensToTheCaller() throws {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: "client-a"))
    let tokens = MockTokenStorage()
    tokens.tokens["client-a/tokens/2/1"] = registrationToken("token-a", clientID: "client-a")
    tokens.tokens["client-a/tokens/1/1"] = Token(id: "client-a/tokens/1/1", type: .Refresh, token: "refresh")

    try makeStore(accounts, tokens).clear()

    XCTAssertEqual(tokens.deletedIDs, ["client-a/tokens/2/1"])
    XCTAssertEqual(tokens.tokens["client-a/tokens/1/1"]?.token, "refresh")
  }

  func testClearStoresAnEmptyClientIDRatherThanLeavingItOut() throws {
    // Left out, the archive would read as a v3 one and take the client ID back from client_registration
    let accounts = MockRegistrationAccountStorage(archive: v3ArchiveWithoutClientID())
    accounts.clientRegistrationClientID = "client-v3"
    XCTAssertEqual(accounts.readAccount()?.clientID, "client-v3")

    try makeStore(accounts, MockTokenStorage()).clear()

    let saved = accounts.readAccount()
    XCTAssertEqual(saved?.clientIDMissingFromArchive, false)
    XCTAssertEqual(saved?.clientID, "")
  }

  func testClearWithoutAnAccountSucceeds() throws {
    let accounts = MockRegistrationAccountStorage()
    let tokens = MockTokenStorage()

    try makeStore(accounts, tokens).clear()

    XCTAssertEqual(accounts.writeCount, 0)
    XCTAssertTrue(tokens.deletedIDs.isEmpty)
  }

  func testClearWithoutARegistrationDoesNotRewriteTheAccount() throws {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: ""))

    try makeStore(accounts, MockTokenStorage()).clear()

    XCTAssertEqual(accounts.writeCount, 0)
    XCTAssertEqual(accounts.readAccount()?.clientID, "")
  }

  func testClearSucceedsWhenTheTokenIsAlreadyGone() throws {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: "client-a"))

    try makeStore(accounts, MockTokenStorage()).clear()

    XCTAssertEqual(accounts.readAccount()?.clientID, "")
  }

  func testFailedAccountSaveKeepsTheRegistration() {
    let accounts = MockRegistrationAccountStorage(account: makeAccount(clientID: "client-a"))
    accounts.writeSucceeds = false
    let tokens = MockTokenStorage()
    tokens.tokens["client-a/tokens/2/1"] = registrationToken("token-a", clientID: "client-a")

    _ = try assertRejection(
      makeStore(accounts, tokens).clear(),
      code: "E_SAVE_ACCOUNT_FAILED", site: "clearRegistration.save_account"
    )

    XCTAssertEqual(accounts.readAccount()?.clientID, "client-a")
    XCTAssertEqual(tokens.tokens["client-a/tokens/2/1"]?.token, "token-a")
    XCTAssertTrue(tokens.deletedIDs.isEmpty)
  }
}

// MARK: - Through the real account storage

/// The same save and clear against `StorageService`, so its `RegistrationAccountStorage` conformance reads
/// and writes the account file the rest of the module uses.
final class RegistrationStoreStorageServiceTests: XCTestCase {
  private let sitIssuer = "https://idsit.gov.bc.ca"
  private let accountIssuer = "https://idsit.gov.bc.ca/device/"

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

  private func seedAccount(clientID: String) throws {
    let accountID = UUID().uuidString
    try storage.updateAccountListEntry(accountID: accountID)
    let account = Account(id: accountID, clientID: clientID, issuer: accountIssuer, securityMethod: .deviceAuth)
    account.nickname = "My phone"
    XCTAssertTrue(storage.writeAccount(account))
  }

  func testSaveThenClearRoundTripsThroughTheAccountFile() throws {
    try seedAccount(clientID: "")
    let tokens = MockTokenStorage()
    let store = RegistrationStore(accountStorage: storage, tokenStorage: tokens)

    try store.save(clientID: "client-a", issuer: accountIssuer, registrationAccessToken: "token-a")

    XCTAssertEqual(StorageService().readAccount()?.clientID, "client-a")
    XCTAssertEqual(StorageService().readAccount()?.nickname, "My phone")
    XCTAssertEqual(tokens.tokens["client-a/tokens/2/1"]?.token, "token-a")

    try store.clear()

    let cleared = StorageService().readAccount()
    XCTAssertEqual(cleared?.clientID, "")
    XCTAssertEqual(cleared?.clientIDMissingFromArchive, false)
    XCTAssertEqual(cleared?.nickname, "My phone")
    XCTAssertNil(tokens.tokens["client-a/tokens/2/1"])
  }

  func testSaveRejectsWhenNoAccountFileExists() {
    let store = RegistrationStore(accountStorage: storage, tokenStorage: MockTokenStorage())

    XCTAssertThrowsError(
      try store.save(clientID: "client-a", issuer: accountIssuer, registrationAccessToken: "token-a")
    ) { error in
      XCTAssertEqual((error as? DiagnosticRejection)?.code, "E_ACCOUNT_NOT_FOUND")
    }
  }
}
