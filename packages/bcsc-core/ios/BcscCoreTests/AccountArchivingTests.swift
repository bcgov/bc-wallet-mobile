@testable import BcscCoreTestable
import XCTest

// MARK: - V3 Fixture

/// Encode-only stand-in for v3's `bc_services_card.Account`, used to build archives that the v4
/// `Account` decoder has to survive.
///
/// v3 declared `clientID` as `String?` (nil until the client registers) and `_securityMethod` as a
/// `String` its setter wrote as `""` whenever securityMethod was set to nil. v4 tightened both to
/// non-optional and force-cast them, which trapped the process on those archives.
/// The explicit runtime name only satisfies the NSCoding stable-name requirement; every archive
/// below overrides it via `NSKeyedArchiver.setClassName` to impersonate v3's class.
@objc(BCSCTestLegacyV3Account)
private final class LegacyV3Account: NSObject, NSCoding {
  var id: String?
  var issuer: String?
  var clientID: String?
  var securityMethod: String?
  var displayName: String?
  var nickname: String?
  var failedAttemptCount: Int
  /// When true, nil fields are encoded as nil rather than having the key omitted entirely.
  /// v3 called `encoder.encode(clientID, forKey:)` unconditionally, so both shapes occur.
  var encodeNilsExplicitly: Bool

  init(
    id: String? = "v3-account-id",
    issuer: String? = "https://idsit.gov.bc.ca",
    clientID: String? = nil,
    securityMethod: String? = nil,
    displayName: String? = "Jane Doe",
    nickname: String? = "Janey",
    failedAttemptCount: Int = 3,
    encodeNilsExplicitly: Bool = false
  ) {
    self.id = id
    self.issuer = issuer
    self.clientID = clientID
    self.securityMethod = securityMethod
    self.displayName = displayName
    self.nickname = nickname
    self.failedAttemptCount = failedAttemptCount
    self.encodeNilsExplicitly = encodeNilsExplicitly
  }

  required init?(coder _: NSCoder) {
    nil
  } // fixture is encode-only

  func encode(with coder: NSCoder) {
    encodeField(coder, id, "id")
    encodeField(coder, issuer, "issuer")
    encodeField(coder, clientID, "client_id")
    encodeField(coder, securityMethod, "security_method")
    encodeField(coder, displayName, "display_name")
    encodeField(coder, nickname, "nickname")
    coder.encode(failedAttemptCount, forKey: "failed_attempt_count")
    coder.encode(false, forKey: "did_post_nickname_to_server")
  }

  private func encodeField(_ coder: NSCoder, _ value: String?, _ key: String) {
    if value != nil || encodeNilsExplicitly {
      coder.encode(value, forKey: key)
    }
  }
}

// MARK: - Helpers

private let v3AccountClassName = "bc_services_card.Account"

private func archiveAsV3(_ account: LegacyV3Account) -> Data {
  NSKeyedArchiver.setClassName(v3AccountClassName, for: LegacyV3Account.self)
  let archiver = NSKeyedArchiver(requiringSecureCoding: false)
  archiver.encode(account, forKey: NSKeyedArchiveRootObjectKey)
  archiver.finishEncoding()
  return archiver.encodedData
}

/// Archives the fixture the way production stores it — wrapped in the provider-keyed dictionary
/// that `StorageService.decodeArchivedObject` unwraps. This is the shape in the crash reports:
/// NSDictionary.initWithCoder → _decodeArrayOfObjectsForKey → Account.init(coder:).
private func archiveAsV3Dictionary(_ account: LegacyV3Account, provider: String) -> Data {
  NSKeyedArchiver.setClassName(v3AccountClassName, for: LegacyV3Account.self)
  let archiver = NSKeyedArchiver(requiringSecureCoding: false)
  archiver.encode([provider: account], forKey: NSKeyedArchiveRootObjectKey)
  archiver.finishEncoding()
  return archiver.encodedData
}

private func decodeAsV4Account(_ data: Data) throws -> Account? {
  NSKeyedUnarchiver.setClass(Account.self, forClassName: v3AccountClassName)
  let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
  unarchiver.requiresSecureCoding = false
  return try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey) as? Account
}

