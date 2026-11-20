//
//  StorageService.swift
//  bc-services-card
//

import Foundation
import Security

let defaultSearchPathDirectory = FileManager.SearchPathDirectory.applicationSupportDirectory
let testSearchPathDirectory = FileManager.SearchPathDirectory.cachesDirectory

// URL components for files
let accountListURLComponent = "account_list"
let metadataURLComponent = "metadata"
let issuerURLComponent = "issuer"

/// Swift module names of the v3 app's per-environment targets (target name, `-` -> `_`).
/// v3 model classes have no `@objc` name, so v3 archives store `<module>.<Class>`.
let v3ModuleNames = [
  "bc_services_card",
  "bc_services_card_dev",
  "bc_services_card_qa",
  "bc_services_card_test",
  "bc_services_card_localDev",
]

/// Maps every v3 module-qualified name of `cls` to `cls`. Process-wide and idempotent.
func registerV3ClassNames(for cls: AnyClass) {
  let className = String(describing: cls)
  for module in v3ModuleNames {
    NSKeyedUnarchiver.setClass(cls, forClassName: "\(module).\(className)")
  }
}

// Available files in the `basePath` directory:
// account_list

enum AccountFiles: String {
  case provider
  case accountFlag = "account_flag"
  case accountMetadata = "account_metadata"
  case authorizationRequest = "authorization_request"
  case clientMetadata = "client_metadata"
  case clientRegistration = "client_registration"
  case deviceInfo = "device_info"
  case documents
}

/// The reasons reading a stored account file can fail. `readData` throws these away and returns nil;
/// `getAccountReadStatus` reports them, so we can see why `getAccount` found no account.
enum AccountReadFailure: Error {
  case storageRootUnavailable(Error)
  case accountListMissing
  case accountListUnreadable(Error)
  case accountListEmpty
  case fileMissing
  case fileUnreadable(Error)
  /// The unarchiver threw: corrupt archive or unknown class name.
  case decodeFailed(Error)
  /// The archive decoded but held no object for the current `provider` (e.g. archived under another issuer).
  case noObjectForProvider

  /// The code `getAccountReadStatus` reports when reading `.accountMetadata` fails this way.
  var accountStatusCode: String {
    switch self {
    case .storageRootUnavailable: return "storage_root_unavailable"
    case .accountListMissing: return "account_list_missing"
    case .accountListUnreadable: return "account_list_unreadable"
    case .accountListEmpty: return "account_list_empty"
    case .fileMissing: return "account_file_missing"
    case .fileUnreadable: return "account_file_unreadable"
    case .decodeFailed: return "account_decode_failed"
    case .noObjectForProvider: return "account_provider_mismatch"
    }
  }

  /// `domain:code` of the underlying system error, if any. Never a message, path or ID.
  var detail: String? {
    switch self {
    case let .storageRootUnavailable(error), let .accountListUnreadable(error),
         let .fileUnreadable(error), let .decodeFailed(error):
      let nsError = error as NSError
      return "\(nsError.domain):\(nsError.code)"
    case .accountListMissing, .accountListEmpty, .fileMissing, .noObjectForProvider:
      return nil
    }
  }
}

class StorageService {
  let logger = AppLogger(
    subsystem: Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard",
    category: "StorageService"
  )
  var currentBundleID: String {
    return Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard"
  }

  var productionIssuer: String {
    return "https://id.gov.bc.ca"
  }

  /// Maps environment directory names (as produced by getIssuerNameFromIssuer) to issuer URLs.
  /// Priority order matters: prod is checked first, then non-prod environments.
  private let issuerDirectoryToURL: [(name: String, url: String)] = [
    ("PROD", "https://id.gov.bc.ca"),
    ("SIT", "https://idsit.gov.bc.ca"),
    ("QA", "https://idqa.gov.bc.ca"),
    ("DEV", "https://iddev.gov.bc.ca"),
    ("DEV2", "https://iddev2.gov.bc.ca"),
    ("PREPROD", "https://idpreprod.gov.bc.ca"),
    ("TEST", "https://idtest.gov.bc.ca"),
  ]

  /// Returns the module name for NSKeyedArchiver class mapping
  /// This must match the module name used by the native ias-ios app
  var nativeModuleName: String {
    switch currentBundleID {
    case "ca.bc.gov.id.servicescard":
      return "bc_services_card"
    case "ca.bc.gov.iddev.servicescard":
      return "bc_services_card_dev"
    default:
      return "bc_services_card_dev"
    }
  }

  /// NOTE: While the system reads an 'accounts' array from the account_list file,
  /// and could theoretically support multiple accounts, the current implementation
  /// only uses the *first* account ID found. For current practical purposes,
  /// there should only be one account ID present in the 'accounts' array.
  var currentAccountID: String? {
    try? resolveCurrentAccountID()
  }

