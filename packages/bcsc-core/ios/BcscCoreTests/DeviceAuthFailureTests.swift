@testable import BcscCoreTestable
import LocalAuthentication
import XCTest

final class DeviceAuthFailureTests: XCTestCase {
  private func assertFailure(
    _ result: [String: Any],
    reason: String,
    code: Int?,
    message: String?,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    XCTAssertEqual(result["success"] as? Bool, false, file: file, line: line)
    XCTAssertEqual(result["failureReason"] as? String, reason, file: file, line: line)
    XCTAssertEqual(result["errorCode"] as? Int, code, file: file, line: line)
    XCTAssertEqual(result["errorMessage"] as? String, message, file: file, line: line)
    XCTAssertNil(result["walletKey"], file: file, line: line)
  }

  func testUserCancelIsCancelled() {
    let error = LAError(.userCancel)
    assertFailure(
      DeviceAuthFailure.unlockResult(for: error),
      reason: "cancelled", code: -2, message: error.localizedDescription
    )
  }

  func testSystemCancelIsError() {
    let error = LAError(.systemCancel)
    assertFailure(
      DeviceAuthFailure.unlockResult(for: error),
      reason: "error", code: -4, message: error.localizedDescription
    )
  }

  func testBiometryLockoutIsError() {
    let error = LAError(.biometryLockout)
    assertFailure(
      DeviceAuthFailure.unlockResult(for: error),
      reason: "error", code: -8, message: error.localizedDescription
    )
  }

  func testNonLocalAuthenticationDomainWithUserCancelCodeIsError() {
    let error = NSError(
      domain: "com.example.other", code: -2,
      userInfo: [NSLocalizedDescriptionKey: "Other failure"]
    )
    assertFailure(
      DeviceAuthFailure.unlockResult(for: error),
      reason: "error", code: -2, message: "Other failure"
    )
  }

  func testGenericNSErrorIsErrorWithItsOwnCode() {
    let error = NSError(
      domain: NSCocoaErrorDomain, code: 42,
      userInfo: [NSLocalizedDescriptionKey: "Something broke"]
    )
    assertFailure(
      DeviceAuthFailure.unlockResult(for: error),
      reason: "error", code: 42, message: "Something broke"
    )
  }

  func testNilErrorIsErrorWithoutCode() {
    assertFailure(DeviceAuthFailure.unlockResult(for: nil), reason: "error", code: nil, message: nil)
  }
}
