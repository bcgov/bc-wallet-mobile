//
//  Storable.swift
//  bc-services-card
//

import Foundation

let defaultSearchPathDirectory = FileManager.SearchPathDirectory.applicationSupportDirectory
let testSearchPathDirectory = FileManager.SearchPathDirectory.cachesDirectory

// URL components for files
let accountListURLComponent = "account_list"
let metadataURLComponent = "metadata"

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
    var currentBundleID: String {
        return Bundle.main.bundleIdentifier ?? "ca.bc.gov.id.servicescard"
    }
    var currentEnvName: String {
        switch currentBundleID {
        case "ca.bc.gov.id.servicescard":
            return "PROD"
        case "ca.bc.gov.iddev.servicescard":
            return "SIT"
        default:
            // Fallback to SIT or handle as an
            // error/unknown state
            return "SIT"
        }
    }
    // NOTE: While the system reads an 'accounts' array from the account_list file,
    // and could theoretically support multiple accounts, the current implementation
    // only uses the *first* account ID found. For current practical purposes,
    // there should only be one account ID present in the 'accounts' array.
    var currentAccountID: String? {
        let pathDirectory = defaultSearchPathDirectory
        
        do {
            let rootDirectoryURL = try FileManager.default.url(for: pathDirectory,
                                                                 in: .userDomainMask,
                                                                 appropriateFor: nil,
                                                                 create: false)
            let accountListFileUrl = rootDirectoryURL
                .appendingPathComponent(self.basePath)
                .appendingPathComponent(accountListURLComponent)
            
            guard FileManager.default.fileExists(atPath: accountListFileUrl.path) else {
                print("StorageService: Error - account_list file does not exist at \(accountListFileUrl.path).")
                return nil
            }
            
            let data = try Data(contentsOf: accountListFileUrl)
            
            if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
               let accounts = json["accounts"] as? [String],
               let firstAccountID = accounts.first, !firstAccountID.isEmpty {
                // print("StorageService: Successfully loaded account ID \(firstAccountID) from account_list.")
                return firstAccountID
            } else {
                print("StorageService: Error - Failed to parse account_list JSON or accounts array is empty/first ID is empty.")
                return nil
            }
        } catch {
            print("StorageService: Error - Could not access or read account_list: \(error).")
            return nil
        }
    }
    var basePath: String {
        return "\(currentBundleID)/data/accounts_dir/\(currentEnvName)"
    }
    var provider = "https://idsit.gov.bc.ca/device/"
    
    func decodeArchivedObject<T: NSObject & NSSecureCoding>(
        from data: Data,
        moduleName: String = "bc_services_card_dev"
    ) throws -> T? {
        let className = String(describing: T.self)
        
        // Skip class registration if the expected type is NSDictionary
        if T.self != NSDictionary.self {
            let archivedClassName = "\(moduleName).\(className)"
            NSKeyedUnarchiver.setClass(T.self, forClassName: archivedClassName)
            print("Decoding classx: \(archivedClassName)")
        } else {
            print("Skipping class registration for NSDictionary")
        }
        
        let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
        unarchiver.requiresSecureCoding = false
    
        let decoded = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)

        if T.self != NSDictionary.self {
            if let decodedDict = decoded as? [String: T] {
                return decodedDict[provider]
            }
            return nil
        } else {
            return decoded as? T
        }
    }
    
    func readData<T: NSObject & NSCoding & NSSecureCoding>(file: AccountFiles, pathDirectory: FileManager.SearchPathDirectory) -> T? { // Added file parameter
        do {
            guard let accountID = self.currentAccountID else {
                print("StorageService: Error - currentAccountID is nil. Cannot read data.")
                return nil
            }
            let rootDirectoryURL = try FileManager.default.url(for: pathDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
            let fileUrl = rootDirectoryURL
                .appendingPathComponent(self.basePath)
                .appendingPathComponent(accountID) // Use unwrapped accountID
                .appendingPathComponent(file.rawValue)
            
            
            guard (FileManager.default.fileExists(atPath: fileUrl.path)) else {
                return nil
            }
            
            let accessGranted = fileUrl.startAccessingSecurityScopedResource()
            
            defer {
                if accessGranted {
                    fileUrl.stopAccessingSecurityScopedResource()
                }
            }
            
            let data = try Data(contentsOf: fileUrl)
            print("Data read from file: \(data)")
            
            if let obj: T = try? decodeArchivedObject(from: data) {
                print("Decoded object: \(obj)")
                return obj
            }
            
            print("Failed to decode object from data.")
            
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
            // Ensure account structure exists before writing
            try createAccountStructureIfRequired()
            
            // Mock implementation - doesn't actually write data yet
            print("StorageService: writeData called for file: \(file.rawValue) with data: \(data)")
            return true
        } catch {
            print("StorageService: Error creating account structure: \(error)")
            return false
        }
    }

    // Mark: - Directories

    private func createAccountStructureIfRequired() throws {
        // Generate a new UUID for the account
        let newAccountID = UUID().uuidString
        let rootDirectoryURL = try FileManager.default.url(for: defaultSearchPathDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
        let baseURL = rootDirectoryURL.appendingPathComponent(self.basePath)
        let accountListPath = baseURL.appendingPathComponent(accountListURLComponent)
        
        // Check if the account_list file already exists
        guard !FileManager.default.fileExists(atPath: accountListPath.path) else {
            print("StorageService: account_list file already exists at \(accountListPath.path)")
            return
        }
        
        // Create the account list structure with new UUID
        let accountListData: [String: Any] = [
            "accounts": [newAccountID],
            "current": newAccountID
        ]
        
        // Convert to JSON data and write to file
        let jsonData = try JSONSerialization.data(withJSONObject: accountListData, options: [])
        try jsonData.write(to: accountListPath)
        
        // Create directory with newAccountID as name if it doesn't exist
        let accountDirectory = baseURL.appendingPathComponent(newAccountID)
        if !FileManager.default.fileExists(atPath: accountDirectory.path) {
            try FileManager.default.createDirectory(at: accountDirectory, withIntermediateDirectories: true, attributes: nil)
            print("StorageService: Created account directory at \(accountDirectory.path)")
        } else {
            print("StorageService: Account directory already exists at \(accountDirectory.path)")
        }
    }

    // private func createMetadataFile(parent: URL) throws {
    //     let data = MultipleAccountMetadata(envNames: AppConfig.envNames, envIssuers: AppConfig.envIssuers, currentIssuer: Defaults.selectedEnvironment)
    //     var path = parent.appendingPathComponent(metadataURLComponent)
    //     try writeCodableData(to: &path, data: data)
    // }

    // private func writeCodableData<T: Encodable>(to url: inout URL, data: T) throws {
    //     let encoded = try JSONEncoder().encode(data)
    //     try encoded.localWrite(to: &url)
    // }

    

    // private func createEnvironmentsDirectories(parent: URL) throws {
    //     // Create sub-directories for environments
    //     // named by issuer
    //     try AppConfig.envNames.forEach { env in
    //         let envPath = parent.appendingPathComponent(env)
    //         if !FileManager.default.fileExists(atPath: envPath.relativePath) {
    //             try FileManager.default.createDirectory(at: envPath, withIntermediateDirectories: false)
                
    //             try createAccountStructure()
    //         }
    //     }
    // }

    // private func getDataDirectory(pathDirectory: FileManager.SearchPathDirectory,
    //                       create: Bool = false) throws -> URL {
    //     let bundleID: String
    //     if let identifier = Bundle.main.bundleIdentifier {
    //         bundleID =  identifier
    //     } else {
    //         bundleID = "ca.bc.gov.id.servicescard"
    //     }
        
    //     let appSupportDir = try FileManager.default.url(for: pathDirectory, in: .userDomainMask, appropriateFor: nil, create: create)
    //     let dataDirectory = appSupportDir.appendingPathComponent(bundleID).appendingPathComponent("data")
    //     if(create) {
    //         try FileManager.default.createDirectory(at: dataDirectory, withIntermediateDirectories: true, attributes: nil)
    //     }
    //     return dataDirectory
    // }

    // private func getMultipleAccountDirectory(pathDirectory: FileManager.SearchPathDirectory) throws -> URL {
    //     return try getDataDirectory(pathDirectory: pathDirectory).appendingPathComponent("accounts_dir")
    // }

    // private func createMultipleAccountDirectory(pathDirectory: FileManager.SearchPathDirectory = defaultSearchPathDirectory) throws {
    //     let path = try getMultipleAccountDirectory(pathDirectory: pathDirectory)
    //     if FileManager.default.fileExists(atPath: path.relativePath) {
    //         throw MultipleAccountError.directoryAlreadyExisted
    //     } else {
    //         try FileManager.default.createDirectory(at: path, withIntermediateDirectories: true)
    //         try createEnvironmentsDirectories(parent: path)
    //         try createMetadataFile(parent: path)
    //     }
    // }
}
