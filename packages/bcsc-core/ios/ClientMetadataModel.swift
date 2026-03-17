//
//  ClientMetadataModel.swift
//  bcsc-core
//
//  V3-compatible NSCoding model classes for reading/writing the "client_metadata" file.
//  These classes must have identical class names and NSCoding keys as the v3 ias-ios app
//  so that NSKeyedArchiver/Unarchiver can serialize/deserialize cross-version data.
//
//  In v3, the class names are:
//  - bc_services_card.ClientMetadataResponseModel
//  - bc_services_card.MetadataClients
//  (or bc_services_card_dev.* for dev builds)
//

import Foundation

// MARK: - MetadataClients

class MetadataClients: NSObject, NSSecureCoding {
  static var supportsSecureCoding: Bool {
    true
  }

  let clientId: String?
  var clientName: String?
  let applicationType: String?
  var clientUri: String?
  var bookmarked: Bool?
  var lastUsed: Date?
  var dateAdded: Date?
  var initiateLoginUri: String?
  let clientDescription: String?
  let policyUri: String?
  let serviceListingSortOrder: Int?
  let claimsDescription: String?
  let suppressConfirmationInfo: Bool?
  let allowedIdentificationProcesses: [String?]?
  let suppressBookmarkPrompt: Bool?

  enum CodingKeys: String, CodingKey {
    case clientId = "client_ref_id"
    case clientName = "client_name"
    case applicationType = "application_type"
    case clientUri = "client_uri"
    case bookmarked
    case lastUsed = "last_used"
    case dateAdded = "date_added"
    case initiateLoginUri = "initiate_login_uri"
    case clientDescription = "client_description"
    case policyUri = "policy_uri"
    case serviceListingSortOrder = "service_listing_sort_order"
    case claimsDescription = "claims_description"
    case suppressConfirmationInfo = "suppress_confirmation_info"
    case allowedIdentificationProcesses = "allowed_identification_processes"
    case suppressBookmarkPrompt = "suppress_bookmark_prompt"
  }

  init(
    clientId: String?,
    clientName: String? = nil,
    bookmarked: Bool? = nil,
    dateAdded: Date? = nil,
    lastUsed: Date? = nil,
    clientUri: String? = nil,
    initiateLoginUri: String? = nil,
    clientDescription: String? = nil,
    policyUri: String? = nil,
    serviceListingSortOrder: Int? = nil,
    claimsDescription: String? = nil,
    suppressConfirmationInfo: Bool? = nil,
    allowedIdentificationProcesses: [String?]? = nil,
    suppressBookmarkPrompt: Bool? = nil,
    applicationType: String? = nil
  ) {
    self.clientId = clientId
    self.clientName = clientName
    self.bookmarked = bookmarked
    self.dateAdded = dateAdded
    self.lastUsed = lastUsed
    self.clientUri = clientUri
    self.initiateLoginUri = initiateLoginUri
    self.clientDescription = clientDescription
    self.policyUri = policyUri
    self.serviceListingSortOrder = serviceListingSortOrder
    self.claimsDescription = claimsDescription
    self.suppressConfirmationInfo = suppressConfirmationInfo
    self.allowedIdentificationProcesses = allowedIdentificationProcesses
    self.suppressBookmarkPrompt = suppressBookmarkPrompt
    self.applicationType = applicationType
  }

  func encode(with encoder: NSCoder) {
    encoder.encode(clientId, forKey: CodingKeys.clientId.rawValue)
    encoder.encode(clientName, forKey: CodingKeys.clientName.rawValue)
    encoder.encode(applicationType, forKey: CodingKeys.applicationType.rawValue)
    encoder.encode(clientUri, forKey: CodingKeys.clientUri.rawValue)
    encoder.encode(bookmarked, forKey: CodingKeys.bookmarked.rawValue)
    encoder.encode(lastUsed, forKey: CodingKeys.lastUsed.rawValue)
    encoder.encode(dateAdded, forKey: CodingKeys.dateAdded.rawValue)
    encoder.encode(initiateLoginUri, forKey: CodingKeys.initiateLoginUri.rawValue)
    encoder.encode(clientDescription, forKey: CodingKeys.clientDescription.rawValue)
    encoder.encode(policyUri, forKey: CodingKeys.policyUri.rawValue)
    encoder.encode(serviceListingSortOrder, forKey: CodingKeys.serviceListingSortOrder.rawValue)
    encoder.encode(claimsDescription, forKey: CodingKeys.claimsDescription.rawValue)
    encoder.encode(suppressConfirmationInfo, forKey: CodingKeys.suppressConfirmationInfo.rawValue)
    encoder.encode(allowedIdentificationProcesses, forKey: CodingKeys.allowedIdentificationProcesses.rawValue)
    encoder.encode(suppressBookmarkPrompt, forKey: CodingKeys.suppressBookmarkPrompt.rawValue)
  }

