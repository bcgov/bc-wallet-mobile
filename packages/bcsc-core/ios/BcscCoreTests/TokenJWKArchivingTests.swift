@testable import BcscCoreTestable
import XCTest

// MARK: - Helpers

/// Archives a dictionary of raw key/value pairs so tests can build partial archives that omit keys
/// a model's decoder used to force-unwrap.
private func archive(_ build: (NSKeyedArchiver) -> Void) -> Data {
  let archiver = NSKeyedArchiver(requiringSecureCoding: false)
  build(archiver)
  archiver.finishEncoding()
  return archiver.encodedData
}

/// Encode-only fixture that writes an arbitrary set of coding keys under a chosen class name,
/// letting us feed the real decoder archives that are missing fields or carry unknown enum values.
@objc(BCSCTestPartialFixture)
private final class PartialFixture: NSObject, NSCoding {
  let strings: [String: String]
  let ints: [String: Int]
  let dates: [String: Date]

  init(strings: [String: String] = [:], ints: [String: Int] = [:], dates: [String: Date] = [:]) {
    self.strings = strings
    self.ints = ints
    self.dates = dates
  }

  required init?(coder _: NSCoder) {
    nil
  }

  func encode(with coder: NSCoder) {
    for (key, value) in strings {
      coder.encode(value, forKey: key)
    }
    for (key, value) in ints {
      coder.encode(value, forKey: key)
    }
    for (key, value) in dates {
      coder.encode(value, forKey: key)
    }
  }
}

private func decode<T: NSObject & NSCoding>(_ data: Data, as _: T.Type, className: String) throws -> T? {
  NSKeyedUnarchiver.setClass(T.self, forClassName: className)
  let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
  unarchiver.requiresSecureCoding = false
  return try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey) as? T
}

private func archiveFixture(_ fixture: PartialFixture, as className: String) -> Data {
  NSKeyedArchiver.setClassName(className, for: PartialFixture.self)
  return archive { $0.encode(fixture, forKey: NSKeyedArchiveRootObjectKey) }
}

// MARK: - Token

/// Token's coding keys are deliberately mismatched with its property names in the model
/// (`type` → "subject", `token` → "label", `created` → "issuer", `expiry` → "created").
private enum TokenKey {
  static let id = "id"
  static let type = "subject"
  static let token = "label"
  static let created = "issuer"
  static let expiry = "created"
}

final class TokenArchivingTests: XCTestCase {
  private let className = "bc_services_card.Token"

  func testValidTokenDecodes() throws {
    let created = Date(timeIntervalSince1970: 1_700_000_000)
    let fixture = PartialFixture(
      strings: [TokenKey.id: "token-1", TokenKey.token: "abc123"],
      ints: [TokenKey.type: TokenType.Refresh.rawValue],
      dates: [TokenKey.created: created]
    )

    let token = try decode(archiveFixture(fixture, as: className), as: Token.self, className: className)

    XCTAssertEqual(token?.id, "token-1")
    XCTAssertEqual(token?.type, .Refresh)
    XCTAssertEqual(token?.token, "abc123")
    XCTAssertEqual(token?.created, created)
    XCTAssertNil(token?.expiry)
  }

  /// id was added in 0.9.2, so older archives legitimately lack it — this one must still decode.
  func testMissingIDDefaultsToEmptyString() throws {
    let fixture = PartialFixture(
      strings: [TokenKey.token: "abc123"],
      ints: [TokenKey.type: TokenType.Access.rawValue],
      dates: [TokenKey.created: Date()]
    )

    let token = try decode(archiveFixture(fixture, as: className), as: Token.self, className: className)

    XCTAssertNotNil(token, "A token predating the id field should still decode")
    XCTAssertEqual(token?.id, "")
  }

  /// decodeInteger returns 0 for a missing key, so archives predating the field already decoded as
  /// .Access. Preserved deliberately — type is metadata, and failing the decode over it would log
  /// the user out of an otherwise usable token.
  func testMissingTypeDefaultsToAccess() throws {
    let fixture = PartialFixture(
      strings: [TokenKey.id: "token-1", TokenKey.token: "abc123"],
      dates: [TokenKey.created: Date()]
    )

    let token = try decode(archiveFixture(fixture, as: className), as: Token.self, className: className)

    XCTAssertNotNil(token, "A token predating the type field should still decode")
    XCTAssertEqual(token?.type, .Access)
    XCTAssertEqual(token?.token, "abc123", "The usable payload must survive")
  }

