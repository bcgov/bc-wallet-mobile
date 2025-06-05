import Foundation

class Provider: NSObject, NSSecureCoding {
    static var supportsSecureCoding = true

    var jwksURI: String?
    var multipleAccountsSupported: Bool = false
    var clientMetadataEndpoint: String?
    var pairDeviceWithQRCodeSupported: Bool = false
    // var jwks: [JWK] = []
    var authorizationEndpoint: String?
    var maximumAccountsPerDevice: Int = 0
    var oidcConfiguration: [String: Any] = [:]
    var tokenEndpoint: String?
    var userInfoEndpoint: String?
    var issuer: String?
    var savedServicesEndpoint: String?
    var fetchedAt: Date?
    var registrationEndpoint: String?
    var credentialEndpoint: String?
    var attestationEndpoint: String?
    var credentialFlowsSupported: [String] = []
    var deviceAuthEndpoint: String?
    var allowedIdentificationProcesses: [String] = []

    required init?(coder: NSCoder) {
        jwksURI = coder.decodeObject(forKey: .jwksURI) as? String
        multipleAccountsSupported = coder.decodeBool(forKey: .multipleAccountsSupported)
        clientMetadataEndpoint = coder.decodeObject(forKey: .clientMetadataEndpoint) as? String
        pairDeviceWithQRCodeSupported = coder.decodeBool(forKey: .pairDeviceWithQRCodeSupported)
        // jwks = coder.decodeObject(of: [NSArray.self, JWK.self], forKey: .jwks) as? [JWK] ?? []
        authorizationEndpoint = coder.decodeObject(forKey: .authorizationEndpoint) as? String
        maximumAccountsPerDevice = coder.decodeInteger(forKey: .maximumAccountsPerDevice)
        oidcConfiguration = coder.decodeObject(forKey: .oidcConfiguration) as? [String: Any] ?? [:]
        tokenEndpoint = coder.decodeObject(forKey: .tokenEndpoint) as? String
        userInfoEndpoint = coder.decodeObject(forKey: .userInfoEndpoint) as? String
        issuer = coder.decodeObject(forKey: .issuer) as? String
        savedServicesEndpoint = coder.decodeObject(forKey: .savedServicesEndpoint) as? String
        fetchedAt = coder.decodeObject(forKey: .fetchedAt) as? Date
        registrationEndpoint = coder.decodeObject(forKey: .registrationEndpoint) as? String
        credentialEndpoint = coder.decodeObject(forKey: .credentialEndpoint) as? String
        attestationEndpoint = coder.decodeObject(forKey: .attestationEndpoint) as? String
        credentialFlowsSupported = coder.decodeObject(forKey: .credentialFlowsSupported) as? [String] ?? []
        deviceAuthEndpoint = coder.decodeObject(forKey: .deviceAuthEndpoint) as? String
        allowedIdentificationProcesses = coder.decodeObject(forKey: .allowedIdentificationProcesses) as? [String] ?? []
    }

    func encode(with coder: NSCoder) {
        coder.encode(jwksURI, forKey: .jwksURI)
        coder.encode(multipleAccountsSupported, forKey: .multipleAccountsSupported)
        coder.encode(clientMetadataEndpoint, forKey: .clientMetadataEndpoint)
        coder.encode(pairDeviceWithQRCodeSupported, forKey: .pairDeviceWithQRCodeSupported)
        // coder.encode(jwks, forKey: .jwks)
        coder.encode(authorizationEndpoint, forKey: .authorizationEndpoint)
        coder.encode(maximumAccountsPerDevice, forKey: .maximumAccountsPerDevice)
        coder.encode(oidcConfiguration, forKey: .oidcConfiguration)
        coder.encode(tokenEndpoint, forKey: .tokenEndpoint)
        coder.encode(userInfoEndpoint, forKey: .userInfoEndpoint)
        coder.encode(issuer, forKey: .issuer)
        coder.encode(savedServicesEndpoint, forKey: .savedServicesEndpoint)
        coder.encode(fetchedAt, forKey: .fetchedAt)
        coder.encode(registrationEndpoint, forKey: .registrationEndpoint)
        coder.encode(credentialEndpoint, forKey: .credentialEndpoint)
        coder.encode(attestationEndpoint, forKey: .attestationEndpoint)
        coder.encode(credentialFlowsSupported, forKey: .credentialFlowsSupported)
        coder.encode(deviceAuthEndpoint, forKey: .deviceAuthEndpoint)
        coder.encode(allowedIdentificationProcesses, forKey: .allowedIdentificationProcesses)
    }
}

//MARK: - Provider Keys
fileprivate extension String {
    static let jwksURI = "jwksURI"
    static let multipleAccountsSupported = "multiple_accounts_supported"
    static let clientMetadataEndpoint = "client_metadata_endpoint"
    static let pairDeviceWithQRCodeSupported = "pair_device_with_qrcode_supported"
    // static let jwks = "jwks"
    static let authorizationEndpoint = "authorizationEndpoint"
    static let maximumAccountsPerDevice = "maximum_accounts_per_device"
    static let oidcConfiguration = "oidcConfiguration"
    static let tokenEndpoint = "tokenEndpoint"
    static let userInfoEndpoint = "userInfoEndpoint"
    static let issuer = "issuer"
    static let savedServicesEndpoint = "saved_services_endpoint"
    static let fetchedAt = "fetchedAt"
    static let registrationEndpoint = "registrationEndpoint"
    static let credentialEndpoint = "credential_endpoint"
    static let attestationEndpoint = "attestation_endpoint"
    static let credentialFlowsSupported = "credential_flows_supported"
    static let deviceAuthEndpoint = "deviceAuthEndpoint"
    static let allowedIdentificationProcesses = "allowed_identification_processes"
}