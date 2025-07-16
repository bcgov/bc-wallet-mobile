# BC Services Card Key Pair Repository Port

This directory contains the essential files needed to port the BC Services Card Android KeyPair signing functionality to a new project.

## Overview

The BC Services Card app uses Android KeyStore to securely generate, store, and use RSA key pairs for:

- JWT signing (RS512 algorithm)
- Client assertion signing for OAuth flows
- Device attestation signing

## Key Components

### Core Interfaces

- `BcscKeyPairSource.java` - Main interface for key pair operations
- `KeyPairInfoSource.java` - Interface for key pair metadata storage

### Core Models

- `BcscKeyPair.java` - Wrapper for KeyPair + metadata
- `KeyPairInfo.java` - Metadata about key pairs (alias, creation time)

### Core Exceptions

- `BcscException.java` - Base exception class
- `KeypairGenerationException.java` - Specific exception for key generation errors
- `AlertKey.java` - Enumeration of error codes

### Repositories

- `BcscKeyPairRepo.java` - Main implementation using Android KeyStore
- `SimpleKeyPairInfoSource.java` - Simplified key pair metadata storage

### Utilities

- `SimpleLog.java` - Basic logging utility (replacement for complex Log class)

## Dependencies Required

Add these to your `build.gradle`:

```gradle
dependencies {
    // Nimbus JOSE library for JWT operations
    implementation 'com.nimbusds:nimbus-jose-jwt:9.37.3'

    // Android annotations
    implementation 'androidx.annotation:annotation:1.7.0'
}
```

## Usage Example

See `example/simplified/KeyPairExample.java` for a complete usage example.

## Important Notes

### Android KeyStore Limitations

- **App-specific keys**: Keys generated in one app cannot be accessed by another app
- **Installation-specific**: Keys are tied to the specific app installation
- **Certificate binding**: Keys are bound to the app's signing certificate

### Porting Considerations

1. **Keys won't transfer**: Users will need to regenerate keys in the new app
2. **Package changes**: Files use `com.bcsccore.keypair` package structure - update if needed
3. **Dependencies**: Implement or replace the storage and logging dependencies
4. **Error handling**: Adapt the AlertKey enum to your error handling system

## Files Organization

```
bcsc-keypair-port/
├── README.md                           # This file
├── core/
│   ├── interfaces/
│   │   ├── BcscKeyPairSource.java     # Main key pair interface
│   │   └── KeyPairInfoSource.java     # Key pair metadata interface
│   ├── models/
│   │   ├── BcscKeyPair.java           # Key pair wrapper
│   │   └── KeyPairInfo.java           # Key pair metadata
│   ├── exceptions/
│   │   ├── BcscException.java         # Base exception
│   │   ├── KeypairGenerationException.java
│   │   └── AlertKey.java              # Error codes
│   └── utils/
│       └── SimpleLog.java             # Basic logging
├── repos/
│   ├── key/
│   │   └── BcscKeyPairRepo.java       # Main Android KeyStore implementation
│   └── keypairinfo/
│       └── SimpleKeyPairInfoSource.java  # Simplified metadata storage
└── example/
    └── simplified/
        └── KeyPairExample.java        # Usage example
```

## Migration Steps

1. Copy these files to your project
2. Update package names throughout
3. Add required dependencies to `build.gradle`
4. Implement or replace storage dependencies
5. Test key generation and signing functionality
6. Handle key migration from previous apps (if needed)
