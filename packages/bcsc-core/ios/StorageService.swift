//
//  StorageService.swift
//  bc-services-card
//

import Foundation

let defaultSearchPathDirectory = FileManager.SearchPathDirectory.applicationSupportDirectory
let testSearchPathDirectory = FileManager.SearchPathDirectory.cachesDirectory

// URL components for files
let accountListURLComponent = "account_list"
let metadataURLComponent = "metadata"
let issuerURLComponent = "issuer"

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
    let pathDirectory = defaultSearchPathDirectory

    do {
      let rootDirectoryURL = try FileManager.default.url(
        for: pathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      let accountListFileUrl =
        rootDirectoryURL
          .appendingPathComponent(self.basePath)
          .appendingPathComponent(accountListURLComponent)

      guard FileManager.default.fileExists(atPath: accountListFileUrl.path) else {
        return nil
      }

      let data = try Data(contentsOf: accountListFileUrl)

      if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
         let accounts = json["accounts"] as? [String],
         let firstAccountID = accounts.first, !firstAccountID.isEmpty
      {
        // logger.log("StorageService: Successfully loaded account ID \(firstAccountID) from account_list.")
        return firstAccountID
      } else {
        logger.error(
          "Failed to parse account_list JSON or accounts array is empty/first ID is empty."
        )
        return nil
      }
    } catch {
      logger.error("Could not access or read account_list: \(error).")
      return nil
    }
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

      let value = try String(contentsOf: issuerFileURL, encoding: .utf8)
        .trimmingCharacters(in: .whitespacesAndNewlines)
      return value
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
  ) -> T? { // Added file parameter
    do {
      guard let accountID = self.currentAccountID else {
        logger.error("readData: currentAccountID is nil. Cannot read data for file: \(file.rawValue)")
        return nil
      }
      let rootDirectoryURL = try FileManager.default.url(
        for: pathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      let fileUrl =
        rootDirectoryURL
          .appendingPathComponent(self.basePath)
          .appendingPathComponent(accountID) // Use unwrapped accountID
          .appendingPathComponent(file.rawValue)

      guard FileManager.default.fileExists(atPath: fileUrl.path) else {
        return nil
      }

      let accessGranted = fileUrl.startAccessingSecurityScopedResource()

      defer {
        if accessGranted {
          fileUrl.stopAccessingSecurityScopedResource()
        }
      }

      let data = try Data(contentsOf: fileUrl)
      logger.log("Data read from file: \(data)")

      if let obj: T = try? decodeArchivedObject(from: data) {
        logger.log("Decoded object: \(obj)")
        return obj
      }

      logger.error("Failed to decode object from data.")

      return nil
    } catch {
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
      // Register both production and dev module names for compatibility
      let prodClassName = "bc_services_card.\(className)"
      let devClassName = "bc_services_card_dev.\(className)"
      NSKeyedUnarchiver.setClass(T.self, forClassName: prodClassName)
      NSKeyedUnarchiver.setClass(T.self, forClassName: devClassName)
      logger.log("Decoding class - registered mappings for: \(prodClassName) and \(devClassName)")
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
