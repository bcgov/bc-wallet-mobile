//
//  Storable.swift
//  bc-services-card
//

import Foundation

let defaultSearchPathDirectory = FileManager.SearchPathDirectory.applicationSupportDirectory
let testSearchPathDirectory = FileManager.SearchPathDirectory.cachesDirectory

// Available files in the `basePath` directory:
// account_list
// Available files in the `accountID` directory:
// provider
// account_flag
// account_metadata
// authorization_request
// client_metadata
// client_registration
// device_info
// documents
// evidence_metadata
// provider

class Storable {
    var accountListFileName: String {
        return "account_list"
    }
    var accountMetadataFileName: String {
        return "account_metadata"
    }
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
            // Fallback to SIT or handle as an error/unknown state
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

        let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
        unarchiver.requiresSecureCoding = false

        let decoded = try unarchiver.decodeTopLevelObject(forKey: NSKeyedArchiveRootObjectKey)
        return decoded as? [String: T]
    }
    
    func readData<T: NSObject & NSCoding & NSSecureCoding>(pathDirectory: FileManager.SearchPathDirectory) -> T? {
         do {
             let rootDirectoryURL = try FileManager.default.url(for: pathDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
             let fileUrl = rootDirectoryURL
                 .appendingPathComponent(self.basePath)
                 .appendingPathComponent(self.currentAccountID)
                 .appendingPathComponent(self.accountMetadataFileName)
          
  
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
             if let obj: [String: T] = try? decodeArchivedObject(from: data) {
                 return obj[provider]
             }
             
             return nil
         } catch {
             return nil
         }
    }
}