// MARK: - Decoder Tests

final class AccountArchivingTests: XCTestCase {
  // MARK: Regressed fields (the production crash)

  /// v3 left client_id absent until the client registered. v4's `as! String` trapped here — this is
  /// the crash behind all seven Xcode crash points on 4.0.x.
  func testMissingClientIDDecodesToEmptyStringInsteadOfTrapping() throws {
    let account = try decodeAsV4Account(archiveAsV3(LegacyV3Account(clientID: nil)))

    XCTAssertNotNil(account, "Account with no client_id should still decode")
    XCTAssertEqual(account?.clientID, "", "Missing client_id should become empty, not trap")
    // Empty clientID is what makes isAccountRegistered() false on the JS side.
    XCTAssertTrue(account?.clientID.isEmpty == true)
  }

  /// v3 called `encode(clientID, forKey:)` unconditionally, so the key can be present-but-nil.
  func testExplicitlyNilClientIDDecodesToEmptyString() throws {
    let fixture = LegacyV3Account(clientID: nil, encodeNilsExplicitly: true)
    let account = try decodeAsV4Account(archiveAsV3(fixture))

    XCTAssertNotNil(account)
    XCTAssertEqual(account?.clientID, "")
  }

  /// TEMPORARY_ACCOUNT_CLIENT_ID is "", written by onboarding before registration completes. That
  /// is an explicit value, not a gap, and must be distinguishable from v3's absent client_id so the
  /// repair in StorageService never re-registers a deliberately blanked account.
  func testExplicitEmptyClientIDIsNotTreatedAsMissing() throws {
    let account = try decodeAsV4Account(archiveAsV3(LegacyV3Account(clientID: "")))

    XCTAssertEqual(account?.clientID, "")
    XCTAssertEqual(
      account?.clientIDMissingFromArchive, false,
      "An explicitly encoded empty clientID is a deliberate value, not a missing entry"
    )
  }

  func testAbsentClientIDIsFlaggedAsMissing() throws {
    let account = try decodeAsV4Account(archiveAsV3(LegacyV3Account(clientID: nil)))

    XCTAssertEqual(account?.clientID, "")
    XCTAssertEqual(account?.clientIDMissingFromArchive, true)
  }

