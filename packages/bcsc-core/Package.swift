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
                "CommonCryptoWrapper.swift",
                "Data.swift",
                "DocumentsDataModel.swift",
                "JWK.swift",
                "KeyPairManager.swift",
                "LAContext+Extensions.swift",
                "Logger.swift",
                "PINCryptoPolicy.swift",
                "PINKeychainService.swift",
                "PINSecret.swift",
                "PINService.swift",
                "PINServiceProtocol.swift",
                "RSAUtil.swift",
                "SPMCompat.swift",
                "StorageService.swift",
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
