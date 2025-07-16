# PORTING_GUIDE.md

## Quick Start Guide for Porting BC Services Card KeyPair Functionality

### 1. Copy Files to Your Project

Copy all files from this directory to your Android project, updating package names throughout.

### 2. Update Package Names (Optional)

The files are already configured with package name `com.bcsccore.keypair`. If you want to use a different package name, replace it in all files:

```bash
# Use find/replace in your IDE or command line:
find . -name "*.java" -exec sed -i 's/com\.bcsccore\.keypair/com.yourcompany.yourapp/g' {} \;
```

### 3. Add Dependencies

Add the required dependencies from `build.gradle.template` to your app's `build.gradle`.

### 4. Basic Usage

```java
// Initialize (typically in Application class or main activity)
KeyPairInfoSource keyPairInfoSource = new SimpleKeyPairInfoSource(context);
BcscKeyPairSource keyPairSource = new BcscKeyPairRepo(keyPairInfoSource);

// Sign a JWT (this is where attestation signing happens)
JWTClaimsSet claims = new JWTClaimsSet.Builder()
    .subject("user123")
    .issuer("your-app")
    .audience("target-service")
    .expirationTime(new Date(System.currentTimeMillis() + 300000))
    .build();

String signedJWT = keyPairSource.signAndSerializeClaimsSet(claims);
```

### 5. Key Signing Locations

The main signing happens in these methods:

1. **`BcscKeyPairRepo.signClaimsSet()`** - Core JWT signing with private key
2. **`BcscKeyPairRepo.signAndSerializeClaimsSet()`** - Sign and return JWT string

These are equivalent to the original BC Services Card signing functionality.

### 6. Important Notes

- **Keys are app-specific**: Keys generated in one app cannot be used by another
- **Hardware backing**: Keys are stored in Android's hardware security module when available
- **Key rotation**: Use `getNewBcscKeyPair()` to generate new keys periodically
- **Cleanup**: Use `cleanUpBcscKeyPairs()` to remove old keys

### 7. Error Handling

All operations can throw `BcscException`. Key error types:

- `ADD_CARD_KEYPAIR_GENERATION` - Key generation failed
- `ERR_207_UNABLE_TO_SIGN_CLAIMS_SET` - Signing operation failed
- `ERR_108_UNABLE_TO_DELETE_KEY_PAIR` - Key deletion failed

### 8. Production Considerations

For production use, consider:

- Encrypting stored key metadata
- Using Android EncryptedSharedPreferences instead of regular SharedPreferences
- Implementing proper key rotation policies
- Adding logging and monitoring
- Testing on various Android versions and devices

### 9. Testing

Test on:

- Different Android versions (API 23+)
- Devices with and without hardware security modules
- Key generation, signing, and cleanup operations
- Error scenarios (no storage space, corrupted data, etc.)

### 10. Migration from Existing Apps

If migrating from an existing app:

- Users will need to re-generate keys (keys cannot be transferred)
- Plan for a smooth transition in your authentication flow
- Consider implementing fallback mechanisms during migration
