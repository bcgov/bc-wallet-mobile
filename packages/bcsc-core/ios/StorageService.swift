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
  case evidenceMetadata = "evidence_metadata"
}

class StorageService {
  let logger = AppLogger(
    subsystem: Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard",
    category: "StorageService"
  )
  var currentBundleID: String {
    return Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard"
  }

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

  // NOTE: While the system reads an 'accounts' array from the account_list file,
  // and could theoretically support multiple accounts, the current implementation
  // only uses the *first* account ID found. For current practical purposes,
  // there should only be one account ID present in the 'accounts' array.
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
        logger.error("account_list file does not exist at \(accountListFileUrl.path).")
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
          "Failed to parse account_list JSON or accounts array is empty/first ID is empty.")
        return nil
      }
    } catch {
      logger.error("Could not access or read account_list: \(error).")
      return nil
    }
  }

  var currentIssuer: String {
    let pathDirectory = defaultSearchPathDirectory
    do {
      let rootDirectoryURL = try FileManager.default.url(
        for: pathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      let issuerFileUrl =
        rootDirectoryURL
        .appendingPathComponent("\(currentBundleID)/data")
        .appendingPathComponent(issuerURLComponent)

      guard FileManager.default.fileExists(atPath: issuerFileUrl.path) else {
        logger.error("issuer file does not exist at \(issuerFileUrl.path). Returning 'prod'.")
        return "prod"
      }

      let issuer = try String(contentsOf: issuerFileUrl, encoding: .utf8).trimmingCharacters(
        in: .whitespacesAndNewlines)

      logger.log("StorageService: Successfully loaded issuer \(issuer) from issuer file.")
      return getIssuerNameFromIssuer(issuer: issuer)
    } catch {
      logger.error("Could not access or read issuer file: \(error). Returning 'prod'.")
      return "prod"

    }
  }

  var basePath: String {
    return "\(currentBundleID)/data/accounts_dir/\(currentIssuer)"
  }

  var provider = "https://idsit.gov.bc.ca/device/"

  func readData<T: NSObject & NSCoding & NSSecureCoding>(
    file: AccountFiles,
    pathDirectory: FileManager.SearchPathDirectory
  ) -> T? {  // Added file parameter
    do {
      guard let accountID = self.currentAccountID else {
        logger.error("currentAccountID is nil. Cannot read data.")
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
        .appendingPathComponent(accountID)  // Use unwrapped accountID
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
        logger.error("currentAccountID is nil. Cannot write data.")
        return false
      }

      // Build the file URL
      let rootDirectoryURL = try FileManager.default.url(
        for: pathDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: false
      )
      let fileUrl =
        rootDirectoryURL
        .appendingPathComponent(self.basePath)
        .appendingPathComponent(accountID)
        .appendingPathComponent(file.rawValue)

      // Encode the object to data
      let encodedData = try encodeArchivedObject(object: data)

      // Write the encoded data to file
      try encodedData.write(to: fileUrl)

      logger.log("Successfully wrote data to file: \(fileUrl.path)")
      return true
    } catch {
      logger.error("Error writing data: \(error)")
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
          "StorageService: Successfully removed account files for account: \(accountID)")
      } else {
        logger.log("StorageService: Account files for account: \(accountID) not found")
      }

      return true
    } catch {
      logger.log("StorageService: Error removing account files: \(error)")
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

    // Convert to JSON data and write to file
    let jsonData = try JSONSerialization.data(withJSONObject: accountListData, options: [])
    try jsonData.write(to: accountListPath)
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
    if T.self != NSDictionary.self {
      // Wrap the object in a dictionary with provider key (reverse of decode logic)
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

    // For custom types, unwrap from provider dictionary
    // For Foundation collection types, return directly
    if !isFoundationCollectionType {
      if let decodedDict = decoded as? [String: T] {
        return decodedDict[provider]
      }
      return nil
    } else {
      return decoded as? T
    }
  }

  // https://id.gov.bc.ca -> "prod"
  // https://iddev.gov.bc.ca -> "dev"
  private func getIssuerNameFromIssuer(issuer: String) -> String {
    guard let host = URLComponents(string: issuer)?.host else {
      return "prod"
    }

    if host.hasPrefix("id") {
      let remainder = host.dropFirst(2)  // remove "id"

      if let env = remainder.split(separator: ".").first, !env.isEmpty {
        return String(env)  // "dev", "test"
      }
    }

    return "prod"
  }
}