  /// `currentAccountID`, but throws an `AccountReadFailure` saying why there is none.
  func resolveCurrentAccountID() throws -> String {
    let rootDirectoryURL: URL
    do {
      rootDirectoryURL = try FileManager.default.url(
        for: defaultSearchPathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
    } catch {
      logger.error("Could not access or read account_list: \(error).")
      throw AccountReadFailure.storageRootUnavailable(error)
    }

    let accountListFileUrl =
      rootDirectoryURL
        .appendingPathComponent(self.basePath)
        .appendingPathComponent(accountListURLComponent)

    guard FileManager.default.fileExists(atPath: accountListFileUrl.path) else {
      throw AccountReadFailure.accountListMissing
    }

    let json: Any
    do {
      let data = try Data(contentsOf: accountListFileUrl)
      json = try JSONSerialization.jsonObject(with: data, options: [])
    } catch {
      logger.error("Could not access or read account_list: \(error).")
      throw AccountReadFailure.accountListUnreadable(error)
    }

    guard let dict = json as? [String: Any],
          let accounts = dict["accounts"] as? [String],
          let firstAccountID = accounts.first, !firstAccountID.isEmpty
    else {
      logger.error(
        "Failed to parse account_list JSON or accounts array is empty/first ID is empty."
      )
      throw AccountReadFailure.accountListEmpty
    }

    return firstAccountID
  }

  var issuer: String {
    let pathDirectory = defaultSearchPathDirectory

    do {
      let rootDirectoryURL = try FileManager.default.url(
        for: pathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )

      let issuerFileURL =
        rootDirectoryURL
          .appendingPathComponent("\(currentBundleID)/data")
          .appendingPathComponent(issuerURLComponent)

      return try String(contentsOf: issuerFileURL, encoding: .utf8)
        .trimmingCharacters(in: .whitespacesAndNewlines)
    } catch {
      logger.error("currentIssuer: Could not read issuer file: \(error).")
      // Fallback: infer issuer from directory structure (v3 migration path)
      if let inferred = findIssuerFromAccountDirectories() {
        logger
          .log(
            "currentIssuer: Inferred issuer from account directories: \(inferred) (env: \(getIssuerNameFromIssuer(issuer: inferred)))"
          )
        return inferred
      }
      logger.log("currentIssuer: Defaulting to production issuer")
      return productionIssuer
    }
  }

  var basePath: String {
    return "\(currentBundleID)/data/accounts_dir/\(getIssuerNameFromIssuer(issuer: issuer))"
  }

  var provider: String {
    "\(issuer)/device/"
  }

  func readData<T: NSObject & NSCoding & NSSecureCoding>(
    file: AccountFiles,
    pathDirectory: FileManager.SearchPathDirectory
  ) -> T? {
    try? readDataOrThrow(file: file, pathDirectory: pathDirectory)
  }

  /// Does the actual read and throws an `AccountReadFailure` instead of returning nil. `readData` wraps
  /// this, so the status report always matches what the app really sees.
  func readDataOrThrow<T: NSObject & NSCoding & NSSecureCoding>(
    file: AccountFiles,
    pathDirectory: FileManager.SearchPathDirectory
  ) throws -> T {
    let accountID: String
    do {
      accountID = try resolveCurrentAccountID()
    } catch {
      logger.error("readData: currentAccountID is nil. Cannot read data for file: \(file.rawValue)")
      throw error
    }

    let rootDirectoryURL: URL
    do {
      rootDirectoryURL = try FileManager.default.url(
        for: pathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
    } catch {
      throw AccountReadFailure.storageRootUnavailable(error)
    }

    let fileUrl =
      rootDirectoryURL
        .appendingPathComponent(self.basePath)
        .appendingPathComponent(accountID)
        .appendingPathComponent(file.rawValue)

    guard FileManager.default.fileExists(atPath: fileUrl.path) else {
      throw AccountReadFailure.fileMissing
    }

    let accessGranted = fileUrl.startAccessingSecurityScopedResource()

    defer {
      if accessGranted {
        fileUrl.stopAccessingSecurityScopedResource()
      }
    }

    let data: Data
    do {
      data = try Data(contentsOf: fileUrl)
    } catch {
      throw AccountReadFailure.fileUnreadable(error)
    }
    logger.log("Data read from file: \(data)")

    let decoded: T?
    do {
      decoded = try decodeArchivedObject(from: data)
    } catch {
      logger.error("Failed to decode object from data.")
      throw AccountReadFailure.decodeFailed(error)
    }

    guard let obj = decoded else {
      logger.error("Failed to decode object from data.")
      throw AccountReadFailure.noObjectForProvider
    }

    logger.log("Decoded object: \(obj)")

    if let account = obj as? Account, account.clientIDMissingFromArchive,
       account.clientID.isEmpty,
       let recovered = readClientRegistrationClientID(pathDirectory: pathDirectory),
       !recovered.isEmpty
    {
      logger.log("readData: repaired empty Account.clientID from client_registration")
      account.clientID = recovered
    }

    return obj
  }

  /// Explains why `readData(file: .accountMetadata, ...)` (and so `getAccount`) returns nil, by running that
  /// same read. Returns a status code, the environment name and error `domain:code`; never paths, IDs or
  /// file contents.
  func accountReadStatus() -> [String: String] {
    var result: [String: String] = ["environment": getIssuerNameFromIssuer(issuer: issuer)]

    do {
      let _: Account = try readDataOrThrow(file: .accountMetadata, pathDirectory: defaultSearchPathDirectory)
      result["status"] = "ok"
    } catch let failure as AccountReadFailure {
      result["status"] = failure.accountStatusCode
      if let detail = failure.detail {
        result["detail"] = detail
      }
    } catch {
      // readDataOrThrow only throws AccountReadFailure; kept so a future change can't crash the report.
      result["status"] = "unknown"
    }

    return result
  }

  /// Reads `clientID` straight out of the client_registration file. Used as a fallback if the account itself
  /// doesn't have a clientID.
  ///
  /// v3's ClientRegistrationSource keyed this file by `provider.issuer` and accumulated one entry
  /// per environment
  private func readClientRegistrationClientID(
    pathDirectory: FileManager.SearchPathDirectory
  ) -> String? {
    do {
      guard let accountID = self.currentAccountID else { return nil }

      let fileUrl = try FileManager.default.url(
        for: pathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      .appendingPathComponent(self.basePath)
      .appendingPathComponent(accountID)
      .appendingPathComponent(AccountFiles.clientRegistration.rawValue)

      guard FileManager.default.fileExists(atPath: fileUrl.path) else { return nil }

      registerV3ClassNames(for: ClientRegistration.self)
      registerV3ClassNames(for: Credential.self)

      let data = try Data(contentsOf: fileUrl)
      let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
      unarchiver.requiresSecureCoding = false

      let rootObject = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)

      guard let registrations = rootObject as? [String: ClientRegistration] else { return nil }

      // they somehow have a client_registration for a different environment
      guard let registration = registrations[provider] else {
        if !registrations.isEmpty {
          logger.error(
            "readClientRegistrationClientID: no entry for '\(provider)' among \(registrations.keys); not repairing"
          )
        }
        return nil
      }

      return registration.clientID
    } catch {
      logger.error("readClientRegistrationClientID: \(error.localizedDescription)")
      return nil
    }
  }

  func writeData<T: NSObject & NSCoding & NSSecureCoding>(
    data: T,
    file: AccountFiles,
    pathDirectory: FileManager.SearchPathDirectory
  ) -> Bool {
    do {
      // Get the current account ID first
      guard let accountID = self.currentAccountID else {
        logger.error("writeData: currentAccountID is nil. Cannot write data for file: \(file.rawValue)")
        return false
      }

      // Build the file URL
      let rootDirectoryURL = try FileManager.default.url(
        for: pathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      let directoryUrl = rootDirectoryURL
        .appendingPathComponent(self.basePath)
        .appendingPathComponent(accountID)
      let fileUrl = directoryUrl.appendingPathComponent(file.rawValue)

      // Ensure the directory hierarchy exists before writing
      if !FileManager.default.fileExists(atPath: directoryUrl.path) {
        try FileManager.default.createDirectory(
          at: directoryUrl,
          withIntermediateDirectories: true,
          attributes: nil
        )
        logger.log("StorageService: Created directory at \(directoryUrl.path)")
      }

      // Encode the object to data
      let encodedData = try encodeArchivedObject(object: data)

      // Write the encoded data to file with atomic and protection options
      try encodedData.write(
        to: fileUrl,
        options: [.atomic]
      )
      logger
        .log(
          "Successfully wrote data to file: \(fileUrl.path) (fileExists: \(FileManager.default.fileExists(atPath: fileUrl.path)))"
        )
      return true
    } catch {
      logger.error("writeData: Error writing data for file \(file.rawValue): \(error)")
      return false
    }
  }

  func removeAccountFiles(accountID: String) -> Bool {
    let pathDirectory = defaultSearchPathDirectory

    do {
      let rootDirectoryURL = try FileManager.default.url(
        for: pathDirectory, in: .userDomainMask, appropriateFor: nil, create: false
      )
      let accountDirectoryUrl = rootDirectoryURL.appendingPathComponent(self.basePath)
        .appendingPathComponent(accountID)

      let fileManager = FileManager.default

      if fileManager.fileExists(atPath: accountDirectoryUrl.path) {
        try fileManager.removeItem(atPath: accountDirectoryUrl.path)
        logger.log(
          "StorageService: Successfully removed account files for account: \(accountID)"
        )
      } else {
        logger.log("StorageService: Account files for account: \(accountID) not found")
      }

      return true
    } catch {
      logger.log("StorageService: Error removing account files: \(error)")
      return false
    }
  }

  func saveIssuerToFile(issuer: String) -> Bool {
    let pathDirectory = defaultSearchPathDirectory

    do {
      let rootDirectoryURL = try FileManager.default.url(
        for: pathDirectory, in: .userDomainMask, appropriateFor: nil, create: false
      )
      let issuerDirectoryURL = rootDirectoryURL.appendingPathComponent("\(currentBundleID)/data")
      let issuerFileURL = issuerDirectoryURL.appendingPathComponent(issuerURLComponent)

      // Ensure the directory exists before writing issuer file
      if !FileManager.default.fileExists(atPath: issuerDirectoryURL.path) {
        try FileManager.default.createDirectory(
          at: issuerDirectoryURL,
          withIntermediateDirectories: true,
          attributes: nil
        )
        logger.log("StorageService: Created issuer directory at \(issuerDirectoryURL.path)")
      }

      // Write issuer file with atomic option
      try issuer.write(to: issuerFileURL, atomically: true, encoding: .utf8)
      logger.log(
        "StorageService: Successfully saved issuer: \(issuer) to file at \(issuerFileURL.path) (fileExists: \(FileManager.default.fileExists(atPath: issuerFileURL.path)))"
      )
      return true
    } catch {
      logger.log("StorageService: Error saving issuer to file: \(error)")
      return false
    }
  }

  // MARK: - Helper Methods

  func updateAccountListEntry(accountID: String) throws {
    let rootDirectoryURL = try FileManager.default.url(
      for: defaultSearchPathDirectory, in: .userDomainMask, appropriateFor: nil, create: false
    )
    let baseURL = rootDirectoryURL.appendingPathComponent(self.basePath)
    let accountListPath = baseURL.appendingPathComponent(accountListURLComponent)

    // Create the account list structure with provided accountID
    let accountListData: [String: Any] = [
      "accounts": [accountID],
      "current": accountID,
    ]

    // Ensure base directory exists
    if !FileManager.default.fileExists(atPath: baseURL.path) {
      try FileManager.default.createDirectory(
        at: baseURL, withIntermediateDirectories: true, attributes: nil
      )
      logger.log("StorageService: Created base directory at \(baseURL.path)")
    }

    // Create directory with accountID as name if it doesn't exist
    let accountDirectory = baseURL.appendingPathComponent(accountID)
    if !FileManager.default.fileExists(atPath: accountDirectory.path) {
      try FileManager.default.createDirectory(
        at: accountDirectory, withIntermediateDirectories: true, attributes: nil
      )
      logger.log("StorageService: Created account directory at \(accountDirectory.path)")
    } else {
      logger.log("StorageService: Account directory already exists at \(accountDirectory.path)")
    }

    // Convert to JSON data and write to file with atomic option
    let jsonData = try JSONSerialization.data(withJSONObject: accountListData, options: [])
    try jsonData.write(to: accountListPath, options: [.atomic])
    logger
      .log(
        "StorageService: Successfully wrote account_list to \(accountListPath.path) (fileExists: \(FileManager.default.fileExists(atPath: accountListPath.path)))"
      )
  }

  private func encodeArchivedObject<T: NSObject & NSSecureCoding>(
    object: T
  ) throws -> Data {
    let className = String(describing: T.self)

    // Skip class registration for Foundation collection types (NSDictionary, NSArray)
    // Modifying the global class name for these types can corrupt other frameworks
    let isFoundationCollectionType = T.self == NSDictionary.self || T.self == NSArray.self
    if !isFoundationCollectionType {
      let archivedClassName = "\(nativeModuleName).\(className)"
      NSKeyedArchiver.setClassName(archivedClassName, for: T.self)
      logger.log("Encoding class: \(archivedClassName)")
    } else {
      logger.log("Skipping class registration for Foundation collection type: \(className)")
    }

    let archiver = NSKeyedArchiver(requiringSecureCoding: false)

    // Prepare the object for archiving
    let objectToArchive: Any
    if !isFoundationCollectionType {
      // Wrap custom objects in a dictionary with provider key (reverse of decode logic)
      // Foundation collection types (NSArray, NSDictionary) don't need wrapping
      objectToArchive = [provider: object]
    } else {
      objectToArchive = object
    }

    archiver.encode(objectToArchive, forKey: NSKeyedArchiveRootObjectKey)
    archiver.finishEncoding()

    return archiver.encodedData
  }

  private func decodeArchivedObject<T: NSObject & NSSecureCoding>(
    from data: Data
  ) throws -> T? {
    let className = String(describing: T.self)

    // Skip class registration for Foundation collection types (NSDictionary, NSArray)
    // Modifying the global class name for these types can corrupt other frameworks
    let isFoundationCollectionType = T.self == NSDictionary.self || T.self == NSArray.self
    if !isFoundationCollectionType {
      registerV3ClassNames(for: T.self)
      logger.log("Decoding class - registered v3 mappings for \(className)")
    } else {
      logger.log("Skipping class registration for Foundation collection type: \(className)")
    }

    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = false

    let decoded = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)

    // For custom types, unwrap from provider dictionary.
    // For Foundation collection types, return directly — but first unwrap v3's
    // "storable_source_default_id" wrapper if present (used by AccountFlagSource in v3).
    if !isFoundationCollectionType {
      if let decodedDict = decoded as? [String: T] {
        return decodedDict[provider]
      }
      return nil
    } else {
      guard let result = decoded as? T else { return nil }

      // V3 compatibility: AccountFlagSource archived data as
      // {"storable_source_default_id": {actualFlags}} — unwrap the inner dict if present.
      if T.self == NSDictionary.self,
         let wrapper = result as? NSDictionary,
         let inner = wrapper["storable_source_default_id"] as? NSDictionary
      {
        logger.log("decodeArchivedObject: Unwrapping v3 'storable_source_default_id' wrapper")
        return inner as? T
      }

      return result
    }
  }

  /// Scans the accounts_dir for known environment subdirectories containing UUID-format account
  /// directories. Returns the issuer URL for the first match in priority order.
  /// Used as a fallback when the issuer file is missing (e.g. V3 migrated users).
  private func findIssuerFromAccountDirectories() -> String? {
    guard let rootURL = try? FileManager.default.url(
      for: defaultSearchPathDirectory, in: .userDomainMask, appropriateFor: nil, create: false
    ) else { return nil }

    let accountsDirURL = rootURL
      .appendingPathComponent("\(currentBundleID)/data/accounts_dir")

    logger.log("findIssuerFromAccountDirectories: scanning \(accountsDirURL.path)")

    guard let uuidRegex = try? NSRegularExpression(
      pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
      options: .caseInsensitive
    ) else { return nil }

    for entry in issuerDirectoryToURL {
      let envDirURL = accountsDirURL.appendingPathComponent(entry.name)
      guard let contents = try? FileManager.default.contentsOfDirectory(
        at: envDirURL, includingPropertiesForKeys: [.isDirectoryKey], options: .skipsHiddenFiles
      ) else {
        continue
      }

      let uuidDirs = contents.filter { url in
        guard (try? url.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true
        else { return false }
        let name = url.lastPathComponent
        return uuidRegex.firstMatch(in: name, range: NSRange(name.startIndex..., in: name)) != nil
      }

      if !uuidDirs.isEmpty {
        logger.log(
          "findIssuerFromAccountDirectories: Found \(uuidDirs.count) account(s) in '\(entry.name)', using issuer \(entry.url)"
        )
        return entry.url
      }
    }

    logger.log("findIssuerFromAccountDirectories: No accounts found in any known environment directory")
    return nil
  }

  /// https://id.gov.bc.ca -> "PROD"
  /// https://iddev.gov.bc.ca -> "DEV"
  private func getIssuerNameFromIssuer(issuer: String) -> String {
    guard let host = URLComponents(string: issuer)?.host else {
      return "PROD"
    }

    if host.hasPrefix("id") {
      let remainder = host.dropFirst(2) // remove "id"

      // Production is "id.gov.bc.ca" — remainder starts with "." (no env segment after "id").
      // Non-prod is "id{env}.gov.bc.ca" — remainder starts with the env name.
      if !remainder.hasPrefix("."), let env = remainder.split(separator: ".").first, !env.isEmpty {
        return String(env).uppercased() // "DEV", "SIT", "TEST", etc.
      }
    }

    return "PROD"
  }
}

// MARK: - Legacy record status

/// The records `readLegacyRecord` reports on, named as in the JS contract.
enum LegacyRecordName: String, CaseIterable {
  case account
  case tokens
  case credential
  case authorizationRequest
  case accountFlags
  case evidence
  case savedServices
}

enum LegacyRecordStatus {
  static let ok = "ok"
  static let absent = "absent"
  static let locked = "locked"
  static let unreadable = "unreadable"

  static let unknownRecordReport: [String: Any] = ["status": unreadable, "reason": "unknown_record"]

  /// Empty flags, evidence and saved services are what the getters return when nothing is stored.
  static func isEmptyValue(_ value: Any) -> Bool {
    if let dictionary = value as? [AnyHashable: Any] {
      return dictionary.isEmpty
    }
    if let array = value as? [Any] {
      return array.isEmpty
    }
    return false
  }
}

/// Why a stored record couldn't be read. Getters map it back to what they resolve or reject;
/// `readLegacyRecord` maps it to a status and a reason code.
enum LegacyRecordFailure: Error {
  /// Reading the current account (its ID in account_list, or its metadata) failed.
  case account(AccountReadFailure)
  /// Reading the record's own file failed.
  case storage(AccountReadFailure)
  /// A decoder that doesn't surface its error returned nothing.
  case undecodable
  /// The archive decoded, but its root object wasn't the expected type.
  case unexpectedFormat
  /// A token read got errSecInteractionNotAllowed, even after `get`'s retry.
  case keychainLocked
  /// A token read failed; carries a code like `token_refresh_-25293`.
  case keychainUnreadable(String)

  /// The system error behind the failure, for getters that reject with it.
  var underlyingError: Error? {
    switch self {
    case let .account(failure), let .storage(failure):
      return failure.underlyingError
    case .undecodable, .unexpectedFormat, .keychainLocked, .keychainUnreadable:
      return nil
    }
  }

  func status(isProtectedDataAvailable: Bool) -> String {
    switch self {
    case let .account(failure), let .storage(failure):
      return failure.legacyRecordStatus(isProtectedDataAvailable: isProtectedDataAvailable)
    case .keychainLocked:
      return LegacyRecordStatus.locked
    case .undecodable, .unexpectedFormat, .keychainUnreadable:
      return LegacyRecordStatus.unreadable
    }
  }

  /// A short code, with `domain:code` of the system error when there is one. Never a path, ID or message.
  func reason(for record: LegacyRecordName) -> String {
    switch self {
    case let .account(failure):
      return Self.code(failure.accountStatusCode, detail: failure.detail)
    case let .storage(failure):
      return Self.code(failure.legacyRecordCode(for: record), detail: failure.detail)
    case .undecodable:
      return "\(record.rawValue)_decode_failed"
    case .unexpectedFormat:
      return "\(record.rawValue)_unexpected_format"
    case .keychainLocked:
      return "keychain_locked"
    case let .keychainUnreadable(code):
      return code
    }
  }

  private static func code(_ code: String, detail: String?) -> String {
    guard let detail else { return code }
    return "\(code):\(detail)"
  }
}

extension AccountReadFailure {
  var underlyingError: Error? {
    switch self {
    case let .storageRootUnavailable(error), let .accountListUnreadable(error),
         let .fileUnreadable(error), let .decodeFailed(error):
      return error
    case .accountListMissing, .accountListEmpty, .fileMissing, .noObjectForProvider:
      return nil
    }
  }

  /// A file that exists but can't be opened is locked while protected data is unavailable.
  func legacyRecordStatus(isProtectedDataAvailable: Bool) -> String {
    switch self {
    case .accountListMissing, .accountListEmpty, .fileMissing:
      return LegacyRecordStatus.absent
    case .storageRootUnavailable, .accountListUnreadable, .fileUnreadable:
      return isProtectedDataAvailable ? LegacyRecordStatus.unreadable : LegacyRecordStatus.locked
    case .decodeFailed, .noObjectForProvider:
      return LegacyRecordStatus.unreadable
    }
  }

  /// `accountStatusCode`, with file-level failures named after `record` instead of the account.
  func legacyRecordCode(for record: LegacyRecordName) -> String {
    switch self {
    case .storageRootUnavailable, .accountListMissing, .accountListUnreadable, .accountListEmpty:
      return accountStatusCode
    case .fileMissing:
      return "\(record.rawValue)_file_missing"
    case .fileUnreadable:
      return "\(record.rawValue)_file_unreadable"
    case .decodeFailed:
      return "\(record.rawValue)_decode_failed"
    case .noObjectForProvider:
      return "\(record.rawValue)_unexpected_format"
    }
  }

  /// `readDataOrThrow` and `resolveCurrentAccountID` only throw `AccountReadFailure`; this keeps a future change
  /// from losing the error.
  static func from(_ error: Error) -> AccountReadFailure {
    (error as? AccountReadFailure) ?? .decodeFailed(error)
  }
}

/// One record read. Each getter and `readLegacyRecord` share it, so the status always matches what the getter returns.
enum LegacyRecordRead<Value> {
  case ok(Value)
  case absent
  case failed(LegacyRecordFailure)

  func map<T>(_ transform: (Value) -> T) -> LegacyRecordRead<T> {
    switch self {
    case let .ok(value):
      return .ok(transform(value))
    case .absent:
      return .absent
    case let .failed(failure):
      return .failed(failure)
    }
  }

  /// The dictionary `readLegacyRecord` resolves: `status`, plus `value` when ok or `reason` when unreadable.
  func report(for record: LegacyRecordName, isProtectedDataAvailable: Bool) -> [String: Any] {
    switch self {
    case let .ok(value):
      if LegacyRecordStatus.isEmptyValue(value) {
        return ["status": LegacyRecordStatus.absent]
      }
      return ["status": LegacyRecordStatus.ok, "value": value]
    case .absent:
      return ["status": LegacyRecordStatus.absent]
    case let .failed(failure):
      let status = failure.status(isProtectedDataAvailable: isProtectedDataAvailable)
      guard status == LegacyRecordStatus.unreadable else {
        return ["status": status]
      }
      return ["status": status, "reason": failure.reason(for: record)]
    }
  }
}

/// One keychain token read: the final `OSStatus`, after `get`'s retry, and the token if its data decoded.
struct TokenReadOutcome {
  let token: Token?
  let status: OSStatus

  /// The read succeeded but returned no data that decodes as a `Token`.
  var isUndecodable: Bool {
    token == nil && status == errSecSuccess
  }
}

enum LegacyTokensRecord {
  /// The token types the record holds, with their keys in its value.
  static let types: [(type: TokenType, key: String)] = [
    (.Access, "access"),
    (.Refresh, "refresh"),
    (.Registration, "registration"),
  ]

  /// Any locked read makes the record locked, then any other failure makes it unreadable (the first one is the
  /// reason). It's absent only when every token is missing.
  static func combine(_ outcomes: [(key: String, outcome: TokenReadOutcome)]) -> LegacyRecordRead<[String: String]> {
    var tokens: [String: String] = [:]
    var firstFailure: String?

    for (key, outcome) in outcomes {
      if let token = outcome.token {
        tokens[key] = token.token
        continue
      }

      switch outcome.status {
      case errSecItemNotFound:
        continue
      case errSecInteractionNotAllowed:
        return .failed(.keychainLocked)
      case errSecSuccess:
        firstFailure = firstFailure ?? "token_\(key)_decode_failed"
      default:
        firstFailure = firstFailure ?? "token_\(key)_\(outcome.status)"
      }
    }

    if let firstFailure {
      return .failed(.keychainUnreadable(firstFailure))
    }
    if tokens.isEmpty {
      return .absent
    }
    return .ok(tokens)
  }
}

// MARK: - Legacy record reads

/// The reads behind the record getters. `logger` is the getter's, so its log lines don't change.
extension StorageService {
  func readAccountRecord() -> LegacyRecordRead<Account> {
    do {
      let account: Account = try readDataOrThrow(file: .accountMetadata, pathDirectory: defaultSearchPathDirectory)
      return .ok(account)
    } catch {
      return .failed(.account(AccountReadFailure.from(error)))
    }
  }

  /// account_flag, keeping only string keys.
  func readAccountFlagsRecord(logger: AppLogger) -> LegacyRecordRead<NSDictionary> {
    let flags: NSDictionary
    do {
      flags = try readDataOrThrow(file: .accountFlag, pathDirectory: defaultSearchPathDirectory)
    } catch {
      return .failed(.storage(AccountReadFailure.from(error)))
    }

    let result = NSMutableDictionary()
    for (key, value) in flags {
      if let stringKey = key as? String {
        result[stringKey] = value
      }
    }

    logger.log("getAccountFlags: Successfully read account flags")
    return .ok(result)
  }

  /// The credential in client_registration. A registration without one is absent.
  func readCredentialRecord(logger: AppLogger) -> LegacyRecordRead<Credential> {
    let data: Data
    switch readAccountFileData(.clientRegistration) {
    case let .ok(fileData):
      data = fileData
    case .absent:
      logger.log("getCredential: ClientRegistration file does not exist")
      return .absent
    case let .failed(failure):
      if case .account = failure {
        logger.log("getCredential: No current account ID found")
      }
      return .failed(failure)
    }

    logger.log("getCredential: Read \(data.count) bytes from client_registration file")

    let rootObject: Any?
    do {
      let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
      unarchiver.requiresSecureCoding = false

      registerV3ClassNames(for: ClientRegistration.self)
      registerV3ClassNames(for: Credential.self)

      rootObject = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)
    } catch {
      return .failed(.storage(.decodeFailed(error)))
    }
    logger.log("getCredential: Root object type: \(type(of: rootObject))")

    // Read dictionary [String: ClientRegistration] keyed by issuer (v3 format maintained for compatibility)
    guard let clientRegistrationsDict = rootObject as? [String: ClientRegistration] else {
      logger.log("getCredential: Failed to cast root object to [String: ClientRegistration]")
      return .failed(.unexpectedFormat)
    }

    logger
      .log(
        "getCredential: Successfully decoded dictionary with \(clientRegistrationsDict.count) entries, keys: \(clientRegistrationsDict.keys)"
      )

    guard let clientRegistration = clientRegistrationsDict.values.first else {
      logger.log("getCredential: Dictionary is empty")
      return .absent
    }

    logger
      .log(
        "getCredential: ClientRegistration decoded, credential property: \(String(describing: clientRegistration.credential))"
      )

    guard let credential = clientRegistration.credential else {
      logger.log("getCredential: No credential found in ClientRegistration")
      return .absent
    }

    logger.log(
      "getCredential: Successfully decoded credential from ClientRegistration dictionary"
    )
    return .ok(credential)
  }

  /// The pending authorization request. The empty dictionary v3 writes after removing a request is absent.
  func readAuthorizationRequestRecord(logger: AppLogger) -> LegacyRecordRead<AuthorizationRequest> {
    let data: Data
    switch readAccountFileData(.authorizationRequest) {
    case let .ok(fileData):
      data = fileData
    case .absent:
      logger.log("getAuthorizationRequest: File does not exist")
      return .absent
    case let .failed(failure):
      if case .account = failure {
        logger.log("getAuthorizationRequest: No current account ID found")
      }
      return .failed(failure)
    }

    logger.log("getAuthorizationRequest: Read \(data.count) bytes")

    let rootObject: Any?
    do {
      let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
      unarchiver.requiresSecureCoding = false

      registerV3ClassNames(for: AuthorizationRequest.self)
      registerV3ClassNames(for: Address.self)
      rootObject = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)
    } catch {
      return .failed(.storage(.decodeFailed(error)))
    }

    if let dict = rootObject as? [AnyHashable: Any], dict.isEmpty {
      logger.log("getAuthorizationRequest: Empty dictionary - no authorization request")
      return .absent
    }

    // Read dictionary [String: AuthorizationRequest] - just get the first value regardless of key
    if let requestsDict = rootObject as? [String: AuthorizationRequest],
       let authRequest = requestsDict.values.first
    {
      logger.log(
        "getAuthorizationRequest: Successfully decoded dictionary with \(requestsDict.count) entries"
      )
      return .ok(authRequest)
    }

    // Fallback: try as single AuthorizationRequest
    if let authRequest = rootObject as? AuthorizationRequest {
      logger.log("getAuthorizationRequest: Successfully decoded as single AuthorizationRequest")
      return .ok(authRequest)
    }

    logger.log("getAuthorizationRequest: Failed to decode")
    return .failed(.unexpectedFormat)
  }

  /// The documents model for the current issuer, else the first one stored.
  func readEvidenceRecord() -> LegacyRecordRead<DocumentsDataModel> {
    let data: Data
    switch readAccountFileData(.documents) {
    case let .ok(fileData):
      data = fileData
    case .absent:
      return .absent
    case let .failed(failure):
      return .failed(failure)
    }

    guard let documentsDict = DocumentsArchiver().decode(from: data) else {
      return .failed(.undecodable)
    }

    // Try current issuer key, then try all keys
    guard let model = documentsDict[issuer] ?? documentsDict.values.first else {
      return .absent
    }
    return .ok(model)
  }

  /// client_metadata, as the dictionaries `getSavedServices` resolves.
  func readSavedServicesRecord(logger: AppLogger) -> LegacyRecordRead<[[String: Any]]> {
    let data: Data
    switch readAccountFileData(.clientMetadata) {
    case let .ok(fileData):
      data = fileData
    case .absent:
      logger.log("getSavedServices: client_metadata file not found, returning empty array")
      return .absent
    case let .failed(failure):
      if case .account = failure {
        logger.log("getSavedServices: No account ID, returning empty array")
      }
      return .failed(failure)
    }

    guard let model = ClientMetadataArchiver().decode(from: data) else {
      logger.log("getSavedServices: Failed to decode client_metadata, returning empty array")
      return .failed(.undecodable)
    }

    let services = (model.clients ?? []).map { $0.toDictionary() }
    logger.log("getSavedServices: Read \(services.count) services from client_metadata")
    return .ok(services)
  }

  /// The bytes of one of the current account's files, for records that decode their own archives.
  private func readAccountFileData(_ file: AccountFiles) -> LegacyRecordRead<Data> {
    let accountID: String
    do {
      accountID = try resolveCurrentAccountID()
    } catch {
      return .failed(.account(AccountReadFailure.from(error)))
    }

    let rootDirectoryURL: URL
    do {
      rootDirectoryURL = try FileManager.default.url(
        for: defaultSearchPathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
    } catch {
      return .failed(.storage(.storageRootUnavailable(error)))
    }

    let fileUrl =
      rootDirectoryURL
        .appendingPathComponent(basePath)
        .appendingPathComponent(accountID)
        .appendingPathComponent(file.rawValue)

    guard FileManager.default.fileExists(atPath: fileUrl.path) else {
      return .absent
    }

    do {
      return try .ok(Data(contentsOf: fileUrl))
    } catch {
      return .failed(.storage(.fileUnreadable(error)))
    }
  }
}