  /// Guards the assumption the whole distinction rests on: a v4 Account carrying "" round-trips as
  /// an explicit empty string, not as an absent key.
  func testV4EncodedEmptyClientIDRoundTripsAsExplicitlyPresent() throws {
    let temporary = Account(
      id: "temp-id", clientID: "", issuer: "https://idsit.gov.bc.ca", securityMethod: .deviceAuth
    )

    let archiver = NSKeyedArchiver(requiringSecureCoding: false)
    archiver.encode(temporary, forKey: NSKeyedArchiveRootObjectKey)
    archiver.finishEncoding()

    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: archiver.encodedData)
    unarchiver.requiresSecureCoding = false
    let decoded = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey) as? Account

    XCTAssertEqual(decoded?.clientID, "")
    XCTAssertEqual(
      decoded?.clientIDMissingFromArchive, false,
      "A v4 temporary account must not look like a v3 account awaiting repair"
    )
  }

  /// v3's securityMethod setter wrote "" when the method was set to nil, and "" maps to no
  /// AccountSecurityMethod case — v4's `AccountSecurityMethod(rawValue:)!` trapped.
  func testEmptySecurityMethodFallsBackToPinNoDeviceAuth() throws {
    let fixture = LegacyV3Account(securityMethod: "")
    let account = try decodeAsV4Account(archiveAsV3(fixture))

    XCTAssertNotNil(account, "Account with empty security_method should still decode")
    XCTAssertEqual(account?.securityMethod, .pinNoDeviceAuth)
  }

  func testMissingSecurityMethodFallsBackToPinNoDeviceAuth() throws {
    let account = try decodeAsV4Account(archiveAsV3(LegacyV3Account(securityMethod: nil)))

    XCTAssertNotNil(account)
    XCTAssertEqual(account?.securityMethod, .pinNoDeviceAuth)
  }

  func testUnknownSecurityMethodRawValueFallsBackToPinNoDeviceAuth() throws {
    let fixture = LegacyV3Account(securityMethod: "some_method_v4_never_heard_of")
    let account = try decodeAsV4Account(archiveAsV3(fixture))

    XCTAssertNotNil(account)
    XCTAssertEqual(account?.securityMethod, .pinNoDeviceAuth)
  }

  /// The exact production shape: both regressed fields absent, at once.
  func testMissingClientIDAndSecurityMethodTogetherDecode() throws {
    let fixture = LegacyV3Account(clientID: nil, securityMethod: nil)
    let account = try decodeAsV4Account(archiveAsV3(fixture))

    XCTAssertNotNil(account)
    XCTAssertEqual(account?.clientID, "")
    XCTAssertEqual(account?.securityMethod, .pinNoDeviceAuth)
  }

  /// Matches the crash stack, where Account is decoded as a value inside an archived dictionary.
  func testMissingClientIDDecodesWhenWrappedInProviderDictionary() throws {
    let provider = "https://idsit.gov.bc.ca/device/"
    let fixture = LegacyV3Account(clientID: nil, securityMethod: "")
    let data = archiveAsV3Dictionary(fixture, provider: provider)

    NSKeyedUnarchiver.setClass(Account.self, forClassName: v3AccountClassName)
    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = false
    let root = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)

    let decoded = (root as? [String: Account])?[provider]
    XCTAssertNotNil(decoded, "Provider-wrapped account should decode")
    XCTAssertEqual(decoded?.clientID, "")
    XCTAssertEqual(decoded?.securityMethod, .pinNoDeviceAuth)
  }

  // MARK: Fields that genuinely cannot be defaulted

  func testMissingIDFailsDecodeCleanly() throws {
    let account = try decodeAsV4Account(archiveAsV3(LegacyV3Account(id: nil)))
    XCTAssertNil(account, "An account without an id should fail the decode, not trap")
  }

  func testMissingIssuerFailsDecodeCleanly() throws {
    let account = try decodeAsV4Account(archiveAsV3(LegacyV3Account(issuer: nil)))
    XCTAssertNil(account, "An account without an issuer should fail the decode, not trap")
  }

  // MARK: Preserved fields

  func testUnaffectedFieldsSurviveALegacyDecode() throws {
    let fixture = LegacyV3Account(clientID: nil, securityMethod: "")
    let account = try decodeAsV4Account(archiveAsV3(fixture))

    XCTAssertEqual(account?.id, "v3-account-id")
    XCTAssertEqual(account?.issuer, "https://idsit.gov.bc.ca")
    XCTAssertEqual(account?.displayName, "Jane Doe")
    XCTAssertEqual(account?.nickname, "Janey")
    XCTAssertEqual(account?.failedAttemptCount, 3)
  }

  // MARK: Corrupt input

  func testGarbageDataFailsWithoutTrapping() {
    let garbage = Data([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE])
    XCTAssertThrowsError(try decodeAsV4Account(garbage))
  }

  func testTruncatedArchiveFailsWithoutTrapping() {
    let full = archiveAsV3(LegacyV3Account(clientID: "client-123", securityMethod: "device_authentication"))
    let truncated = full.prefix(full.count / 2)

    // Either a throw or a nil result is acceptable — the process must simply survive.
    let decoded = try? decodeAsV4Account(Data(truncated))
    XCTAssertNil(decoded ?? nil)
  }

  // MARK: v4 round trip

  func testV4RoundTripStillWorks() throws {
    let original = Account(
      id: "v4-id", clientID: "client-abc", issuer: "https://id.gov.bc.ca",
      securityMethod: .deviceAuth
    )
    original.displayName = "John Smith"
    original.nickname = "Johnny"
    original.failedAttemptCount = 2

    let archiver = NSKeyedArchiver(requiringSecureCoding: false)
    archiver.encode(original, forKey: NSKeyedArchiveRootObjectKey)
    archiver.finishEncoding()

    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: archiver.encodedData)
    unarchiver.requiresSecureCoding = false
    let decoded = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey) as? Account

    XCTAssertEqual(decoded?.id, "v4-id")
    XCTAssertEqual(decoded?.clientID, "client-abc")
    XCTAssertEqual(decoded?.issuer, "https://id.gov.bc.ca")
    XCTAssertEqual(decoded?.securityMethod, .deviceAuth)
    XCTAssertEqual(decoded?.displayName, "John Smith")
    XCTAssertEqual(decoded?.nickname, "Johnny")
    XCTAssertEqual(decoded?.failedAttemptCount, 2)
  }
}

