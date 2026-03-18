import XCTest

/// Verifies that Foundation's JSONSerialization preserves Unicode characters
/// in the same patterns used by getDynamicClientRegistrationBody.
final class JSONSerializationTests: XCTestCase {
  // MARK: - client_name round-trip

  func testClientNamePreservesChineseCharacters() throws {
    let nickname = "我的钱包"

    let registrationData: [String: Any] = [
      "client_name": nickname,
      "token_endpoint_auth_method": "private_key_jwt",
      "application_type": "native",
    ]

    let jsonData = try JSONSerialization.data(withJSONObject: registrationData, options: [])
    let jsonString = String(data: jsonData, encoding: .utf8)

    XCTAssertNotNil(jsonString)
    XCTAssertTrue(
      try XCTUnwrap(jsonString?.contains(nickname)),
      "JSON string should contain original Chinese characters"
    )

    // Round-trip: parse back and verify
    let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: jsonData) as? [String: Any])
    XCTAssertEqual(parsed["client_name"] as? String, nickname)
  }

  func testClientNamePreservesJapaneseCharacters() throws {
    let nickname = "私の財布"

    let registrationData: [String: Any] = [
      "client_name": nickname,
      "application_type": "native",
    ]

    let jsonData = try JSONSerialization.data(withJSONObject: registrationData, options: [])
    let jsonString = String(data: jsonData, encoding: .utf8)

    XCTAssertNotNil(jsonString)
    XCTAssertTrue(try XCTUnwrap(jsonString?.contains(nickname)))

    let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: jsonData) as? [String: Any])
    XCTAssertEqual(parsed["client_name"] as? String, nickname)
  }

  func testClientNamePreservesKoreanCharacters() throws {
    let nickname = "내 지갑"

    let registrationData: [String: Any] = [
      "client_name": nickname,
      "application_type": "native",
    ]

    let jsonData = try JSONSerialization.data(withJSONObject: registrationData, options: [])
    let jsonString = String(data: jsonData, encoding: .utf8)

    XCTAssertNotNil(jsonString)
    XCTAssertTrue(try XCTUnwrap(jsonString?.contains(nickname)))

    let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: jsonData) as? [String: Any])
    XCTAssertEqual(parsed["client_name"] as? String, nickname)
  }

  func testClientNamePreservesEmoji() throws {
    let nickname = "My Wallet 🔐"

    let registrationData: [String: Any] = [
      "client_name": nickname,
      "application_type": "native",
    ]

    let jsonData = try JSONSerialization.data(withJSONObject: registrationData, options: [])

    let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: jsonData) as? [String: Any])
    XCTAssertEqual(parsed["client_name"] as? String, nickname)
  }

  func testClientNamePreservesMixedScripts() throws {
    let nickname = "My钱包Wallet"

    let registrationData: [String: Any] = [
      "client_name": nickname,
      "application_type": "native",
    ]

    let jsonData = try JSONSerialization.data(withJSONObject: registrationData, options: [])
    let jsonString = String(data: jsonData, encoding: .utf8)

    XCTAssertNotNil(jsonString)
    XCTAssertTrue(try XCTUnwrap(jsonString?.contains(nickname)))

    let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: jsonData) as? [String: Any])
    XCTAssertEqual(parsed["client_name"] as? String, nickname)
  }

  // MARK: - Full DCR body shape

  func testFullRegistrationBodyPreservesUnicodeClientName() throws {
    let nickname = "我的钱包"

    let registrationData: [String: Any] = [
      "client_name": nickname,
      "redirect_uris": ["http://localhost:8080/"],
      "grant_types": ["authorization_code"],
      "token_endpoint_auth_method": "private_key_jwt",
      "jwks": [
        "keys": [
          ["kty": "RSA", "e": "AQAB", "n": "mock-modulus", "kid": "key-1", "alg": "RS512"],
        ],
      ],
      "device_info": "eyJhbGciOiJub25lIn0.eyJkZXZpY2UiOiJ0ZXN0In0.",
      "application_type": "native",
    ]

    let jsonData = try JSONSerialization.data(withJSONObject: registrationData, options: [])
    let jsonString = String(data: jsonData, encoding: .utf8)

    XCTAssertNotNil(jsonString)
    XCTAssertTrue(try XCTUnwrap(jsonString?.contains(nickname)), "Full DCR body should preserve Chinese client_name")

    // Verify round-trip
    let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: jsonData) as? [String: Any])
    XCTAssertEqual(parsed["client_name"] as? String, nickname)
  }
}