  func testUnknownTypeRawValueDefaultsToAccessWithoutTrapping() throws {
    let fixture = PartialFixture(
      strings: [TokenKey.id: "token-1", TokenKey.token: "abc123"],
      ints: [TokenKey.type: 99],
      dates: [TokenKey.created: Date()]
    )

    let token = try decode(archiveFixture(fixture, as: className), as: Token.self, className: className)

    XCTAssertNotNil(token, "An unknown type raw value must not trap or drop the token")
    XCTAssertEqual(token?.type, .Access)
  }

  func testMissingTokenValueFailsWithoutTrapping() throws {
    let fixture = PartialFixture(
      strings: [TokenKey.id: "token-1"],
      ints: [TokenKey.type: TokenType.Access.rawValue],
      dates: [TokenKey.created: Date()]
    )

    let token = try decode(archiveFixture(fixture, as: className), as: Token.self, className: className)

    XCTAssertNil(token)
  }

  func testMissingCreatedDateFailsWithoutTrapping() throws {
    let fixture = PartialFixture(
      strings: [TokenKey.id: "token-1", TokenKey.token: "abc123"],
      ints: [TokenKey.type: TokenType.Access.rawValue]
    )

    let token = try decode(archiveFixture(fixture, as: className), as: Token.self, className: className)

    XCTAssertNil(token)
  }

  func testRoundTrip() throws {
    let original = Token(
      id: "rt-1", type: .Registration, token: "tok",
      created: Date(timeIntervalSince1970: 1_600_000_000),
      expiry: Date(timeIntervalSince1970: 1_600_003_600)
    )
    let data = archive { $0.encode(original, forKey: NSKeyedArchiveRootObjectKey) }

    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = false
    let decoded = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey) as? Token

    XCTAssertEqual(decoded?.id, "rt-1")
    XCTAssertEqual(decoded?.type, .Registration)
    XCTAssertEqual(decoded?.token, "tok")
    XCTAssertEqual(decoded?.created, original.created)
    XCTAssertEqual(decoded?.expiry, original.expiry)
  }
}

// MARK: - JWK

/// JWK archives under property-style keys, not the JWK JSON field names (kty/alg/kid/e/n).
private enum JWKKey {
  static let keyType = "keyType"
  static let algorithm = "algorithm"
  static let keyID = "keyID"
  static let exponent = "exponent"
  static let modulus = "modulus"
}

final class JWKArchivingTests: XCTestCase {
  private let className = "bc_services_card.JWK"

  private func fixture(omitting omitted: String? = nil, keyType: String = "RSA") -> PartialFixture {
    var strings = [
      JWKKey.keyType: keyType,
      JWKKey.algorithm: "RS256",
      JWKKey.keyID: "key-1",
      JWKKey.exponent: "AQAB",
      JWKKey.modulus: "0vx7ag",
    ]
    if let omitted { strings.removeValue(forKey: omitted) }
    return PartialFixture(strings: strings)
  }

  func testValidJWKDecodes() throws {
    let jwk = try decode(archiveFixture(fixture(), as: className), as: JWK.self, className: className)

    XCTAssertEqual(jwk?.kty, .RSA)
    XCTAssertEqual(jwk?.alg, "RS256")
    XCTAssertEqual(jwk?.kid, "key-1")
    XCTAssertEqual(jwk?.e, "AQAB")
    XCTAssertEqual(jwk?.n, "0vx7ag")
  }

  func testUnknownKeyTypeFailsWithoutTrapping() throws {
    let data = archiveFixture(fixture(keyType: "Ed25519"), as: className)
    let jwk = try decode(data, as: JWK.self, className: className)

    XCTAssertNil(jwk, "An unrecognised kty must fail the decode, not trap")
  }

  func testEachMissingRequiredFieldFailsWithoutTrapping() throws {
    for key in [JWKKey.keyType, JWKKey.algorithm, JWKKey.keyID, JWKKey.exponent, JWKKey.modulus] {
      let data = archiveFixture(fixture(omitting: key), as: className)
      let jwk = try decode(data, as: JWK.self, className: className)

      XCTAssertNil(jwk, "JWK missing '\(key)' should fail the decode, not trap")
    }
  }

  func testRoundTrip() throws {
    let original = JWK(kid: "rt-key", kty: .RSA, alg: "RS256", e: "AQAB", n: "modulus")
    let data = archive { $0.encode(original, forKey: NSKeyedArchiveRootObjectKey) }

    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = false
    let decoded = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey) as? JWK

    XCTAssertEqual(decoded?.kid, "rt-key")
    XCTAssertEqual(decoded?.kty, .RSA)
    XCTAssertEqual(decoded?.alg, "RS256")
    XCTAssertEqual(decoded?.e, "AQAB")
    XCTAssertEqual(decoded?.n, "modulus")
  }
}
