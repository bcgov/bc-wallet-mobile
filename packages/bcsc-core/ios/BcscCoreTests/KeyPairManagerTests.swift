@testable import BcscCoreTestable
import Security
import XCTest

/// The reject sites interpolate `error.localizedDescription` through the `Error`
/// existential; without LocalizedError conformance that renders as
/// "(BcscCore.KeychainError error 1.)" and problem reports lose the real reason.
final class KeychainErrorTests: XCTestCase {
  func testKeychainErrorMessagesSurviveErrorExistential() {
    let notExists: Error = KeychainError.keyNotExists
    let alreadyExists: Error = KeychainError.keyAlreadyExists
    let genError: Error = KeychainError.keyGenError

    XCTAssertEqual(notExists.localizedDescription, "key does not exist in the keychain")
    XCTAssertEqual(alreadyExists.localizedDescription, "key already exists in the keychain")
    XCTAssertEqual(genError.localizedDescription, "key pair generation failed")
  }
}

/// Exercises the real simulator keychain. Covers the key lifecycle relied on by
/// dynamic client registration (issue #4032 / error 2603): generation, discovery
/// via `findAllPrivateKeys`, and retrieval via `getKeyPair`.
///
/// The SPM test runner has no host app and therefore no keychain entitlement —
/// every Security call fails with errSecMissingEntitlement (-34018). These tests
/// skip themselves in that environment and run wherever a keychain is available
/// (e.g. hosted in an app target).
final class KeyPairManagerTests: XCTestCase {
  private let testLabel = "https://test.invalid/device/UNIT-TEST/1"
  private let unknownLabel = "https://test.invalid/device/DOES-NOT-EXIST/1"
  private let pollutionTag = "com.mcsi.op.unit-test"
  private var manager: KeyPairManager!

  override func setUpWithError() throws {
    try super.setUpWithError()
    try skipUnlessKeychainAvailable()
    manager = KeyPairManager()
    removeTestArtifacts()
  }

  override func tearDown() {
    // tearDown also runs when setUpWithError skipped, before manager is assigned
    if manager != nil {
      removeTestArtifacts()
    }
    manager = nil
    super.tearDown()
  }

  /// Probes the keychain with a throwaway generic-password item and skips the
  /// test when the runner has no keychain entitlement.
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

  /// Best-effort removal of every keychain item a test may have created.
  private func removeTestArtifacts() {
    _ = manager.deleteKey(withLabel: testLabel)
    // The legacy public-key import stores its tag as a CFString while app keys
    // store Data — clear both representations.
    for tag in [pollutionTag, "jwtutil.temp"] {
      SecItemDelete([kSecClass: kSecClassKey, kSecAttrApplicationTag: tag] as NSDictionary)
      SecItemDelete([kSecClass: kSecClassKey, kSecAttrApplicationTag: tag.data(using: .utf8)!] as NSDictionary)
    }
  }

  // MARK: - Lifecycle round trip

  func testGenerateAndRetrieveKeyPairRoundTrip() throws {
    _ = try manager.generateKeyPair(withLabel: testLabel, keyType: KeyType.RSA, keySize: 2048)

    let keyPair = try manager.getKeyPair(with: testLabel)
    XCTAssertNotNil(SecKeyCopyPublicKey(keyPair.private), "retrieved private key should derive a public key")

    let info = manager.findPrivateKey(with: testLabel)
    XCTAssertEqual(info?.tag, testLabel)
    XCTAssertEqual(info?.keySize, 2048)
  }

  func testFindAllPrivateKeysIncludesGeneratedKey() throws {
    _ = try manager.generateKeyPair(withLabel: testLabel, keyType: KeyType.RSA, keySize: 2048)

    let keys = manager.findAllPrivateKeys()
    XCTAssertTrue(keys.contains { $0.tag == testLabel }, "discovery should list the generated key by tag")
  }

  func testGetKeyPairThrowsKeyNotExistsForUnknownLabel() {
    XCTAssertThrowsError(try manager.getKeyPair(with: unknownLabel)) { error in
      guard case KeychainError.keyNotExists = error else {
        return XCTFail("expected KeychainError.keyNotExists, got \(error)")
      }
    }
  }

  func testKeyPairExistsReflectsKeychainState() throws {
    XCTAssertFalse(manager.keyPairExists(with: testLabel))
    _ = try manager.generateKeyPair(withLabel: testLabel, keyType: KeyType.RSA, keySize: 2048)
    XCTAssertTrue(manager.keyPairExists(with: testLabel))
  }

  // MARK: - Foreign keychain items (issue #4032 hypothesis)

  /// Quick login and login-challenge verification historically imported the *server's*
  /// public key into the keychain (`RSAUtil.insertPublicKey`, tag `com.mcsi.op.<kid>`,
  /// no label). If such items ever surfaced in `findAllPrivateKeys`, the newest one
  /// would be selected as the signing key and retrieval by label would fail — the
  /// exact 2603 signature. This pins the actual platform behavior.
  func testImportedServerPublicKeyDoesNotAppearInPrivateKeyDiscovery() throws {
    let (publicKey, _) = try manager.generateKeyPair(withLabel: testLabel, keyType: KeyType.RSA, keySize: 2048)

    var error: Unmanaged<CFError>?
    guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
      return XCTFail("could not export public key bits: \(String(describing: error))")
    }
    guard let (modulus, exponent) = RSAUtil.splitIntoComponents(keyData: publicKeyData) else {
      return XCTFail("could not split exported key into modulus/exponent")
    }

    // Import through the legacy path exactly as production code did.
    let imported = RSAUtil.insertPublicKey(tag: pollutionTag, exponent: exponent, modulus: modulus)

    let keys = manager.findAllPrivateKeys()
    XCTAssertFalse(
      keys.contains { $0.tag == pollutionTag },
      """
      imported server public key (imported=\(imported != nil)) leaked into private-key \
      discovery — foreign items can shadow the signing key and cause error 2603
      """
    )

    // The app's own key must remain discoverable and retrievable regardless.
    XCTAssertTrue(keys.contains { $0.tag == testLabel })
    XCTAssertNoThrow(try manager.getKeyPair(with: testLabel))
  }
}
