---
name: bcsc-core-native-testing
description: 'Create native unit tests for Swift (iOS) and Kotlin (Android) code in the bcsc-core package. USE WHEN: testing native code, adding unit tests for native modules, writing XCTest or JUnit tests for bcsc-core, mocking native protocols or interfaces. DO NOT USE FOR: TypeScript/React tests, UI integration tests, or E2E tests.'
metadata:
  tags: testing, swift, kotlin, xctest, junit, native-modules, bcsc-core
---

# bcsc-core Native Unit Testing

## Overview

This skill guides creation of native unit tests for the `packages/bcsc-core` module, which contains Swift (iOS) and Kotlin (Android) implementations of authentication, PIN management, keychain storage, token services, and device authentication.

The codebase already uses **protocol-based dependency injection** on iOS and **interface/class-based injection** on Android, making it straightforward to create mock implementations for isolated unit testing.

## Test Infrastructure

### iOS — XCTest via SPM

Tests are built with Swift Package Manager using the package manifest at `packages/bcsc-core/Package.swift`. The key concepts:

- **`BcscCoreTestable` target**: A subset of production iOS source files compiled for the simulator (without React Native / CocoaPods dependencies). Only files listed in the `sources:` array are included.
- **`BcscCoreTests` test target**: XCTest files under `ios/BcscCoreTests/`, compiled with `@testable import BcscCoreTestable`.
- **`SPM_BUILD` flag**: A Swift compiler define set in `Package.swift` via `swiftSettings: [.define("SPM_BUILD")]`. The file `ios/SPMCompat.swift` uses `#if SPM_BUILD` to provide lightweight stubs (e.g., `SecureRandom`, `Data.arrayOfBytes()`) for types from JWE files that aren't included in the SPM target.
- **Scheme name**: xcodebuild uses `BcscCoreTests-Package` (SPM auto-appends `-Package`).

#### Adding a new iOS source file to the test target

If the code under test references types in a file not yet in `Package.swift`, add it to the `sources:` array in the `BcscCoreTestable` target. If that file depends on types from excluded files (e.g., JWE/crypto), add stubs to `SPMCompat.swift` behind `#if SPM_BUILD`.

#### Adding a new iOS test file

1. Create a new `.swift` file in `ios/BcscCoreTests/`.
2. Import frameworks and the testable module:
   ```swift
   import LocalAuthentication  // if testing LAPolicy/biometric types
   import XCTest
   @testable import BcscCoreTestable
   ```
3. Write `XCTestCase` subclasses. Follow the naming convention `{ClassUnderTest}Tests`.
4. Run with `yarn test:ios` or directly:
   ```sh
   xcodebuild test -scheme BcscCoreTests-Package \
     -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
     -skipPackagePluginValidation
   ```

### Android — JUnit 4 + MockK

Tests live under `android/src/test/java/com/bcsccore/` mirroring the main source package structure.

#### Dependencies (in `android/build.gradle`)

```groovy
testImplementation 'junit:junit:4.13.2'
testImplementation 'io.mockk:mockk:1.13.8'
testImplementation 'org.robolectric:robolectric:4.11.1'
testImplementation 'androidx.test:core:1.5.0'
```

#### Adding a new Android test file

1. Create a Kotlin file in `android/src/test/java/com/bcsccore/{subpackage}/`, matching the source package.
2. Write standard JUnit 4 test classes with `@Test` methods.
3. Use `io.mockk.mockk<T>()` and `every { ... } returns ...` for mocking.
4. Run with `yarn test:android` or directly:
   ```sh
   cd android && ./gradlew test
   ```

### Running all tests

```sh
yarn test          # runs test:ios then test:android
yarn test:ios      # iOS only
yarn test:android  # Android only
```

## Mocking Strategy

### iOS — Protocol Conformance

The codebase defines protocols for all service boundaries. Create mock classes that conform to the protocol and expose controllable properties:

```swift
final class MockPINKeychainService: PINKeychainServiceProtocol {
    var storedSecrets: [String: PINSecret] = [:]  // seed state, and check side effects
    var storeResult: PINKeychainServiceError?     // control return value
    var deleteResult: PINKeychainServiceError?

    func storeSecret(_ secret: PINSecret) -> PINKeychainServiceError? {
        storedSecrets[secret.id] = secret
        return storeResult
    }

    func getSecret(_ id: String) -> PINSecret? {
        return storedSecrets[id]
    }

    func deleteSecret(_ id: String) -> PINKeychainServiceError? {
        storedSecrets.removeValue(forKey: id)
        return deleteResult
    }
}
```

