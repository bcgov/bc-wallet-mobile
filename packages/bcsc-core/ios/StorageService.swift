//
//  Storable.swift
//  bc-services-card
//

import Foundation

let defaultSearchPathDirectory = FileManager.SearchPathDirectory.applicationSupportDirectory
let testSearchPathDirectory = FileManager.SearchPathDirectory.cachesDirectory

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
                .appendingPathComponent("account_list")
            
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
}
