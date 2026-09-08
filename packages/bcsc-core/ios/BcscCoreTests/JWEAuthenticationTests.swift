@testable import BcscCoreTestable
import XCTest

final class JWEAuthenticationTests: XCTestCase {
  private let plaintext =
    "A cipher system must not be required to be secret, and it must be able to fall into the hands of the enemy without inconvenience"
  private let aad = Data("The second principle of Auguste Kerckhoffs".utf8)
  private let iv = Data(hex: "1af38c2dc2b96ffdd86694092341bc04")

  func testTagsMatchWhenBytesAreIdentical() {
    XCTAssertTrue(JWEAuthentication.tagsMatch(expected: Data([1, 2, 3]), received: Data([1, 2, 3])))
  }

  func testTamperedTagIsRejected() {
    XCTAssertFalse(JWEAuthentication.tagsMatch(expected: Data([1, 2, 3]), received: Data([1, 2, 4])))
  }

  func testTruncatedTagIsRejectedWithoutIndexingPastItsLength() {
    XCTAssertFalse(JWEAuthentication.tagsMatch(expected: Data([1, 2, 3]), received: Data([1, 2])))
  }

  func testRfc7518A128CbcHs256FixtureDecryptsAndRejectsTamperedTag() throws {
    let key = Data((0 ... 31).map(UInt8.init))
    let cipherText = Data(hex: """
    c80edfa32ddf39d5ef00c0b468834279a2e46a1b8049f792f76bfe54b903a9c9a94ac9b47ad2655c5f10f9aef71427e2fc6f9b3f399a221489f16362c703233609d45ac69864e3321cf82935ac4096c86e133314c54019e8ca7980dfa4b9cf1b384c486f3a54c51078158ee5d79de59fbd34d848b3d69550a67646344427ade54b8851ffb598f7f80074b9473c82e2db
    """)
    let tag = Data(hex: "652c3fa36b0a7c5b3219fab3a30bc1c4")

    XCTAssertEqual(try decrypt(key: key, cipherText: cipherText, tag: tag), Data(plaintext.utf8))
    var tamperedTag = tag
    tamperedTag[0] ^= 0x01
    XCTAssertNil(try decrypt(key: key, cipherText: cipherText, tag: tamperedTag))
  }

  func testRfc7518A192CbcHs384FixtureDecrypts() throws {
    let key = Data((0 ... 47).map(UInt8.init))
    let cipherText = Data(hex: """
    ea65da6b59e61edb419be62d19712ae5d303eeb50052d0dfd6697f77224c8edb000d279bdc14c1072654bd30944230c657bed4ca0c9f4a8466f22b226d1746214bf8cfc2400add9f5126e479663fc90b3bed787a2f0ffcbf3904be2a641d5c2105bfe591bae23b1d7449e532eef60a9ac8bb6c6b01d35d49787bcd57ef484927f280adc91ac0c4e79c7b11efc60054e3
    """)
    let tag = Data(hex: "8490ac0e58949bfe51875d733f93ac2075168039ccc733d7")

    XCTAssertEqual(try decrypt(key: key, cipherText: cipherText, tag: tag), Data(plaintext.utf8))
  }

  func testRfc7518A256CbcHs512FixtureDecrypts() throws {
    let key = Data((0 ... 63).map(UInt8.init))
    let cipherText = Data(hex: """
    4affaaadb78c31c5da4b1b590d10ffbd3dd8d5d302423526912da037ecbcc7bd822c301dd67c373bccb584ad3e9279c2e6d12a1374b77f077553df829410446b36ebd97066296ae6427ea75c2e0846a11a09ccf5370dc80bfecbad28c73f09b3a3b75e662a2594410ae496b2e2e6609e31e6e02cc837f053d21f37ff4f51950bbe2638d09dd7a4930930806d0703b1f6
    """)
    let tag = Data(hex: "4dd3b4c088a7f45c216839645b2012bf2e6269a8c56a816dbc1b267761955bc5")

    XCTAssertEqual(try decrypt(key: key, cipherText: cipherText, tag: tag), Data(plaintext.utf8))
  }

  private func decrypt(key: Data, cipherText: Data, tag: Data) throws -> Data? {
    try AESCBC.decryptAuthenticated(secretKey: key, iv: iv, e: cipherText, aad: aad, authTag: tag)
  }
}

private extension Data {
  init(hex: String) {
    let bytes = hex.filter { !$0.isWhitespace }
    self.init((0 ..< bytes.count).filter { $0.isMultiple(of: 2) }.map { index in
      UInt8(
        bytes[bytes.index(bytes.startIndex, offsetBy: index) ... bytes.index(bytes.startIndex, offsetBy: index + 1)],
        radix: 16
      )!
    })
  }
}
