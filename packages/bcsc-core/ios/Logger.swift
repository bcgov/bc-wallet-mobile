import Foundation
import os

struct AppLogger {
    private let subsystem: String
    private let category: String

    @available(iOS 14.0, *)
    private var osLogger: os.Logger {
        os.Logger(subsystem: subsystem, category: category)
    }

    private var legacyLogger: OSLog {
        OSLog(subsystem: subsystem, category: category)
    }

    init(subsystem: String, category: String) {
        self.subsystem = subsystem
        self.category = category
    }

    func log(_ message: String) {
        if #available(iOS 14.0, *) {
            osLogger.log("\(message, privacy: .public)")
        } else {
            os_log("%{public}s", log: legacyLogger, type: .default, message)
        }
    }

    func info(_ message: String) {
        if #available(iOS 14.0, *) {
            osLogger.info("\(message, privacy: .public)")
        } else {
            os_log("%{public}s", log: legacyLogger, type: .info, message)
        }
    }

    func debug(_ message: String) {
        if #available(iOS 14.0, *) {
            osLogger.debug("\(message, privacy: .public)")
        } else {
            os_log("%{public}s", log: legacyLogger, type: .debug, message)
        }
    }

    func error(_ message: String) {
        if #available(iOS 14.0, *) {
            osLogger.error("\(message, privacy: .public)")
        } else {
            os_log("%{public}s", log: legacyLogger, type: .error, message)
        }
    }
    
    func warning(_ message: String) {
        if #available(iOS 14.0, *) {
            osLogger.warning("\(message, privacy: .public)")
        } else {
            os_log("%{public}s", log: legacyLogger, type: .error, message) // .warning is not available, fallback to .error
        }
    }
    
    func fault(_ message: String) {
        if #available(iOS 14.0, *) {
            osLogger.fault("\(message, privacy: .public)")
        } else {
            os_log("%{public}s", log: legacyLogger, type: .fault, message)
        }
    }
}
