@testable import BcscCoreTestable
import LocalAuthentication
import XCTest

// MARK: - Mock Protocols

final class MockPINKeychainService: PINKeychainServiceProtocol {
  var storedSecrets: [String: PINSecret] = [:]
  var storeResult: PINKeychainServiceError?
  var deleteResult: PINKeychainServiceError?

  func storeSecret(_ secret: PINSecret) -> PINKeychainServiceError? {
    storedSecrets[secret.id] = secret
    return storeResult
  }

  func getSecret(_ id: String) -> PINSecret? {
    return storedSecrets[id]
  }

  func deleteSecret(_ id: String) -> PINKeychainServiceError? {
    storedSecrets.removeValue(forKey: id)
    return deleteResult
  }
}

final class MockLAContext: LAContextProtocol {
  var canEvaluateResult = true
  var evaluateResult = true

  func canEvaluatePolicy(_: LAPolicy, error _: NSErrorPointer) -> Bool {
    return canEvaluateResult
  }

  func evaluatePolicy(_: LAPolicy, localizedReason _: String) async throws -> Bool {
    return evaluateResult
  }
}

// MARK: - Account Tests

final class AccountTests: XCTestCase {
  // MARK: - Initialization

  func testConstructorSetsAllFields() {
    let account = Account(
      id: "abc-123",
      clientID: "my-client",
      issuer: "https://id.gov.bc.ca",
      securityMethod: .deviceAuth
    )

    XCTAssertEqual(account.id, "abc-123")
    XCTAssertEqual(account.clientID, "my-client")
    XCTAssertEqual(account.issuer, "https://id.gov.bc.ca")
    XCTAssertEqual(account.securityMethod, .deviceAuth)
  }

  func testConstructorDefaults() {
    let account = Account(
      id: "test-id",
      clientID: "test-client",
      issuer: "https://idsit.gov.bc.ca"
    )

    XCTAssertEqual(account.securityMethod, .pinNoDeviceAuth)
    XCTAssertNil(account.displayName)
    XCTAssertNil(account.nickname)
    XCTAssertFalse(account.didPostNicknameToServer)
  }

  // MARK: - NSCoding Round-Trip

  func testNSCodingRoundTrip() throws {
    let original = Account(
      id: "coding-test",
      clientID: "client-456",
      issuer: "https://id.gov.bc.ca",
      securityMethod: .pinWithDeviceAuth
    )
    original.displayName = "Test User"
    original.nickname = "Testy"
    original.didPostNicknameToServer = true

    // Encode
    let data = try NSKeyedArchiver.archivedData(withRootObject: original, requiringSecureCoding: true)

    // Decode
    let decoded = try NSKeyedUnarchiver.unarchivedObject(ofClass: Account.self, from: data)

    XCTAssertNotNil(decoded)
    XCTAssertEqual(decoded?.id, "coding-test")
    XCTAssertEqual(decoded?.clientID, "client-456")
    XCTAssertEqual(decoded?.issuer, "https://id.gov.bc.ca")
    XCTAssertEqual(decoded?.securityMethod, .pinWithDeviceAuth)
    XCTAssertEqual(decoded?.displayName, "Test User")
    XCTAssertEqual(decoded?.nickname, "Testy")
    XCTAssertEqual(decoded?.didPostNicknameToServer, true)
  }

  func testNSCodingRoundTripWithNilOptionals() throws {
    let original = Account(
      id: "nil-test",
      clientID: "client",
      issuer: "https://idsit.gov.bc.ca"
    )

    let data = try NSKeyedArchiver.archivedData(withRootObject: original, requiringSecureCoding: true)
    let decoded = try NSKeyedUnarchiver.unarchivedObject(ofClass: Account.self, from: data)

    XCTAssertNotNil(decoded)
    XCTAssertNil(decoded?.displayName)
    XCTAssertNil(decoded?.nickname)
    XCTAssertFalse(decoded?.didPostNicknameToServer ?? true)
  }

  // MARK: - hasPINSetup

  func testHasPINSetupReturnsTrueWhenPINMethodAndKeychainHasSecret() {
    let mockKeychain = MockPINKeychainService()
    let account = Account(
      id: "test-id",
      clientID: "client",
      issuer: "https://idsit.gov.bc.ca",
      securityMethod: .pinNoDeviceAuth
    )

    // Store a secret in mock keychain
    let secretID = PINSecret.composeID(issuer: account.issuer, accountID: account.id)
    let secret = PINSecret(
      salt: Data([1, 2, 3]),
      key: "test-key",
      id: secretID
    )
    mockKeychain.storedSecrets[secretID] = secret

    XCTAssertTrue(account.hasPINSetup(keychainService: mockKeychain))
  }

