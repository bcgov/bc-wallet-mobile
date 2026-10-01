@testable import BcscCoreTestable
import LocalAuthentication
import XCTest

final class LAContextErrorTests: XCTestCase {
  // MARK: - isUserCancellation

  func testUserCancelIsCancellation() {
    XCTAssertTrue(LAContext.isUserCancellation(LAError(.userCancel)))
  }

  func testUserFallbackIsCancellation() {
    XCTAssertTrue(LAContext.isUserCancellation(LAError(.userFallback)))
  }

  func testSystemCancelIsNotCancellation() {
    // Must surface to the user: previously collapsed into { success: false } and left them stuck
    XCTAssertFalse(LAContext.isUserCancellation(LAError(.systemCancel)))
  }

  func testLockoutAndNotInteractiveAreNotCancellation() {
    XCTAssertFalse(LAContext.isUserCancellation(LAError(.biometryLockout)))
    XCTAssertFalse(LAContext.isUserCancellation(LAError(.notInteractive)))
    XCTAssertFalse(LAContext.isUserCancellation(LAError(.appCancel)))
  }

  func testNonLAErrorIsNotCancellation() {
    XCTAssertFalse(LAContext.isUserCancellation(NSError(domain: "other", code: -2)))
    XCTAssertFalse(LAContext.isUserCancellation(nil))
  }

  // MARK: - describeAuthError

  func testDescribeLAErrorIncludesNameAndCode() {
    let description = LAContext.describeAuthError(LAError(.systemCancel))

    XCTAssertTrue(description.hasPrefix("LAError.systemCancel (-4)"), description)
  }

  func testDescribeLockout() {
    let description = LAContext.describeAuthError(LAError(.biometryLockout))

    XCTAssertTrue(description.hasPrefix("LAError.biometryLockout (-8)"), description)
  }

  func testDescribeNonLAErrorKeepsDomainAndCode() {
    let error = NSError(domain: "com.example", code: 42, userInfo: [NSLocalizedDescriptionKey: "boom"])

    XCTAssertEqual(LAContext.describeAuthError(error), "com.example (42): boom")
  }

  func testDescribeNil() {
    XCTAssertEqual(LAContext.describeAuthError(nil), "unknown error")
  }
}
