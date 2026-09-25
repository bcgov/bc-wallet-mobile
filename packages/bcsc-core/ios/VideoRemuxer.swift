import AVFoundation
import Foundation

/// Copies a recorded video into a real MP4 container without re-encoding (passthrough export).
enum VideoRemuxer {
  enum RemuxError: Error {
    case unsupported
    case exportFailed(Error?)
    case audioLost
  }

  /// Exports `inputURL` to a new MP4 in the temporary directory, retrying once if the audio doesn't survive.
  /// The result always has an audio track; otherwise it fails with `.audioLost`.
  static func remuxToMp4(_ inputURL: URL, completion: @escaping (Result<URL, RemuxError>) -> Void) {
    export(inputURL) { first in
      switch first {
      case let .failure(error):
        completion(.failure(error))
      case let .success(outputURL) where hasAudioTrack(outputURL):
        completion(.success(outputURL))
      case let .success(outputURL):
        try? FileManager.default.removeItem(at: outputURL)
        // vision-camera#4196: on iOS 26 the recorder can write an MPEG-4-style audio entry into a
        // QuickTime-branded file, which AVFoundation can't read. Labelled as MP4, the audio reads fine.
        guard relabelQuickTimeAsMp4(inputURL) else {
          completion(.failure(.audioLost))
          return
        }
        export(inputURL) { second in
          if case let .success(retryURL) = second, !hasAudioTrack(retryURL) {
            try? FileManager.default.removeItem(at: retryURL)
            completion(.failure(.audioLost))
          } else {
            completion(second)
          }
        }
      }
    }
  }

  private static func export(_ inputURL: URL, completion: @escaping (Result<URL, RemuxError>) -> Void) {
    let asset = AVURLAsset(url: inputURL)
    guard let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough),
          session.supportedFileTypes.contains(.mp4)
    else {
      completion(.failure(.unsupported))
      return
    }

    let outputURL = FileManager.default.temporaryDirectory.appendingPathComponent("\(UUID().uuidString).mp4")
    session.outputURL = outputURL
    session.outputFileType = .mp4
    // Puts the index at the start of the file so the reviewer's player can start streaming straight away
    session.shouldOptimizeForNetworkUse = true

    session.exportAsynchronously {
      if session.status == .completed {
        completion(.success(outputURL))
      } else {
        completion(.failure(.exportFailed(session.error)))
      }
    }
  }

  private static func hasAudioTrack(_ url: URL) -> Bool {
    !AVURLAsset(url: url).tracks(withMediaType: .audio).isEmpty
  }

  /// Rewrites a QuickTime `ftyp` (`qt  `) to `isom` and the following `wide` atom to `free`, in place.
  /// Only header labels change, so the file size and media data are untouched.
  /// Returns false if the file isn't QuickTime-branded or can't be updated.
  private static func relabelQuickTimeAsMp4(_ url: URL) -> Bool {
    guard let handle = try? FileHandle(forUpdating: url) else {
      return false
    }
    defer { try? handle.close() }

    guard let header = try? handle.read(upToCount: 64), header.count >= 16 else {
      return false
    }
    var bytes = [UInt8](header)
    let quickTime = Array("qt  ".utf8)
    let ftypSize = Int(bytes[0]) << 24 | Int(bytes[1]) << 16 | Int(bytes[2]) << 8 | Int(bytes[3])
    guard Array(bytes[4 ..< 8]) == Array("ftyp".utf8), Array(bytes[8 ..< 12]) == quickTime,
          ftypSize >= 16, ftypSize + 8 <= bytes.count
    else {
      return false
    }

    // Major brand, then compatible brands; bytes 12-15 are the minor version
    for offset in stride(from: 8, to: ftypSize, by: 4) where offset != 12 {
      if Array(bytes[offset ..< offset + 4]) == quickTime {
        bytes.replaceSubrange(offset ..< offset + 4, with: Array("isom".utf8))
      }
    }
    if Array(bytes[ftypSize + 4 ..< ftypSize + 8]) == Array("wide".utf8) {
      bytes.replaceSubrange(ftypSize + 4 ..< ftypSize + 8, with: Array("free".utf8))
    }

    do {
      try handle.seek(toOffset: 0)
      try handle.write(contentsOf: Data(bytes))
      return true
    } catch {
      return false
    }
  }
}