  func testHasPINSetupReturnsFalseForDeviceAuth() {
    let mockKeychain = MockPINKeychainService()
    let account = Account(
      id: "test-id",
      clientID: "client",
      issuer: "https://idsit.gov.bc.ca",
      securityMethod: .deviceAuth
    )

    XCTAssertFalse(account.hasPINSetup(keychainService: mockKeychain))
  }

  func testHasPINSetupReturnsFalseWhenNoSecretInKeychain() {
    let mockKeychain = MockPINKeychainService()
    let account = Account(
      id: "test-id",
      clientID: "client",
      issuer: "https://idsit.gov.bc.ca",
      securityMethod: .pinNoDeviceAuth
    )

    XCTAssertFalse(account.hasPINSetup(keychainService: mockKeychain))
  }
}

// MARK: - AccountSecurityMethod Tests

final class AccountSecurityMethodTests: XCTestCase {
  func testRawValues() {
    XCTAssertEqual(AccountSecurityMethod.pinNoDeviceAuth.rawValue, "app_pin_no_device_authn")
    XCTAssertEqual(AccountSecurityMethod.pinWithDeviceAuth.rawValue, "app_pin_has_device_authn")
    XCTAssertEqual(AccountSecurityMethod.deviceAuth.rawValue, "device_authentication")
  }

  func testIsPINReturnsTrueForPINMethods() {
    XCTAssertTrue(AccountSecurityMethod.pinNoDeviceAuth.isPIN)
    XCTAssertTrue(AccountSecurityMethod.pinWithDeviceAuth.isPIN)
  }

  func testIsPINReturnsFalseForDeviceAuth() {
    XCTAssertFalse(AccountSecurityMethod.deviceAuth.isPIN)
  }

  func testInitFromRawValue() {
    XCTAssertEqual(AccountSecurityMethod(rawValue: "app_pin_no_device_authn"), .pinNoDeviceAuth)
    XCTAssertEqual(AccountSecurityMethod(rawValue: "app_pin_has_device_authn"), .pinWithDeviceAuth)
    XCTAssertEqual(AccountSecurityMethod(rawValue: "device_authentication"), .deviceAuth)
    XCTAssertNil(AccountSecurityMethod(rawValue: "invalid"))
  }

  func testGetCurrentPINMethodWithDeviceAuth() {
    let mockContext = MockLAContext()
    mockContext.canEvaluateResult = true

    let method = AccountSecurityMethod.getCurrentPINMethod(context: mockContext)
    XCTAssertEqual(method, .pinWithDeviceAuth)
  }

  func testGetCurrentPINMethodWithoutDeviceAuth() {
    let mockContext = MockLAContext()
    mockContext.canEvaluateResult = false

    let method = AccountSecurityMethod.getCurrentPINMethod(context: mockContext)
    XCTAssertEqual(method, .pinNoDeviceAuth)
  }
}

// MARK: - PINSecret Tests

final class PINSecretTests: XCTestCase {
  func testComposeID() {
    let id = PINSecret.composeID(issuer: "https://idsit.gov.bc.ca", accountID: "abc-123")
    XCTAssertEqual(id, "https://idsit.gov.bc.ca.abc-123")
  }

  func testDecomposeID() {
    let result = PINSecret.decomposeID(id: "https://idsit.gov.bc.ca.abc-123")
    XCTAssertEqual(result.issuer, "https://idsit")
    XCTAssertEqual(result.accountID, "abc-123")
  }

  func testComposeIDWithEmptyStrings() {
    let id = PINSecret.composeID(issuer: "", accountID: "")
    XCTAssertEqual(id, ".")
  }

  func testInitWithExplicitFields() {
    let secret = PINSecret(
      salt: Data([1, 2, 3]),
      key: "test-key",
      issuer: "https://id.gov.bc.ca",
      accountID: "test-id"
    )

    XCTAssertEqual(secret.key, "test-key")
    XCTAssertEqual(secret.salt, Data([1, 2, 3]))
    XCTAssertEqual(secret.id, "https://id.gov.bc.ca.test-id")
    XCTAssertFalse(secret.isAutoGenerated)
  }

  func testInitWithAutoGenerated() {
    let secret = PINSecret(
      salt: Data([1, 2, 3]),
      key: "test-key",
      issuer: "https://id.gov.bc.ca",
      accountID: "test-id",
      isAutoGenerated: true
    )

    XCTAssertTrue(secret.isAutoGenerated)
  }

  func testInitWithCompositeID() {
    let secret = PINSecret(
      salt: Data([4, 5, 6]),
      key: "key-2",
      id: "issuer.account-id"
    )

    XCTAssertEqual(secret.key, "key-2")
    XCTAssertEqual(secret.id, "issuer.account-id")
  }
}