**Pattern**: Use `var resultProperty` for controlling return values, and state the mock keeps (or a `var methodCalled = false` boolean) for verifying side effects.

#### Available iOS protocols for mocking

| Protocol                      | File                         | Purpose                    |
| ----------------------------- | ---------------------------- | -------------------------- |
| `PINServiceProtocol`          | `PINServiceProtocol.swift`   | PIN set/verify/delete/hash |
| `PINKeychainServiceProtocol`  | `PINKeychainService.swift`   | Keychain secret storage    |
| `PINCryptoPolicyProtocol`     | `PINCryptoPolicy.swift`      | Salt/key/iteration config  |
| `CommonCryptoWrapperProtocol` | `CommonCryptoWrapper.swift`  | PBKDF2 key derivation      |
| `LAContextProtocol`           | `LAContext+Extensions.swift` | Biometric evaluation       |
| `DeviceAuthServiceProtocol`   | `DeviceAuthService.swift`    | Device authentication      |
| `TokenStorageServiceProtocol` | `TokenService.swift`         | Token keychain storage     |
| `KeyPairManagerProtocol`      | `KeyPairManager.swift`       | Cryptographic key pairs    |

### Android — MockK

Use MockK's `mockk<T>()` for mocking classes and interfaces. Module methods are tested through `BcscCoreModule` itself under Robolectric: mock the React context over a temporary files directory, call the method, and assert on the promise (see `BcscCoreModuleSecurityMethodTest.kt`):

```kotlin
val context = mockk<ReactApplicationContext>(relaxed = true)
every { context.filesDir } returns tempFolder.root // empty: no stored account
val promise = mockk<Promise>(relaxed = true)

BcscCoreModule(context).getAccountSecurityMethod(promise)

verify(exactly = 1) { promise.reject("E_ACCOUNT_NOT_FOUND", "Account not found") }
verify(exactly = 0) { promise.resolve(any()) }
```

To give the module stored data, write plain JSON into the files directory; the storage reads plain JSON without the keystore (see `BcscCoreModuleV3RetirementTest.kt`).

Robolectric has no Android keystore, so a collaborator that needs one (`PinService`, `AESEncryptor`) is stood in for with `mockkConstructor` (see `BcscCoreModuleVerifyPinTest.kt`):

```kotlin
mockkConstructor(PinService::class)
every { anyConstructed<PinService>().validatePINReturningHash(any(), any()) } returns Pair(true, "hash")
```

Undo it in `@After` with `unmockkConstructor`.

For data classes (e.g., `NativeAccount`), test serialization round-trips with Gson directly — no mocking needed.

## Test Patterns

### NSCoding / Serialization round-trips

**iOS** — Use `NSKeyedArchiver` / `NSKeyedUnarchiver`:

```swift
let data = try NSKeyedArchiver.archivedData(withRootObject: original, requiringSecureCoding: true)
let decoded = try NSKeyedUnarchiver.unarchivedObject(ofClass: Account.self, from: data)
XCTAssertEqual(decoded?.id, original.id)
```

**Android** — Use Gson:

```kotlin
val json = gson.toJson(original)
val restored = gson.fromJson(json, NativeAccount::class.java)
assertEquals(original.uuid, restored.uuid)
```

### Test naming conventions

**iOS**: `test{Behavior}` in camelCase — e.g., `testHasPINSetupReturnsFalseForDeviceAuth`
**Android**: Backtick-quoted descriptive names — e.g., `` `verifyPIN resolves only success false for a wrong PIN` ``

## Checklist for adding tests

- [ ] Identify the class/struct to test and which platform(s)
- [ ] Check if the source file is already in `Package.swift` `sources:` (iOS) — add if missing
- [ ] Check if new dependencies need stubs in `SPMCompat.swift` (iOS)
- [ ] Create mock(s) for any protocol/interface dependencies
- [ ] Place test file in `ios/BcscCoreTests/` or `android/src/test/java/com/bcsccore/{subpackage}/`
- [ ] For time-dependent logic, use injectable timestamps rather than `Date()` / `System.currentTimeMillis()`
- [ ] Run `yarn test` and verify all tests pass on both platforms
