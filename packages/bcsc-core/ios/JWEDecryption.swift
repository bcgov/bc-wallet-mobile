import Foundation

enum JWEDecryption {
  static func isRetryableJOSEFailure(_ message: String) -> Bool {
    // A failed RSA1_5 unwrap follows the legacy randomized-CEK path and surfaces as this key-length error.
    return message == "Decryption failed" ||
      message.hasPrefix("Unsupported AES/CBC/PKCS5Padding/HMAC-SHA2 key length")
  }

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
