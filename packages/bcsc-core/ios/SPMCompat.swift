// Minimal stubs for helpers defined in JWE.swift / JWECrypto.swift / String.swift that
// PINService.swift and the JOSE files need but the lightweight SPM test target excludes.
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

  extension String {
    func trim() -> String {
      return self.trimmingCharacters(in: .whitespacesAndNewlines)
    }
  }
#endif