  required init?(coder decoder: NSCoder) {
    clientId = decoder.decodeObject(forKey: CodingKeys.clientId.rawValue) as? String
    clientName = decoder.decodeObject(forKey: CodingKeys.clientName.rawValue) as? String
    applicationType = decoder.decodeObject(forKey: CodingKeys.applicationType.rawValue) as? String
    clientUri = decoder.decodeObject(forKey: CodingKeys.clientUri.rawValue) as? String
    bookmarked = decoder.decodeObject(forKey: CodingKeys.bookmarked.rawValue) as? Bool
    lastUsed = decoder.decodeObject(forKey: CodingKeys.lastUsed.rawValue) as? Date
    dateAdded = decoder.decodeObject(forKey: CodingKeys.dateAdded.rawValue) as? Date
    initiateLoginUri = decoder.decodeObject(forKey: CodingKeys.initiateLoginUri.rawValue) as? String
    clientDescription = decoder.decodeObject(forKey: CodingKeys.clientDescription.rawValue) as? String
    policyUri = decoder.decodeObject(forKey: CodingKeys.policyUri.rawValue) as? String
    serviceListingSortOrder = decoder.decodeObject(forKey: CodingKeys.serviceListingSortOrder.rawValue) as? Int
    claimsDescription = decoder.decodeObject(forKey: CodingKeys.claimsDescription.rawValue) as? String
    suppressConfirmationInfo = decoder.decodeObject(forKey: CodingKeys.suppressConfirmationInfo.rawValue) as? Bool
    allowedIdentificationProcesses = decoder
      .decodeObject(forKey: CodingKeys.allowedIdentificationProcesses.rawValue) as? [String?]
    suppressBookmarkPrompt = decoder.decodeObject(forKey: CodingKeys.suppressBookmarkPrompt.rawValue) as? Bool
  }

  /// Convert to JS-friendly dictionary matching NativeSavedService type
  func toDictionary() -> [String: Any] {
    var dict: [String: Any] = [
      "clientRefId": clientId ?? "",
      "bookmarked": bookmarked ?? false,
    ]
    if let clientName = clientName { dict["clientName"] = clientName }
    if let dateAdded = dateAdded { dict["dateAdded"] = dateAdded.timeIntervalSince1970 }
    if let lastUsed = lastUsed { dict["lastUsed"] = lastUsed.timeIntervalSince1970 }
    if let clientUri = clientUri { dict["clientUri"] = clientUri }
    if let initiateLoginUri = initiateLoginUri { dict["initiateLoginUri"] = initiateLoginUri }
    if let clientDescription = clientDescription { dict["clientDescription"] = clientDescription }
    if let policyUri = policyUri { dict["policyUri"] = policyUri }
    if let serviceListingSortOrder = serviceListingSortOrder {
      dict["serviceListingSortOrder"] = serviceListingSortOrder
    }
    if let claimsDescription = claimsDescription { dict["claimsDescription"] = claimsDescription }
    if let suppressConfirmationInfo = suppressConfirmationInfo {
      dict["suppressConfirmationInfo"] = suppressConfirmationInfo
    }
    if let suppressBookmarkPrompt = suppressBookmarkPrompt { dict["suppressBookmarkPrompt"] = suppressBookmarkPrompt }
    return dict
  }

