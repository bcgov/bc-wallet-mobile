import Foundation

enum JWEDecryption {
  /// Tries each candidate in order and returns the first success. Any per-key failure moves on to
  /// the next candidate: a wrong key, a key the keychain won't hand back, whatever else. The one
  /// exception is a locked keychain, where no key is readable and retrying cannot help.
  ///
  /// - Throws: the locked-keychain error, or the last candidate's failure once all are exhausted.
  static func decrypt<T>(
    with candidates: [PrivateKeyInfo],
    attempt: (PrivateKeyInfo) throws -> T
  ) throws -> T {
    var lastError: Error?
    for candidate in candidates {
      do {
        return try attempt(candidate)
      } catch let KeychainError.keychainUnavailable(status) {
        throw KeychainError.keychainUnavailable(status)
      } catch {
        lastError = error
      }
    }
    throw lastError ?? KeychainError.keyNotExists
  }
}
