// Minimal stubs for types defined in JWE.swift / JWECrypto.swift that are
// needed by PINService.swift but excluded from the lightweight SPM test target.
// Guarded so the CocoaPods build (which includes all ios/*.swift) never sees dupes.

#if SPM_BUILD
import Foundation
import Security

extension Data {
  func arrayOfBytes() -> [UInt8] {
    return [UInt8](self)
  }
}

class SecureRandom {
  class func nextBytes(count: Int) -> [UInt8] {
    var bytes = [UInt8](repeating: 0, count: count)
    _ = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
    return bytes
  }
}
#endif
