@testable import BcscCoreTestable
import XCTest

/// `JWTSigning` holds the stages behind every BcscCore signer (signPairingCode, createQuickLoginJWT, …). Each failing
/// stage must reject with its own code and `method.stage` site, matching Android, and carry only diagnostics that are
/// safe for remote logs.
final class JWTSigningTests: XCTestCase {
  private let method = "signPairingCode"

  private final class MockKeyPairManager: KeyPairManagerProtocol {
    var keys: [PrivateKeyInfo] = []
    var findAllError: Error?
    var getKeyPairResult: Result < (public: SecKey, private: SecKey), Error> = .failure(KeychainError.keyNotExists)
    var requestedTag: String?

    func findAllPrivateKeys() throws -> [PrivateKeyInfo] {
      if let findAllError {
        throw findAllError
      }
      return keys
    }

    func getKeyPair(with label: String) throws -> (public: SecKey, private: SecKey) {
      requestedTag = label
      return try getKeyPairResult.get()
    }

    func deleteKey(withLabel _: String) -> Bool {
      false
    }

    func findPrivateKey(with _: String) -> PrivateKeyInfo? {
      nil
    }

    func generateKeyPair(withLabel _: String, keyType _: KeyType, keySize _: Int) throws
      -> (public: SecKey, private: SecKey)
    {
      throw KeychainError.keyGenError
    }

    func keyPairExists(with _: String) throws -> Bool {
      false
    }
  }

  private var keyPairManager = MockKeyPairManager()

  override func setUp() {
    keyPairManager = MockKeyPairManager()
  }

  // MARK: - Fixtures

  /// In-memory RSA pair; never written to the keychain.
  private func makeRSAKeyPair() throws -> (public: SecKey, private: SecKey) {
    let attributes: [String: Any] = [
      kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
      kSecAttrKeySizeInBits as String: 2048,
      kSecPrivateKeyAttrs as String: [kSecAttrIsPermanent as String: false],
    ]
    var error: Unmanaged<CFError>?
    let privateKey = try XCTUnwrap(SecKeyCreateRandomKey(attributes as CFDictionary, &error))
    let publicKey = try XCTUnwrap(SecKeyCopyPublicKey(privateKey))
    return (publicKey, privateKey)
  }

  private func keyInfo(tag: String, created: Date) -> PrivateKeyInfo {
    PrivateKeyInfo(keyType: .RSA, keySize: 2048, tag: tag, created: created)
  }

  private func payload() -> JWTClaimsSet {
    JWTClaimsSet.builder().claim(name: "challenge", value: "123456").build()
  }

  private func sign() -> Result<String, Error> {
    Result { try JWTSigning(keyPairManager: keyPairManager).sign(payload: payload(), method: method) }
  }