// MARK: - clientID Repair (StorageService integration)

/// Covers the recovery for already-verified v3 users: v3 empties the authorization_request file
/// after verification, so the JS-side recovery in hydrateSecureState has nothing to read from and
/// client_registration is the only remaining source of clientID.
final class AccountClientIDRepairTests: XCTestCase {
  private let storage = StorageService()
  private let accountID = "repair-test-account"
  private var accountDirectory: URL!
  private var dataDirectory: URL!

  override func setUpWithError() throws {
    try super.setUpWithError()

    let root = try FileManager.default.url(
      for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
    )
    // Use the service's own basePath so the fixture lands wherever it will actually look,
    // regardless of the bundle id and issuer the test host resolves to.
    dataDirectory = root.appendingPathComponent(storage.basePath)
    accountDirectory = dataDirectory.appendingPathComponent(accountID)
    try FileManager.default.createDirectory(
      at: accountDirectory, withIntermediateDirectories: true
    )

    let accountList = try JSONSerialization.data(withJSONObject: ["accounts": [accountID]])
    try accountList.write(to: dataDirectory.appendingPathComponent("account_list"))
  }

  override func tearDownWithError() throws {
    try? FileManager.default.removeItem(at: accountDirectory)
    try? FileManager.default.removeItem(at: dataDirectory.appendingPathComponent("account_list"))
    try super.tearDownWithError()
  }

  private func writeAccountMetadata(clientID: String?) throws {
    let fixture = LegacyV3Account(clientID: clientID, securityMethod: "")
    let data = archiveAsV3Dictionary(fixture, provider: storage.provider)
    try data.write(to: accountDirectory.appendingPathComponent("account_metadata"))
  }

  /// v3's ClientRegistrationSource keyed by `provider.issuer` — issuer + "device/", which is
  /// StorageService.provider. Writing under any other key would not match what v3 produced.
  private func writeClientRegistration(clientID: String?) throws {
    let registration = ClientRegistration()
    registration.clientID = clientID
    try writeClientRegistrations([storage.provider: registration])
  }

  private func writeClientRegistrations(_ registrations: [String: ClientRegistration]) throws {
    let archiver = NSKeyedArchiver(requiringSecureCoding: false)
    archiver.encode(registrations, forKey: NSKeyedArchiveRootObjectKey)
    archiver.finishEncoding()
    try archiver.encodedData.write(
      to: accountDirectory.appendingPathComponent("client_registration")
    )
  }

  private func registration(_ clientID: String) -> ClientRegistration {
    let registration = ClientRegistration()
    registration.clientID = clientID
    return registration
  }

  /// Registrations for environments other than the one the test host resolves to. Built by
  /// filtering rather than as a literal, so this cannot collide with `storage.provider` and turn a
  /// failure into a duplicate-key crash.
  private var otherEnvironmentRegistrations: [String: ClientRegistration] {
    let others = [
      "https://id.gov.bc.ca/device/": "prod-client-id",
      "https://idsit.gov.bc.ca/device/": "sit-client-id",
      "https://iddev.gov.bc.ca/device/": "dev-client-id",
      "https://idtest.gov.bc.ca/device/": "test-client-id",
    ].filter { $0.key != storage.provider }

    return others.mapValues { registration($0) }
  }

  func testEmptyClientIDIsRepairedFromClientRegistration() throws {
    try writeAccountMetadata(clientID: nil)
    try writeClientRegistration(clientID: "recovered-client-id")

    let account: Account? = storage.readData(
      file: .accountMetadata, pathDirectory: .applicationSupportDirectory
    )

    XCTAssertEqual(
      account?.clientID, "recovered-client-id",
      "clientID should be recovered from client_registration for already-verified v3 users"
    )
  }

