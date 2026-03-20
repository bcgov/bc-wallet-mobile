@testable import BcscCoreTestable
import XCTest

// MARK: - AuthorizationRequest Archiving Tests

final class AuthorizationRequestArchivingTests: XCTestCase {
  // MARK: - Empty Dictionary (V3 post-verification regression)

  /// V3's StorableSource.remove(for:) removes the entry from a [String: AuthorizationRequest]
  /// dictionary, then writes the now-empty dictionary back to disk. This test verifies the
  /// archive/unarchive cycle for that scenario — the root cause of the "Failed to decode
  /// authorization request" migration error.
  func testEmptyDictionaryArchiveDecodesAsEmptyNSDictionary() throws {
    // Simulate v3 archiving an empty dictionary (post-verification state)
    let emptyDict: [String: AuthorizationRequest] = [:]
    let archiver = NSKeyedArchiver(requiringSecureCoding: false)
    archiver.encode(emptyDict, forKey: NSKeyedArchiveRootObjectKey)
    archiver.finishEncoding()
    let data = archiver.encodedData

    // Decode with v3 class name mappings (same as getAuthorizationRequest)
    NSKeyedUnarchiver.setClass(
      AuthorizationRequest.self, forClassName: "bc_services_card.AuthorizationRequest"
    )
    NSKeyedUnarchiver.setClass(Address.self, forClassName: "bc_services_card.Address")

    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = false
    let rootObject = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)

