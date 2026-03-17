//
//  DocumentsDataModel.swift
//  bcsc-core
//
//  V3-compatible NSCoding model classes for reading/writing the "documents" file.
//  These classes must have identical class names and NSCoding keys as the v3 ias-ios app
//  so that NSKeyedArchiver/Unarchiver can serialize/deserialize cross-version data.
//

import CommonCrypto
import Foundation

// MARK: - ImageSide

class ImageSide: NSObject, NSSecureCoding {
  static var supportsSecureCoding: Bool {
    true
  }

  let imageSideName: String
  let imageSideLabel: String
  let imageSideTip: String

  enum CodingKeys: String, CodingKey {
    case imageSideName = "image_side_name"
    case imageSideLabel = "image_side_label"
    case imageSideTip = "image_side_tip"
  }

  init(imageSideName: String, imageSideLabel: String = "", imageSideTip: String = "") {
    self.imageSideName = imageSideName
    self.imageSideLabel = imageSideLabel
    self.imageSideTip = imageSideTip
  }

  func encode(with encoder: NSCoder) {
    encoder.encode(imageSideName, forKey: CodingKeys.imageSideName.rawValue)
    encoder.encode(imageSideLabel, forKey: CodingKeys.imageSideLabel.rawValue)
    encoder.encode(imageSideTip, forKey: CodingKeys.imageSideTip.rawValue)
  }

  required init?(coder decoder: NSCoder) {
    imageSideName = decoder.decodeObject(forKey: CodingKeys.imageSideName.rawValue) as? String ?? ""
    imageSideLabel = decoder.decodeObject(forKey: CodingKeys.imageSideLabel.rawValue) as? String ?? ""
    imageSideTip = decoder.decodeObject(forKey: CodingKeys.imageSideTip.rawValue) as? String ?? ""
  }
}

// MARK: - BarcodeData

class BarcodeData: NSObject, NSSecureCoding {
  static var supportsSecureCoding: Bool {
    true
  }

  /// Stored as [String: String] dictionary
  let value: [String: String]?

  enum CodingKeys: String, CodingKey {
    case value
  }

  init(value: [String: String]?) {
    self.value = value
  }

  /// Create from barcode payload dictionary
  init(fromPayload payload: [String: Any]) {
    var dict = [String: String]()
    for (key, val) in payload {
      if key == "address", let addressDict = val as? [String: Any] {
        // Flatten address fields into top-level
        for (addrKey, addrVal) in addressDict {
          dict[addrKey] = "\(addrVal)"
        }
      } else {
        dict[key] = "\(val)"
      }
    }
    self.value = dict
  }

  func encode(with encoder: NSCoder) {
    encoder.encode(value, forKey: CodingKeys.value.rawValue)
  }

  required init?(coder decoder: NSCoder) {
    value = decoder.decodeObject(forKey: CodingKeys.value.rawValue) as? [String: String]
  }

  /// Convert to barcode payload dictionary for JS
  func toPayloadDictionary() -> [String: Any] {
    guard let value = value else { return [:] }
    var result = [String: Any]()

    // Check if it has address fields that need to be nested
    let addressKeys: Set<String> = ["street_address", "locality", "province", "postal_code", "country"]
    var addressDict = [String: String]()

    for (key, val) in value {
      if addressKeys.contains(key) {
        addressDict[key] = val
      } else {
        result[key] = val
      }
    }

    if !addressDict.isEmpty {
      result["address"] = addressDict
    }

    return result
  }
}

// MARK: - EvidenceType

class EvidenceType: NSObject, NSSecureCoding {
  static var supportsSecureCoding: Bool {
    true
  }

  let evidenceType: String?
  let hasPhoto: Bool?
  let group: String?
  let sortOrder: Int?
  let groupSortOrder: Int?
  let collectionOrder: String?
  let documentReferenceInputMask: String?
  let documentReferenceLabel: String?
  let documentReferenceSample: String?
  var imageSides: [ImageSide]
  var evidenceTypeLabel: String?

  enum CodingKeys: String, CodingKey {
    case evidenceType = "evidence_type"
    case hasPhoto = "has_photo"
    case group
    case sortOrder = "sort_order"
    case collectionOrder = "collection_order"
    case groupSortOrder = "group_sort_order"
    case documentReferenceInputMask = "document_reference_input_mask"
    case documentReferenceLabel = "document_reference_label"
    case documentReferenceSample = "document_reference_sample"
    case imageSides = "image_sides"
    case evidenceTypeLabel = "evidence_type_label"
  }

