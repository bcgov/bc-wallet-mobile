import Foundation

enum JWEDecryption {
  static func decrypt<T>(
    with candidates: [PrivateKeyInfo],
    attempt: (PrivateKeyInfo) throws -> T,
    shouldRetry: (Error) -> Bool
  ) throws -> T {
    var lastError: Error?
    for candidate in candidates {
      do {
        return try attempt(candidate)
      } catch {
        guard shouldRetry(error) else {
          throw error
        }
        lastError = error
      }
    }
    throw lastError ?? KeychainError.keyNotExists
  }
}