    // Root object should be an empty NSDictionary
    let nsDict = rootObject as? NSDictionary
    XCTAssertNotNil(nsDict, "Empty dict archive should decode as NSDictionary")
    XCTAssertEqual(nsDict?.count, 0, "Dictionary should have zero entries")
  }

  /// Verifies that an empty dict does NOT cast to [String: AuthorizationRequest] with values,
  /// which is what BcscCore.getAuthorizationRequest relies on to skip the empty dict case.
  func testEmptyDictionaryDoesNotYieldAuthorizationRequest() throws {
    let emptyDict: [String: AuthorizationRequest] = [:]
    let archiver = NSKeyedArchiver(requiringSecureCoding: false)
    archiver.encode(emptyDict, forKey: NSKeyedArchiveRootObjectKey)
    archiver.finishEncoding()
    let data = archiver.encodedData

    NSKeyedUnarchiver.setClass(
      AuthorizationRequest.self, forClassName: "bc_services_card.AuthorizationRequest"
    )

    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = false
    let rootObject = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)

    // The Swift bridge cast to [String: AuthorizationRequest] may succeed but should be empty
    if let typedDict = rootObject as? [String: AuthorizationRequest] {
      XCTAssertTrue(typedDict.isEmpty, "Typed dictionary should be empty")
      XCTAssertNil(typedDict.values.first, "Should have no values")
    }

    // The NSDictionary check (our fix) should catch this
    if let nsDict = rootObject as? NSDictionary {
      XCTAssertEqual(nsDict.count, 0)
    }
  }

  // MARK: - Valid AuthorizationRequest Round-Trip

  func testAuthorizationRequestDictionaryRoundTrip() throws {
    let request = AuthorizationRequest()
    request.deviceCode = "device-123"
    request.userCode = "user-456"
    request.firstName = "Jane"
    request.lastName = "Doe"
    request.status = .authorized
    request.method = .selfVerify

    let address = Address()
    address.streetAddress = "123 Main St"
    address.locality = "Victoria"
    address.postalCode = "V8W 1A1"
    address.country = "CA"
    address.region = "BC"
    request.address = address

    // Archive as [provider: AuthorizationRequest] dict (v3 format)
    let provider = "https://id.gov.bc.ca/device/"
    let dict: [String: AuthorizationRequest] = [provider: request]

    NSKeyedArchiver.setClassName(
      "bc_services_card.AuthorizationRequest", for: AuthorizationRequest.self
    )
    NSKeyedArchiver.setClassName("bc_services_card.Address", for: Address.self)

    let archiver = NSKeyedArchiver(requiringSecureCoding: false)
    archiver.encode(dict, forKey: NSKeyedArchiveRootObjectKey)
    archiver.finishEncoding()
    let data = archiver.encodedData

    // Decode with class name mappings
    NSKeyedUnarchiver.setClass(
      AuthorizationRequest.self, forClassName: "bc_services_card.AuthorizationRequest"
    )
    NSKeyedUnarchiver.setClass(Address.self, forClassName: "bc_services_card.Address")

    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = false
    let rootObject = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)

    let decoded = rootObject as? [String: AuthorizationRequest]
    XCTAssertNotNil(decoded, "Should decode as [String: AuthorizationRequest]")
    XCTAssertEqual(decoded?.count, 1)

    let decodedRequest = decoded?[provider]
    XCTAssertNotNil(decodedRequest)
    XCTAssertEqual(decodedRequest?.deviceCode, "device-123")
    XCTAssertEqual(decodedRequest?.userCode, "user-456")
    XCTAssertEqual(decodedRequest?.firstName, "Jane")
    XCTAssertEqual(decodedRequest?.lastName, "Doe")
    XCTAssertEqual(decodedRequest?.status, .authorized)
    XCTAssertEqual(decodedRequest?.method, .selfVerify)

    // Verify nested Address
    XCTAssertEqual(decodedRequest?.address?.streetAddress, "123 Main St")
    XCTAssertEqual(decodedRequest?.address?.locality, "Victoria")
    XCTAssertEqual(decodedRequest?.address?.postalCode, "V8W 1A1")
    XCTAssertEqual(decodedRequest?.address?.country, "CA")
    XCTAssertEqual(decodedRequest?.address?.region, "BC")
  }

  /// Verifies that dev module class names also work for decoding.
  func testAuthorizationRequestDecodesWithDevClassName() throws {
    let request = AuthorizationRequest()
    request.firstName = "Test"
    request.status = .requested

    let provider = "https://iddev.gov.bc.ca/device/"
    let dict: [String: AuthorizationRequest] = [provider: request]

    // Archive with dev class name
    NSKeyedArchiver.setClassName(
      "bc_services_card_dev.AuthorizationRequest", for: AuthorizationRequest.self
    )
    NSKeyedArchiver.setClassName("bc_services_card_dev.Address", for: Address.self)

    let archiver = NSKeyedArchiver(requiringSecureCoding: false)
    archiver.encode(dict, forKey: NSKeyedArchiveRootObjectKey)
    archiver.finishEncoding()
    let data = archiver.encodedData

    // Decode — register both prod and dev names (as the real code does)
    NSKeyedUnarchiver.setClass(
      AuthorizationRequest.self, forClassName: "bc_services_card.AuthorizationRequest"
    )
    NSKeyedUnarchiver.setClass(
      AuthorizationRequest.self, forClassName: "bc_services_card_dev.AuthorizationRequest"
    )
    NSKeyedUnarchiver.setClass(Address.self, forClassName: "bc_services_card.Address")
    NSKeyedUnarchiver.setClass(Address.self, forClassName: "bc_services_card_dev.Address")

    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = false
    let rootObject = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)

    let decoded = rootObject as? [String: AuthorizationRequest]
    XCTAssertNotNil(decoded)
    XCTAssertEqual(decoded?.values.first?.firstName, "Test")
    XCTAssertEqual(decoded?.values.first?.status, .requested)
  }

  // MARK: - AuthorizationRequest NSCoding Field Preservation

  func testAuthorizationRequestNSCodingRoundTrip() throws {
    let original = AuthorizationRequest()
    original.deviceCode = "dc-001"
    original.userCode = "uc-002"
    original.firstName = "Alice"
    original.lastName = "Smith"
    original.middleNames = "Marie"
    original.csn = "CSN123"
    original.verifiedEmail = "alice@example.com"
    original.status = .completed
    original.method = .counter
    original.audience = "test-audience"
    original.scope = "openid profile"
    original.redirectURI = "bcsc://callback"
    original.cardProcess = "new_card"
    original.birthdate = Date(timeIntervalSince1970: 631_152_000) // 1990-01-01
    original.requestedAt = Date(timeIntervalSince1970: 1_700_000_000)
    original.expiry = Date(timeIntervalSince1970: 1_700_086_400)

    let data = try NSKeyedArchiver.archivedData(
      withRootObject: original, requiringSecureCoding: false
    )
    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = false
    let decoded = unarchiver.decodeObject(forKey: NSKeyedArchiveRootObjectKey) as? AuthorizationRequest

    XCTAssertNotNil(decoded)
    XCTAssertEqual(decoded?.deviceCode, "dc-001")
    XCTAssertEqual(decoded?.userCode, "uc-002")
    XCTAssertEqual(decoded?.firstName, "Alice")
    XCTAssertEqual(decoded?.lastName, "Smith")
    XCTAssertEqual(decoded?.middleNames, "Marie")
    XCTAssertEqual(decoded?.csn, "CSN123")
    XCTAssertEqual(decoded?.verifiedEmail, "alice@example.com")
    XCTAssertEqual(decoded?.status, .completed)
    XCTAssertEqual(decoded?.method, .counter)
    XCTAssertEqual(decoded?.audience, "test-audience")
    XCTAssertEqual(decoded?.scope, "openid profile")
    XCTAssertEqual(decoded?.redirectURI, "bcsc://callback")
    XCTAssertEqual(decoded?.cardProcess, "new_card")
    XCTAssertEqual(try XCTUnwrap(decoded?.birthdate?.timeIntervalSince1970), 631_152_000, accuracy: 1.0)
    XCTAssertEqual(try XCTUnwrap(decoded?.requestedAt?.timeIntervalSince1970), 1_700_000_000, accuracy: 1.0)
    XCTAssertEqual(try XCTUnwrap(decoded?.expiry?.timeIntervalSince1970), 1_700_086_400, accuracy: 1.0)
  }

  func testAddressNSCodingRoundTrip() throws {
    let original = Address(
      streetAddress: "456 Oak Ave",
      locality: "Vancouver",
      postalCode: "V6B 2N2",
      country: "CA",
      region: "BC"
    )

    let data = try NSKeyedArchiver.archivedData(
      withRootObject: original, requiringSecureCoding: false
    )
    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = false
    let decoded = unarchiver.decodeObject(forKey: NSKeyedArchiveRootObjectKey) as? Address

    XCTAssertNotNil(decoded)
    XCTAssertEqual(decoded?.streetAddress, "456 Oak Ave")
    XCTAssertEqual(decoded?.locality, "Vancouver")
    XCTAssertEqual(decoded?.postalCode, "V6B 2N2")
    XCTAssertEqual(decoded?.country, "CA")
    XCTAssertEqual(decoded?.region, "BC")
  }

  // MARK: - toDictionary

  func testAuthorizationRequestToDictionary() {
    let request = AuthorizationRequest()
    request.deviceCode = "dc-test"
    request.firstName = "Bob"
    request.status = .initialized
    request.method = .face

    let dict = request.toDictionary()
    XCTAssertEqual(dict["deviceCode"] as? String, "dc-test")
    XCTAssertEqual(dict["firstName"] as? String, "Bob")
    XCTAssertEqual(dict["status"] as? Int, RequestStatus.initialized.rawValue)
    XCTAssertEqual(dict["method"] as? Int, AuthorizationMethodType.face.rawValue)
  }
}

