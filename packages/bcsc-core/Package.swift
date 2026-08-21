// swift-tools-version:5.9

import PackageDescription

let package = Package(
    name: "BcscCoreTests",
    platforms: [.iOS(.v15)],
    targets: [
        .target(
            name: "BcscCoreTestable",
            path: "ios",
            exclude: [
                "BcscCoreTests",
            ],
            sources: [
                "Account.swift",
                "AccountSecurityMethod.swift",
                "AuthorizationRequest.swift",
                "Base64URL.swift",
                "ClientMetadataModel.swift",
                "ClientRegistration.swift",
                "CommonCryptoWrapper.swift",
                "Credential.swift",
                "Data.swift",
                "DocumentsDataModel.swift",
                "JWK.swift",
                "KeychainClearingService.swift",
                "KeyPairManager.swift",
                "LAContext+Extensions.swift",
                "Logger.swift",
                "PINCryptoPolicy.swift",
                "PINKeychainService.swift",
                "PINSecret.swift",
                "PINService.swift",
                "PINServiceProtocol.swift",
                "Provider.swift",
                "RSAUtil.swift",
                "SPMCompat.swift",
                "StorageService.swift",
                "Token.swift",
            ],
            swiftSettings: [.define("SPM_BUILD")]
        ),
        .testTarget(
            name: "BcscCoreTests",
            dependencies: ["BcscCoreTestable"],
            path: "ios/BcscCoreTests"
        ),
    ]
)