  /// Create from JS dictionary matching NativeSavedService type
  static func fromDictionary(_ dict: [String: Any]) -> MetadataClients {
    return MetadataClients(
      clientId: dict["clientRefId"] as? String,
      clientName: dict["clientName"] as? String,
      bookmarked: dict["bookmarked"] as? Bool,
      dateAdded: (dict["dateAdded"] as? Double).map { Date(timeIntervalSince1970: $0) },
      lastUsed: (dict["lastUsed"] as? Double).map { Date(timeIntervalSince1970: $0) },
      clientUri: dict["clientUri"] as? String,
      initiateLoginUri: dict["initiateLoginUri"] as? String,
      clientDescription: dict["clientDescription"] as? String,
      policyUri: dict["policyUri"] as? String,
      serviceListingSortOrder: dict["serviceListingSortOrder"] as? Int,
      claimsDescription: dict["claimsDescription"] as? String,
      suppressConfirmationInfo: dict["suppressConfirmationInfo"] as? Bool,
      suppressBookmarkPrompt: dict["suppressBookmarkPrompt"] as? Bool
    )
  }
}

// MARK: - ClientMetadataResponseModel

class ClientMetadataResponseModel: NSObject, NSSecureCoding {
  static var supportsSecureCoding: Bool {
    true
  }

  var clients: [MetadataClients]?

  enum CodingKeys: String, CodingKey {
    case clients
  }

  init(clients: [MetadataClients]) {
    self.clients = clients
  }

  func encode(with encoder: NSCoder) {
    encoder.encode(clients, forKey: CodingKeys.clients.rawValue)
  }

  required init?(coder decoder: NSCoder) {
    clients = decoder.decodeObject(forKey: CodingKeys.clients.rawValue) as? [MetadataClients]
  }
}

// MARK: - ClientMetadataArchiver

/// Handles NSKeyedArchiver/Unarchiver class name registration and
/// encoding/decoding for client metadata, following the DocumentsArchiver pattern.
class ClientMetadataArchiver {
  private let logger = AppLogger(
    subsystem: Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard",
    category: "ClientMetadataArchiver"
  )

  private var nativeModuleName: String {
    let bundleID = Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard"
    switch bundleID {
    case "ca.bc.gov.id.servicescard":
      return "bc_services_card"
    case "ca.bc.gov.iddev.servicescard":
      return "bc_services_card_dev"
    default:
      return "bc_services_card_dev"
    }
  }

  private var provider: String {
    let storage = StorageService()
    return storage.provider
  }

  /// All client metadata model classes that need class mapping registration
  private let modelClasses: [(NSObject & NSCoding).Type] = [
    ClientMetadataResponseModel.self,
    MetadataClients.self,
  ]

  private func registerDecodingClassMappings() {
    for cls in modelClasses {
      let className = String(describing: cls)
      let prodName = "bc_services_card.\(className)"
      let devName = "bc_services_card_dev.\(className)"
      NSKeyedUnarchiver.setClass(cls, forClassName: prodName)
      NSKeyedUnarchiver.setClass(cls, forClassName: devName)
    }
  }

  private func registerEncodingClassMappings() {
    for cls in modelClasses {
      let className = String(describing: cls)
      let archivedName = "\(nativeModuleName).\(className)"
      NSKeyedArchiver.setClassName(archivedName, for: cls)
    }
  }

  /// Decode ClientMetadataResponseModel from archived data.
  /// V3 stores this as [provider: ClientMetadataResponseModel] dictionary.
  func decode(from data: Data) -> ClientMetadataResponseModel? {
    registerDecodingClassMappings()

    do {
      let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
      unarchiver.requiresSecureCoding = false
      let decoded = unarchiver.decodeObject(forKey: NSKeyedArchiveRootObjectKey)
      unarchiver.finishDecoding()

      // V3 wraps in [provider: model] dictionary
      if let dict = decoded as? [String: ClientMetadataResponseModel] {
        return dict[provider]
      }

      // Try direct decode as fallback
      if let model = decoded as? ClientMetadataResponseModel {
        return model
      }

      logger.error("ClientMetadataArchiver: Could not decode client metadata")
      return nil
    } catch {
      logger.error("ClientMetadataArchiver: Failed to decode: \(error)")
      return nil
    }
  }

  /// Encode ClientMetadataResponseModel to archived data.
  /// Wraps in [provider: model] dictionary for v3 compatibility.
  func encode(_ model: ClientMetadataResponseModel) -> Data? {
    registerEncodingClassMappings()

    let archiver = NSKeyedArchiver(requiringSecureCoding: false)
    let wrapped: [String: ClientMetadataResponseModel] = [provider: model]
    archiver.encode(wrapped, forKey: NSKeyedArchiveRootObjectKey)
    archiver.finishEncoding()
    return archiver.encodedData
  }
}
