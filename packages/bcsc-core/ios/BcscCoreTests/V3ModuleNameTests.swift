@testable import BcscCoreTestable
import XCTest

/// Module names of v3's per-environment targets, written out here on purpose rather than read from
/// `v3ModuleNames`, so deleting a name from production code fails these tests.
let expectedV3ModuleNames = [
  "bc_services_card",
  "bc_services_card_dev",
  "bc_services_card_qa",
  "bc_services_card_test",
  "bc_services_card_localDev",
]

/// Class names stored in a keyed archive, read from the plist's `$classes` entries. Lets a test
/// prove its fixture really carries a given v3 module prefix instead of decoding by accident.
func archivedClassNames(in data: Data) throws -> Set<String> {
  let plist = try PropertyListSerialization.propertyList(from: data, options: [], format: nil)
  let objects = try XCTUnwrap((plist as? [String: Any])?["$objects"] as? [Any])
  return Set(objects.compactMap { ($0 as? [String: Any])?["$classname"] as? String })
}

/// Process-wide `NSKeyedUnarchiver` mappings persist across tests, so the probe is a class nothing
/// else registers and the only way its v3 names get registered is through production code.
@objc(BCSCTestV3NameProbe)
private final class V3NameProbe: NSObject {}

final class V3ModuleNameTests: XCTestCase {
  func testRegistersEveryV3ModuleName() {
    registerV3ClassNames(for: V3NameProbe.self)

    for module in expectedV3ModuleNames {
      let mapped = NSKeyedUnarchiver.class(forClassName: "\(module).V3NameProbe")
      XCTAssertTrue(mapped === V3NameProbe.self, "\(module) is not mapped to the v4 class")
    }
  }
}
