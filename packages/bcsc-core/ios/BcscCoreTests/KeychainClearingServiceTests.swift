@testable import BcscCoreTestable
import Security
import XCTest

/// Covers `KeychainClearingService`, which the factory-reset flow uses (via
/// `BcscCore.clearAllKeychainData`) to wipe every Keychain item belonging to this app. Keychain
/// items (unlike app files) are not removed when the app is uninstalled, so this is what lets
/// factory reset guarantee a clean slate.
final class KeychainClearingServiceTests: XCTestCase {
  private let probeService = "bcsc-core-tests.clear-keychain.generic-password"
  private let probeTag = "bcsc-core-tests.clear-keychain.key".data(using: .utf8)!

  override func setUpWithError() throws {
    try super.setUpWithError()
    try skipUnlessKeychainAvailable()
    removeTestArtifacts()
  }

  override func tearDown() {
    removeTestArtifacts()
    super.tearDown()
  }

  /// Probes the keychain with a throwaway generic-password item and skips the test when the
  /// runner has no keychain entitlement (mirrors KeyPairManagerTests).
  private func skipUnlessKeychainAvailable() throws {
    let probe: NSDictionary = [
      kSecClass: kSecClassGenericPassword,
      kSecAttrService: "bcsc-core-tests.keychain-probe",
      kSecValueData: Data("probe".utf8),
    ]
    let status = SecItemAdd(probe, nil)
    SecItemDelete(probe)
    let errSecMissingEntitlement: OSStatus = -34018
    if status == errSecMissingEntitlement {
      throw XCTSkip("keychain is unavailable in this test runner (errSecMissingEntitlement)")
    }
  }

  private func removeTestArtifacts() {
    SecItemDelete([kSecClass: kSecClassGenericPassword, kSecAttrService: probeService] as NSDictionary)
    SecItemDelete([kSecClass: kSecClassKey, kSecAttrApplicationTag: probeTag] as NSDictionary)
  }

  private func genericPasswordExists() -> Bool {
    let query: NSDictionary = [
      kSecClass: kSecClassGenericPassword,
      kSecAttrService: probeService,
    ]
    return SecItemCopyMatching(query, nil) == errSecSuccess
  }

  private func keyExists() -> Bool {
    let query: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrApplicationTag: probeTag,
    ]
    return SecItemCopyMatching(query, nil) == errSecSuccess
  }

  func testClearAllRemovesGenericPasswordAndKeyItems() {
    let genericPasswordItem: NSDictionary = [
      kSecClass: kSecClassGenericPassword,
      kSecAttrService: probeService,
      kSecValueData: Data("secret".utf8),
    ]
    XCTAssertEqual(SecItemAdd(genericPasswordItem, nil), errSecSuccess, "failed to seed probe generic-password item")

    let keyItem: NSDictionary = [
      kSecClass: kSecClassKey,
      kSecAttrApplicationTag: probeTag,
      kSecAttrKeyType: kSecAttrKeyTypeRSA,
      kSecValueData: Data(repeating: 0, count: 128),
    ]
    XCTAssertEqual(SecItemAdd(keyItem, nil), errSecSuccess, "failed to seed probe key item")

    XCTAssertTrue(genericPasswordExists(), "precondition: probe generic-password item should exist")
    XCTAssertTrue(keyExists(), "precondition: probe key item should exist")

    KeychainClearingService().clearAll()

    XCTAssertFalse(genericPasswordExists(), "clearAll should remove generic-password items")
    XCTAssertFalse(keyExists(), "clearAll should remove key items")
  }

  func testClearAllIsSafeToCallWhenKeychainIsAlreadyEmpty() {
    // No items seeded — clearAll should be a no-op, not throw/crash.
    KeychainClearingService().clearAll()
    XCTAssertFalse(genericPasswordExists())
  }
}
