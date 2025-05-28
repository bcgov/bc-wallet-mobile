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
    var currentAccountID: String {
        return "095E1E9A-A286-486E-A9B9-58B6E411BD0E"
    }
    var basePath: String {
        return "\(currentBundleID)/data/accounts_dir/\(currentEnvName)"
    }
    var provider = "https://idsit.gov.bc.ca/device/"
    
    func decodeArchivedObject<T: NSObject & NSSecureCoding>(
        from data: Data,
        moduleName: String = "bc_services_card_dev"
    ) throws -> [String: T]? {
        let className = String(describing: T.self)
        let archivedClassName = "\(moduleName).\(className)"

        // Register the dynamic class name
        NSKeyedUnarchiver.setClass(T.self, forClassName: archivedClassName)
        print("Decoding class: \(archivedClassName)")
        
        let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
        unarchiver.requiresSecureCoding = false

        let decoded = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)
        
        return decoded as? [String: T]
    }
    
    func readData<T: NSObject & NSCoding & NSSecureCoding>(file: AccountFiles, pathDirectory: FileManager.SearchPathDirectory) -> T? { // Added file parameter
         do {
             let rootDirectoryURL = try FileManager.default.url(for: pathDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
             let fileUrl = rootDirectoryURL
                 .appendingPathComponent(self.basePath)
                 .appendingPathComponent(self.currentAccountID)
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

             if let obj: [String: T] = try? decodeArchivedObject(from: data) {
                print("Decoded object: \(obj)")
                return obj[provider]
             }
             
             print("Failed to decode object from data.")
             
             return nil
         } catch {
             return nil
         }
    }
}
