@testable import BcscCoreTestable
import Security
import XCTest

/// Server public keys arrive as JWKs and must become in-memory SecKeys that verify the inner JWS.
/// This runner has no keychain entitlement (every SecItem call fails), so a green run is also the
/// proof that nothing here touches the keychain.
final class JWKTests: XCTestCase {
  private var privateKey: SecKey!
  private var jwk: JWK!

  override func setUpWithError() throws {
    try super.setUpWithError()
    privateKey = try JWKTests.ephemeralPrivateKey()
    jwk = try JWKTests.jwk(for: privateKey, kid: "unit-test")
  }

  // MARK: - Fixtures

  /// A key that lives only in this process: no kSecAttrIsPermanent, so no keychain.
  private static func ephemeralPrivateKey(bits: Int = 2048) throws -> SecKey {
    let attributes: [CFString: Any] = [
      kSecAttrKeyType: kSecAttrKeyTypeRSA,
      kSecAttrKeySizeInBits: bits,
    ]
    var error: Unmanaged<CFError>?
    return try XCTUnwrap(SecKeyCreateRandomKey(attributes as CFDictionary, &error), "\(String(describing: error))")
  }

  private static func publicKeyData(_ privateKey: SecKey) throws -> Data {
    let publicKey = try XCTUnwrap(SecKeyCopyPublicKey(privateKey))
    var error: Unmanaged<CFError>?
    return try XCTUnwrap(SecKeyCopyExternalRepresentation(publicKey, &error) as Data?)
  }

  /// The JWK as a JWKS endpoint publishes it: base64url modulus and exponent. The exported DER
  /// integer carries a leading zero; a real JWKS sends the modulus unsigned, so tests ask for both.
  private static func jwk(for privateKey: SecKey, kid: String, unsignedModulus: Bool = false) throws -> JWK {
    var (modulus, exponent) = try XCTUnwrap(RSAUtil.splitIntoComponents(keyData: publicKeyData(privateKey)))
    if unsignedModulus, modulus.first == 0x00 {
      modulus.removeFirst()
    }
    return JWK(kid: kid, kty: .RSA, alg: "RS512", e: Base64URL.encode(exponent), n: Base64URL.encode(modulus))
  }

  private func signedToken(signedBy key: SecKey? = nil) throws -> String {
    let claims = JWTClaimsSet.Builder().subject("user-123").build()
    let jws = JWS(header: JWSHeader(alg: JWSAlgorithm.RS512, kid: "unit-test"), payload: claims)
    try jws.sign(signer: RSASigner(privateKey: key ?? privateKey))
    return try jws.serialize()
  }

  private func verifier(for jwk: JWK) throws -> RSAVerifier {
    return try RSAVerifier(rsaKey: JWK.jwkToSecKey(jwk: jwk))
  }

  // MARK: - jwkToSecKey

  func testBuildsThePublicKeyInMemory() throws {
    let key = try JWK.jwkToSecKey(jwk: jwk)

    var error: Unmanaged<CFError>?
    XCTAssertEqual(SecKeyCopyExternalRepresentation(key, &error) as Data?, try JWKTests.publicKeyData(privateKey))
    XCTAssertEqual(SecKeyGetBlockSize(key), 256)
  }

  /// The server key is 4096-bit and its JWKS modulus has no leading zero, so the 513-byte padded
  /// integer and its long-form DER length must import and verify as well as the 2048-bit fixture.
  func testBuildsAndVerifiesWithBothKeySizesWithAndWithoutTheLeadingZero() throws {
    for bits in [2048, 4096] {
      let key = try JWKTests.ephemeralPrivateKey(bits: bits)
      let token = try JWS.parse(s: signedToken(signedBy: key))
      for unsignedModulus in [false, true] {
        let jwk = try JWKTests.jwk(for: key, kid: "k\(bits)", unsignedModulus: unsignedModulus)
        let secKey = try JWK.jwkToSecKey(jwk: jwk)

        XCTAssertEqual(SecKeyGetBlockSize(secKey), bits / 8, "\(bits)-bit, unsignedModulus=\(unsignedModulus)")
        XCTAssertEqual(
          SecKeyCopyExternalRepresentation(secKey, nil) as Data?, try JWKTests.publicKeyData(key),
          "\(bits)-bit, unsignedModulus=\(unsignedModulus)"
        )
        XCTAssertTrue(
          try token.verify(verifier: RSAVerifier(rsaKey: secKey)), "\(bits)-bit, unsignedModulus=\(unsignedModulus)"
        )
      }
    }
  }