// MARK: - DocumentsDataModel Archiving Tests

final class DocumentsArchiverTests: XCTestCase {
  func testDocumentsArchiverEncodeDecodeRoundTrip() throws {
    let evidenceType = EvidenceType(
      evidenceType: "passport",
      hasPhoto: true,
      group: "id_group",
      sortOrder: 1
    )

    let details = EvidenceDetails(documentNumber: "AB123456", namesMatching: true)

    let evidence = EvidenceModel(
      evidenceDetails: details,
      evidencePhotos: nil,
      evidenceType: evidenceType
    )

    let model = DocumentsDataModel(firstId: evidence, secondId: nil)

    let documents: [String: DocumentsDataModel] = ["test-key": model]

    let archiver = DocumentsArchiver()
    let encoded = archiver.encode(documents)
    XCTAssertNotNil(encoded, "Encoding should succeed")

    let decoded = try archiver.decode(from: XCTUnwrap(encoded))
    XCTAssertNotNil(decoded, "Decoding should succeed")
    XCTAssertEqual(decoded?.count, 1)

    let decodedModel = decoded?["test-key"]
    XCTAssertNotNil(decodedModel)
    XCTAssertNotNil(decodedModel?.firstId)
    XCTAssertEqual(decodedModel?.firstId?.evidenceType?.evidenceType, "passport")
    XCTAssertEqual(decodedModel?.firstId?.evidenceType?.hasPhoto, true)
    XCTAssertEqual(decodedModel?.firstId?.evidenceDetails?.documentNumber, "AB123456")
    XCTAssertEqual(decodedModel?.firstId?.evidenceDetails?.namesMatching, true)
    XCTAssertNil(decodedModel?.secondId)
  }