  init(
    evidenceType: String? = nil,
    hasPhoto: Bool? = nil,
    group: String? = nil,
    sortOrder: Int? = nil,
    groupSortOrder: Int? = nil,
    collectionOrder: String? = nil,
    documentReferenceInputMask: String? = nil,
    documentReferenceLabel: String? = nil,
    documentReferenceSample: String? = nil,
    imageSides: [ImageSide] = [],
    evidenceTypeLabel: String? = nil
  ) {
    self.evidenceType = evidenceType
    self.hasPhoto = hasPhoto
    self.group = group
    self.sortOrder = sortOrder
    self.groupSortOrder = groupSortOrder
    self.collectionOrder = collectionOrder
    self.documentReferenceInputMask = documentReferenceInputMask
    self.documentReferenceLabel = documentReferenceLabel
    self.documentReferenceSample = documentReferenceSample
    self.imageSides = imageSides
    self.evidenceTypeLabel = evidenceTypeLabel
  }

  /// Create from evidenceType dictionary
  init(fromDictionary dict: [String: Any]) {
    self.evidenceType = dict["evidence_type"] as? String
    self.hasPhoto = dict["has_photo"] as? Bool
    self.group = dict["group"] as? String
    self.sortOrder = dict["sort_order"] as? Int
    self.groupSortOrder = dict["group_sort_order"] as? Int
    self.collectionOrder = dict["collection_order"] as? String
    self.documentReferenceInputMask = dict["document_reference_input_mask"] as? String
    self.documentReferenceLabel = dict["document_reference_label"] as? String
    self.documentReferenceSample = dict["document_reference_sample"] as? String
    self.evidenceTypeLabel = dict["evidence_type_label"] as? String

    if let sidesArray = dict["image_sides"] as? [[String: Any]] {
      self.imageSides = sidesArray.map { sideDict in
        ImageSide(
          imageSideName: sideDict["image_side_name"] as? String ?? "",
          imageSideLabel: sideDict["image_side_label"] as? String ?? "",
          imageSideTip: sideDict["image_side_tip"] as? String ?? ""
        )
      }
    } else {
      self.imageSides = []
    }
  }

  func encode(with encoder: NSCoder) {
    encoder.encode(evidenceType, forKey: CodingKeys.evidenceType.rawValue)
    encoder.encode(hasPhoto, forKey: CodingKeys.hasPhoto.rawValue)
    encoder.encode(sortOrder, forKey: CodingKeys.sortOrder.rawValue)
    encoder.encode(groupSortOrder, forKey: CodingKeys.groupSortOrder.rawValue)
    encoder.encode(collectionOrder, forKey: CodingKeys.collectionOrder.rawValue)
    encoder.encode(group, forKey: CodingKeys.group.rawValue)
    encoder.encode(documentReferenceInputMask, forKey: CodingKeys.documentReferenceInputMask.rawValue)
    encoder.encode(documentReferenceLabel, forKey: CodingKeys.documentReferenceLabel.rawValue)
    encoder.encode(documentReferenceSample, forKey: CodingKeys.documentReferenceSample.rawValue)
    encoder.encode(imageSides, forKey: CodingKeys.imageSides.rawValue)
    encoder.encode(evidenceTypeLabel, forKey: CodingKeys.evidenceTypeLabel.rawValue)
  }

  required init?(coder decoder: NSCoder) {
    evidenceType = decoder.decodeObject(forKey: CodingKeys.evidenceType.rawValue) as? String
    hasPhoto = decoder.decodeObject(forKey: CodingKeys.hasPhoto.rawValue) as? Bool
    sortOrder = decoder.decodeObject(forKey: CodingKeys.sortOrder.rawValue) as? Int
    groupSortOrder = decoder.decodeObject(forKey: CodingKeys.groupSortOrder.rawValue) as? Int
    collectionOrder = decoder.decodeObject(forKey: CodingKeys.collectionOrder.rawValue) as? String
    group = decoder.decodeObject(forKey: CodingKeys.group.rawValue) as? String
    documentReferenceInputMask = decoder.decodeObject(forKey: CodingKeys.documentReferenceInputMask.rawValue) as? String
    documentReferenceLabel = decoder.decodeObject(forKey: CodingKeys.documentReferenceLabel.rawValue) as? String
    documentReferenceSample = decoder.decodeObject(forKey: CodingKeys.documentReferenceSample.rawValue) as? String
    imageSides = decoder.decodeObject(forKey: CodingKeys.imageSides.rawValue) as? [ImageSide] ?? []
    evidenceTypeLabel = decoder.decodeObject(forKey: CodingKeys.evidenceTypeLabel.rawValue) as? String
  }

