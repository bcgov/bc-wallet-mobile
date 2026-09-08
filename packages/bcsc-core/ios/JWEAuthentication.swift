import Foundation

enum JWEAuthentication {
  static func tagsMatch(expected: Data, received: Data) -> Bool {
    guard expected.count == received.count else {
      return false
    }

    var difference = UInt8(0)
    for (expectedByte, receivedByte) in zip(expected, received) {
      difference |= expectedByte ^ receivedByte
    }
    return difference == 0
  }
}