  func testRejectsANonRsaKeyType() {
    let ecKey = JWK(kid: "ec", kty: .EC, alg: "ES256", e: jwk.e, n: jwk.n)

    XCTAssertThrowsError(try JWK.jwkToSecKey(jwk: ecKey)) { error in
      guard case JWKError.unsupportedKeyType(kty: "EC", kid: "ec") = error else {
        return XCTFail("expected unsupportedKeyType, got \(error)")
      }
    }
  }

  func testRejectsAModulusThatIsNotBase64url() {
    let broken = JWK(kid: "broken", kty: .RSA, alg: "RS512", e: jwk.e, n: "!!!")

    XCTAssertThrowsError(try JWK.jwkToSecKey(jwk: broken)) { error in
      guard case JWKError.malformedComponent(name: "n", kid: "broken") = error else {
        return XCTFail("expected malformedComponent(n), got \(error)")
      }
      // The reject sites interpolate through the Error existential; the message must survive that
      // and must not leak the modulus.
      XCTAssertEqual(error.localizedDescription, "JWK kid=broken component n is not base64url")
    }
  }

  // MARK: - Verification through RSAVerifier

  func testRS512SignatureVerifies() throws {
    let parsed = try JWS.parse(s: signedToken())

    XCTAssertTrue(try parsed.verify(verifier: verifier(for: jwk)))
  }

  func testAnotherKeyDoesNotVerify() throws {
    let otherJwk = try JWKTests.jwk(for: JWKTests.ephemeralPrivateKey(), kid: "other")
    let parsed = try JWS.parse(s: signedToken())

    XCTAssertFalse(try parsed.verify(verifier: verifier(for: otherJwk)))
  }

  /// Either way round, a signature of another key size is a mismatch (as on Android), never an error.
  func testASignatureOfAnotherKeySizeDoesNotVerify() throws {
    let bigKey = try JWKTests.ephemeralPrivateKey(bits: 4096)
    let bigJwk = try JWKTests.jwk(for: bigKey, kid: "big")

    XCTAssertFalse(try JWS.parse(s: signedToken()).verify(verifier: verifier(for: bigJwk)))
    XCTAssertFalse(try JWS.parse(s: signedToken(signedBy: bigKey)).verify(verifier: verifier(for: jwk)))
  }

  func testTamperedSignatureDoesNotVerify() throws {
    var parts = try signedToken().components(separatedBy: ".")
    // Swapping one base64url character keeps the signature decodable but wrong.
    parts[2] = (parts[2].hasPrefix("A") ? "B" : "A") + parts[2].dropFirst()
    let parsed = try JWS.parse(s: parts.joined(separator: "."))

    XCTAssertFalse(try parsed.verify(verifier: verifier(for: jwk)))
  }

  func testUnsupportedAlgorithmThrowsInsteadOfReportingAMismatch() throws {
    // An HS256 header names no RSA algorithm, so the verifier cannot run at all.
    var parts = try signedToken().components(separatedBy: ".")
    parts[0] = Base64URL.encode("{\"alg\":\"HS256\",\"kid\":\"unit-test\"}")
    let parsed = try JWS.parse(s: parts.joined(separator: "."))

    XCTAssertThrowsError(try parsed.verify(verifier: verifier(for: jwk)))
  }
}