  /// Convert to dictionary for JS
  func toDictionary() -> [String: Any] {
    var dict = [String: Any]()
    if let evidenceType = evidenceType { dict["evidence_type"] = evidenceType }
    if let hasPhoto = hasPhoto { dict["has_photo"] = hasPhoto }
    if let group = group { dict["group"] = group }
    if let sortOrder = sortOrder { dict["sort_order"] = sortOrder }
    if let groupSortOrder = groupSortOrder { dict["group_sort_order"] = groupSortOrder }
    if let collectionOrder = collectionOrder { dict["collection_order"] = collectionOrder }
    if let documentReferenceInputMask = documentReferenceInputMask {
      dict["document_reference_input_mask"] = documentReferenceInputMask
    }
    if let documentReferenceLabel = documentReferenceLabel { dict["document_reference_label"] = documentReferenceLabel }
    if let documentReferenceSample = documentReferenceSample {
      dict["document_reference_sample"] = documentReferenceSample
    }
    if let evidenceTypeLabel = evidenceTypeLabel { dict["evidence_type_label"] = evidenceTypeLabel }
    dict["image_sides"] = imageSides.map { side -> [String: String] in
      [
        "image_side_name": side.imageSideName,
        "image_side_label": side.imageSideLabel,
        "image_side_tip": side.imageSideTip,
      ]
    }
    return dict
  }
}

// MARK: - EvidenceDetails

class EvidenceDetails: NSObject, NSSecureCoding {
  static var supportsSecureCoding: Bool {
    true
  }

  var documentNumber: String?
  var namesMatching: Bool?

  enum CodingKeys: String, CodingKey {
    case documentNumber = "document_number"
    case namesMatching = "names_matching"
  }

  init(documentNumber: String?, namesMatching: Bool? = true) {
    self.documentNumber = documentNumber
    self.namesMatching = namesMatching
  }

  func encode(with encoder: NSCoder) {
    encoder.encode(documentNumber, forKey: CodingKeys.documentNumber.rawValue)
    encoder.encode(namesMatching, forKey: CodingKeys.namesMatching.rawValue)
  }

  required init?(coder decoder: NSCoder) {
    documentNumber = decoder.decodeObject(forKey: CodingKeys.documentNumber.rawValue) as? String
    namesMatching = decoder.decodeObject(forKey: CodingKeys.namesMatching.rawValue) as? Bool
  }
}

// MARK: - EvidencePhoto

class EvidencePhoto: NSObject, NSSecureCoding {
  static var supportsSecureCoding: Bool {
    true
  }

  let timestamp: Double?
  let photoBase64String: String?

  enum CodingKeys: String, CodingKey {
    case timestamp
    case photoBase64String
  }

  init(timestamp: Double, photoBase64String: String) {
    self.timestamp = timestamp
    self.photoBase64String = photoBase64String
  }

  func encode(with encoder: NSCoder) {
    encoder.encode(timestamp, forKey: CodingKeys.timestamp.rawValue)
    encoder.encode(photoBase64String, forKey: CodingKeys.photoBase64String.rawValue)
  }

  required init?(coder decoder: NSCoder) {
    timestamp = decoder.decodeObject(forKey: CodingKeys.timestamp.rawValue) as? Double
    photoBase64String = decoder.decodeObject(forKey: CodingKeys.photoBase64String.rawValue) as? String
  }
}

// MARK: - EvidenceModel

class EvidenceModel: NSObject, NSSecureCoding {
  static var supportsSecureCoding: Bool {
    true
  }

  var evidenceDetails: EvidenceDetails?
  var evidencePhotos: [EvidencePhoto]?
  let evidenceType: EvidenceType?
  var barcodeData: [BarcodeData]

  enum CodingKeys: String, CodingKey {
    case evidenceDetails
    case evidencePhotos
    case evidenceType
    case barcodeData
  }

  init(
    evidenceDetails: EvidenceDetails?,
    evidencePhotos: [EvidencePhoto]?,
    evidenceType: EvidenceType?,
    barcodeData: [BarcodeData] = []
  ) {
    self.evidenceDetails = evidenceDetails
    self.evidencePhotos = evidencePhotos
    self.evidenceType = evidenceType
    self.barcodeData = barcodeData
  }

  func encode(with encoder: NSCoder) {
    encoder.encode(evidenceDetails, forKey: CodingKeys.evidenceDetails.rawValue)
    encoder.encode(evidencePhotos, forKey: CodingKeys.evidencePhotos.rawValue)
    encoder.encode(evidenceType, forKey: CodingKeys.evidenceType.rawValue)
    encoder.encode(barcodeData, forKey: CodingKeys.barcodeData.rawValue)
  }