  func testEmptyClientIDStaysEmptyWhenNoClientRegistrationExists() throws {
    try writeAccountMetadata(clientID: nil)

    let account: Account? = storage.readData(
      file: .accountMetadata, pathDirectory: .applicationSupportDirectory
    )

    XCTAssertNotNil(account, "Account should still load without a client registration")
    XCTAssertEqual(
      account?.clientID, "",
      "With nothing to recover from, clientID stays empty so the app re-registers"
    )
  }

  func testEmptyClientIDStaysEmptyWhenRegistrationHasNoClientID() throws {
    try writeAccountMetadata(clientID: nil)
    try writeClientRegistration(clientID: nil)

    let account: Account? = storage.readData(
      file: .accountMetadata, pathDirectory: .applicationSupportDirectory
    )

    XCTAssertEqual(account?.clientID, "")
  }

  /// v3 accumulated one entry per environment in this file, so the right one has to be selected by
  /// key. Taking an arbitrary value would be unordered and could inject another environment's id.
  func testCorrectRegistrationIsSelectedAmongSeveralEnvironments() throws {
    var registrations = otherEnvironmentRegistrations
    registrations[storage.provider] = registration("correct-client-id")
    XCTAssertGreaterThan(registrations.count, 1, "Fixture must contain competing entries")

    try writeAccountMetadata(clientID: nil)
    try writeClientRegistrations(registrations)

    let account: Account? = storage.readData(
      file: .accountMetadata, pathDirectory: .applicationSupportDirectory
    )

    XCTAssertEqual(account?.clientID, "correct-client-id")
  }

  /// Better to re-register than to adopt a clientID belonging to a different environment.
  func testNoRepairWhenOnlyOtherEnvironmentsArePresent() throws {
    try writeAccountMetadata(clientID: nil)
    try writeClientRegistrations(otherEnvironmentRegistrations)

    let account: Account? = storage.readData(
      file: .accountMetadata, pathDirectory: .applicationSupportDirectory
    )

    XCTAssertEqual(
      account?.clientID, "",
      "A registration for another environment must never be adopted"
    )
  }

  func testDeliberatelyBlankedClientIDIsNotRepaired() throws {
    // TEMPORARY_ACCOUNT_CLIENT_ID: onboarding writes an explicit "" before registration completes.
    try writeAccountMetadata(clientID: "")
    try writeClientRegistration(clientID: "stale-registration-client-id")

    let account: Account? = storage.readData(
      file: .accountMetadata, pathDirectory: .applicationSupportDirectory
    )

    XCTAssertEqual(
      account?.clientID, "",
      "A deliberately blanked clientID must survive so onboarding still registers"
    )
  }

  func testExistingClientIDIsNotOverwritten() throws {
    try writeAccountMetadata(clientID: "original-client-id")
    try writeClientRegistration(clientID: "should-not-be-used")

    let account: Account? = storage.readData(
      file: .accountMetadata, pathDirectory: .applicationSupportDirectory
    )

    XCTAssertEqual(account?.clientID, "original-client-id")
  }
}

// MARK: - Failed Decode Inside the Provider Dictionary

final class AccountFailedDecodeInDictionaryTests: XCTestCase {
  /// Production archives Account as a value inside a provider-keyed dictionary. When the nested
  /// Account fails to decode, NSKeyedUnarchiver collapses the whole root object to nil rather than
  /// raising an ObjC exception that Swift could not catch — so readData just reports "no account".
  func testFailedNestedAccountDecodeCollapsesToNilWithoutRaising() throws {
    let fixture = LegacyV3Account(id: nil) // forces init?(coder:) to return nil
    let data = archiveAsV3Dictionary(fixture, provider: "https://idsit.gov.bc.ca/device/")

    NSKeyedUnarchiver.setClass(Account.self, forClassName: v3AccountClassName)
    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = false

    let root = try? unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)

    XCTAssertNil(root ?? nil, "A nil nested Account should collapse the archive, not raise")
  }
}