  private func rejection(_ result: Result<String, Error>, file: StaticString = #filePath, line: UInt = #line)
    throws -> DiagnosticRejection
  {
    guard case let .failure(error) = result else {
      XCTFail("expected a rejection, got a JWT", file: file, line: line)
      throw XCTSkip()
    }
    return try XCTUnwrap(error as? DiagnosticRejection, "threw \(type(of: error))", file: file, line: line)
  }

  private func headerJSON(_ jwt: String) throws -> [String: Any] {
    let segment = try XCTUnwrap(jwt.components(separatedBy: ".").first)
    var base64 = segment.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    base64 += String(repeating: "=", count: (4 - base64.count % 4) % 4)
    let data = try XCTUnwrap(Data(base64Encoded: base64))
    return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
  }

  // MARK: - Success

  func testSignsWithTheNewestKeyAndProducesAVerifiableJWT() throws {
    let pair = try makeRSAKeyPair()
    keyPairManager.keys = [
      keyInfo(tag: "old", created: Date(timeIntervalSince1970: 1000)),
      keyInfo(tag: "newest", created: Date(timeIntervalSince1970: 3000)),
      keyInfo(tag: "middle", created: Date(timeIntervalSince1970: 2000)),
    ]
    keyPairManager.getKeyPairResult = .success(pair)

    let jwt = try sign().get()

    XCTAssertEqual(keyPairManager.requestedTag, "newest")
    XCTAssertEqual(jwt.components(separatedBy: ".").count, 3)
    let header = try headerJSON(jwt)
    XCTAssertEqual(header["alg"] as? String, "RS512")
    XCTAssertEqual(header["kid"] as? String, "newest")
    XCTAssertTrue(try JWS.parse(s: jwt).verify(verifier: RSAVerifier(rsaKey: pair.public)))
  }

  // MARK: - Stages

  func testKeyEnumerationFailureRejectsAtListKeysWithOSStatus() throws {
    keyPairManager.findAllError = KeychainError.keychainUnavailable(errSecInteractionNotAllowed)

    let rejection = try rejection(sign())

    XCTAssertEqual(rejection.code, "E_KEYSTORE_ERROR")
    XCTAssertEqual(rejection.site, "signPairingCode.list_keys")
    XCTAssertEqual(rejection.diagnostics["errorType"] as? String, "KeychainError")
    XCTAssertEqual(rejection.diagnostics["osStatus"] as? Int, Int(errSecInteractionNotAllowed))
  }

  func testNoKeysRejectsAtSelectKeyWithZeroCount() throws {
    keyPairManager.keys = []

    let rejection = try rejection(sign())

    XCTAssertEqual(rejection.code, "E_NO_KEYS_FOUND")
    XCTAssertEqual(rejection.site, "signPairingCode.select_key")
    XCTAssertEqual(rejection.diagnostics["keyCount"] as? Int, 0)
    XCTAssertNil(rejection.error)
    XCTAssertNil(keyPairManager.requestedTag, "must not try to load a key")
  }

  func testKeyRetrievalFailureRejectsAtGetKeyWithCountAndCappedCreationDates() throws {
    keyPairManager.keys = (0 ..< 7).map { keyInfo(tag: "key-\($0)", created: Date(timeIntervalSince1970: Double($0))) }
    keyPairManager.getKeyPairResult = .failure(KeychainError.unexpectedStatus(errSecItemNotFound))

    let rejection = try rejection(sign())

    XCTAssertEqual(rejection.code, "E_KEYPAIR_RETRIEVAL_FAILED")
    XCTAssertEqual(rejection.site, "signPairingCode.get_key")
    XCTAssertEqual(rejection.diagnostics["keyCount"] as? Int, 7, "true total, not the capped list")
    XCTAssertEqual(rejection.diagnostics["osStatus"] as? Int, Int(errSecItemNotFound))
    let created = try XCTUnwrap(rejection.diagnostics["keyCreated"] as? [String])
    XCTAssertEqual(created.count, SigningDiagnostics.maxKeys)
    XCTAssertEqual(created.first, ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: 6)), "newest first")
  }

  func testSigningFailureRejectsAtSign() throws {
    let pair = try makeRSAKeyPair()
    keyPairManager.keys = [keyInfo(tag: "k", created: Date())]
    // A public key can't sign, so SecKeyRawSign fails inside RSASigner.
    keyPairManager.getKeyPairResult = .success((public: pair.public, private: pair.public))

    let rejection = try rejection(sign())

    XCTAssertEqual(rejection.code, "E_JWT_SIGN_FAILED")
    XCTAssertEqual(rejection.site, "signPairingCode.sign")
    XCTAssertEqual(rejection.diagnostics["errorType"] as? String, "JOSEException")
    XCTAssertEqual(rejection.diagnostics["keyCount"] as? Int, 1)
  }

  func testSiteUsesTheCallingMethodName() throws {
    keyPairManager.keys = []

    let result = Result { try JWTSigning(keyPairManager: keyPairManager).sign(
      payload: payload(),
      method: "createQuickLoginJWT"
    ) }

    XCTAssertEqual(try rejection(result).site, "createQuickLoginJWT.select_key")
  }

  // MARK: - DiagnosticRejection (what rejectWithDiagnostics sends)

  func testNSErrorCarriesMessageSiteDiagnosticsAndDomainCodeDetail() {
    let underlying = NSError(
      domain: NSOSStatusErrorDomain, code: Int(errSecItemNotFound),
      userInfo: [NSLocalizedDescriptionKey: "secret path /var/mobile/key-tag-123"]
    )
    let rejection = DiagnosticRejection(
      code: "E_X", message: "Fixed message.", site: "m.stage", error: underlying, diagnostics: ["keyCount": 2]
    )

    let nsError = rejection.nsError

    XCTAssertEqual(nsError.domain, "BcscCore")
    XCTAssertEqual(nsError.localizedDescription, "Fixed message.")
    XCTAssertEqual(nsError.userInfo["site"] as? String, "m.stage")
    XCTAssertEqual(nsError.userInfo["keyCount"] as? Int, 2)
    XCTAssertEqual(nsError.userInfo["detail"] as? String, "\(NSOSStatusErrorDomain):\(errSecItemNotFound)")
    for value in nsError.userInfo.values {
      XCTAssertFalse("\(value)".contains("/var/mobile"), "underlying description must not leak")
      XCTAssertFalse("\(value)".contains("key-tag-123"))
    }
  }

  func testNSErrorOmitsDetailWithoutAnUnderlyingError() {
    let nsError = DiagnosticRejection(code: "E_X", message: "m", site: "s").nsError

    XCTAssertNil(nsError.userInfo["detail"])
  }

  func testErrorDiagnosticsOmitsOSStatusForNonStatusKeychainErrors() {
    let diagnostics = SigningDiagnostics.errorDiagnostics(KeychainError.keyNotExists)

    XCTAssertEqual(diagnostics["errorType"] as? String, "KeychainError")
    XCTAssertNil(diagnostics["osStatus"])
  }
}