  required init?(coder decoder: NSCoder) {
    evidenceDetails = decoder.decodeObject(forKey: CodingKeys.evidenceDetails.rawValue) as? EvidenceDetails
    evidencePhotos = decoder.decodeObject(forKey: CodingKeys.evidencePhotos.rawValue) as? [EvidencePhoto]
    evidenceType = decoder.decodeObject(forKey: CodingKeys.evidenceType.rawValue) as? EvidenceType
    if let barcodeData = decoder.decodeObject(forKey: CodingKeys.barcodeData.rawValue) as? [BarcodeData],
       !barcodeData.isEmpty
    {
      self.barcodeData = barcodeData
    } else {
      self.barcodeData = []
    }
  }
}

// MARK: - DocumentsDataModel

class DocumentsDataModel: NSObject, NSSecureCoding {
  static var supportsSecureCoding: Bool {
    true
  }

  var firstId: EvidenceModel?
  var secondId: EvidenceModel?

  enum CodingKeys: String, CodingKey {
    case firstId
    case secondId
  }

  init(firstId: EvidenceModel?, secondId: EvidenceModel?) {
    self.firstId = firstId
    self.secondId = secondId
  }

  func encode(with encoder: NSCoder) {
    encoder.encode(secondId, forKey: CodingKeys.secondId.rawValue)
    encoder.encode(firstId, forKey: CodingKeys.firstId.rawValue)
  }

  required init?(coder decoder: NSCoder) {
    firstId = decoder.decodeObject(forKey: CodingKeys.firstId.rawValue) as? EvidenceModel
    secondId = decoder.decodeObject(forKey: CodingKeys.secondId.rawValue) as? EvidenceModel
  }
}

// MARK: - Documents Archiving Helper

/// Helper for reading/writing the v3 `documents` file with proper NSCoding class registrations.
class DocumentsArchiver {
  private let logger = AppLogger(
    subsystem: Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard",
    category: "DocumentsArchiver"
  )

  /// Module name to use for NSKeyedArchiver class registration
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

  /// All document model classes that need class mapping registration
  private let documentModelClasses: [(NSObject & NSCoding).Type] = [
    DocumentsDataModel.self,
    EvidenceModel.self,
    EvidencePhoto.self,
    EvidenceDetails.self,
    EvidenceType.self,
    ImageSide.self,
    BarcodeData.self,
  ]

  /// Register NSKeyedUnarchiver class mappings for all document model types.
  /// V3 archived these with module-prefixed class names.
  private func registerDecodingClassMappings() {
    for cls in documentModelClasses {
      let className = String(describing: cls)
      let prodName = "bc_services_card.\(className)"
      let devName = "bc_services_card_dev.\(className)"
      NSKeyedUnarchiver.setClass(cls, forClassName: prodName)
      NSKeyedUnarchiver.setClass(cls, forClassName: devName)
    }
  }

  /// Register NSKeyedArchiver class name mappings for all document model types.
  private func registerEncodingClassMappings() {
    for cls in documentModelClasses {
      let className = String(describing: cls)
      let archivedName = "\(nativeModuleName).\(className)"
      NSKeyedArchiver.setClassName(archivedName, for: cls)
    }
  }

  /// Decode a `[String: DocumentsDataModel]` dictionary from archived data.
  func decode(from data: Data) -> [String: DocumentsDataModel]? {
    registerDecodingClassMappings()

    do {
      let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
      unarchiver.requiresSecureCoding = false
      let decoded = unarchiver.decodeObject(forKey: NSKeyedArchiveRootObjectKey)
      unarchiver.finishDecoding()

      if let dict = decoded as? [String: DocumentsDataModel] {
        return dict
      }

      logger.error("DocumentsArchiver: Decoded object is not [String: DocumentsDataModel]")
      return nil
    } catch {
      logger.error("DocumentsArchiver: Failed to decode documents data: \(error)")
      return nil
    }
  }

  /// Encode a `[String: DocumentsDataModel]` dictionary to archived data.
  func encode(_ documents: [String: DocumentsDataModel]) -> Data? {
    registerEncodingClassMappings()

    let archiver = NSKeyedArchiver(requiringSecureCoding: false)
    archiver.encode(documents, forKey: NSKeyedArchiveRootObjectKey)
    archiver.finishEncoding()
    return archiver.encodedData
  }

  /// Compute SHA-256 hex string from raw data bytes
  static func sha256Hex(_ data: Data) -> String {
    var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
    data.withUnsafeBytes {
      _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash)
    }
    return hash.map { String(format: "%02x", $0) }.joined()
  }
}