  func testDocumentsArchiverWithBarcodeData() throws {
    let barcode = BarcodeData(value: ["format": "PDF417", "data": "test-barcode-data"])

    let evidence = EvidenceModel(
      evidenceDetails: nil,
      evidencePhotos: nil,
      evidenceType: nil,
      barcodeData: [barcode]
    )

    let model = DocumentsDataModel(firstId: evidence, secondId: nil)

    let documents: [String: DocumentsDataModel] = ["barcode-test": model]
    let archiver = DocumentsArchiver()

    let encoded = archiver.encode(documents)
    XCTAssertNotNil(encoded)

    let decoded = try archiver.decode(from: XCTUnwrap(encoded))
    let decodedBarcodes = decoded?["barcode-test"]?.firstId?.barcodeData
    XCTAssertNotNil(decodedBarcodes)
    XCTAssertEqual(decodedBarcodes?.first?.value?["format"], "PDF417")
    XCTAssertEqual(decodedBarcodes?.first?.value?["data"], "test-barcode-data")
  }

  func testDocumentsArchiverEmptyDictionary() throws {
    let documents: [String: DocumentsDataModel] = [:]
    let archiver = DocumentsArchiver()

    let encoded = archiver.encode(documents)
    XCTAssertNotNil(encoded)

    let decoded = try archiver.decode(from: XCTUnwrap(encoded))
    XCTAssertNotNil(decoded)
    XCTAssertEqual(decoded?.count, 0)
  }
}

// MARK: - ClientMetadataModel Archiving Tests

final class ClientMetadataArchiverTests: XCTestCase {
  func testClientMetadataEncodeDecodeRoundTrip() throws {
    let client = MetadataClients(
      clientId: "client-123",
      clientName: "Test Client",
      bookmarked: true,
      dateAdded: Date(timeIntervalSince1970: 1_690_000_000),
      lastUsed: Date(timeIntervalSince1970: 1_700_000_000),
      clientUri: "https://example.com",
      serviceListingSortOrder: 5,
      suppressConfirmationInfo: true,
      applicationType: "native"
    )

    let model = ClientMetadataResponseModel(clients: [client])

    let archiver = ClientMetadataArchiver()
    let encoded = archiver.encode(model)
    XCTAssertNotNil(encoded, "Encoding should succeed")

    let decoded = try archiver.decode(from: XCTUnwrap(encoded))
    XCTAssertNotNil(decoded, "Decoding should succeed")
    XCTAssertEqual(decoded?.clients?.count, 1)

    let decodedClient = decoded?.clients?.first
    XCTAssertEqual(decodedClient?.clientId, "client-123")
    XCTAssertEqual(decodedClient?.clientName, "Test Client")
    XCTAssertEqual(decodedClient?.applicationType, "native")
    XCTAssertEqual(decodedClient?.clientUri, "https://example.com")
    XCTAssertEqual(decodedClient?.bookmarked, true)
    XCTAssertEqual(decodedClient?.serviceListingSortOrder, 5)
    XCTAssertEqual(decodedClient?.suppressConfirmationInfo, true)
  }

  func testClientMetadataMultipleClients() throws {
    let client1 = MetadataClients(clientId: "c1", clientName: "Client One")
    let client2 = MetadataClients(clientId: "c2", clientName: "Client Two", bookmarked: true)

    let model = ClientMetadataResponseModel(clients: [client1, client2])

    let archiver = ClientMetadataArchiver()
    let encoded = archiver.encode(model)
    let decoded = try archiver.decode(from: XCTUnwrap(encoded))

    XCTAssertEqual(decoded?.clients?.count, 2)
    XCTAssertEqual(decoded?.clients?[0].clientId, "c1")
    XCTAssertEqual(decoded?.clients?[1].clientId, "c2")
    XCTAssertEqual(decoded?.clients?[1].bookmarked, true)
  }

  func testClientMetadataEmptyClients() throws {
    let model = ClientMetadataResponseModel(clients: [])

    let archiver = ClientMetadataArchiver()
    let encoded = archiver.encode(model)
    XCTAssertNotNil(encoded)

    let decoded = try archiver.decode(from: XCTUnwrap(encoded))
    XCTAssertNotNil(decoded)
    XCTAssertEqual(decoded?.clients?.count, 0)
  }
}
