# Local App Binaries

Place local builds here for running E2E tests against simulators, emulators, or real devices. All files in this directory are gitignored except this README.

## iOS Simulator Build

```bash
cd app/ios
xcodebuild -workspace BCWallet.xcworkspace \
  -scheme BCWallet -configuration Debug \
  -sdk iphonesimulator -derivedDataPath build
cp -r build/Build/Products/Debug-iphonesimulator/BCWallet.app ../../e2e/apps/
```

## iOS Real Device Build

For a **physical iPhone** the local device config expects an `.ipa` (signed archive), not the simulator `.app`. Build for `iphoneos` and export to IPA.

### Google Services Files

Obtain the following Firebase/Google services files from another developer and place them in the correct locations:

```
app/ios/GoogleService-Info.plist
```

### Build and Export

```bash
cd app/ios

# 1) Create an archive (signed for a generic iOS device)
xcodebuild -workspace BCWallet.xcworkspace \
  -scheme BCWallet -configuration Debug \
  -sdk iphoneos -destination 'generic/platform=iOS' \
  -archivePath build/BCWallet.xcarchive \
  archive

# 2) Export the archive to an .ipa
xcodebuild -exportArchive \
  -archivePath build/BCWallet.xcarchive \
  -exportOptionsPlist GoogleService-Info.plist \
  -exportPath build/export

# 3) Copy the .ipa into e2e/apps for WDIO
cp build/export/BCWallet.ipa ../../e2e/apps/
```

Real-device runs also need `IOS_UDID`, `XCODE_ORG_ID`, and optionally `XCODE_SIGNING_ID` (see e2e/README.md).

## Android Emulator or Real Device Build

The same debug APK runs on both emulator and a USB-connected device. Use the same build:

```bash
cd app/android
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../../e2e/apps/BCWallet.apk
```

## Expected Filenames

The WDIO configs look for these filenames by default (override via env vars):

| Target                  | Default filename | Env var override |
| ----------------------- | ---------------- | ---------------- |
| iOS Simulator           | `BCWallet.app`   | `IOS_APP`        |
| iOS Real Device         | `BCWallet.ipa`   | `IOS_APP`        |
| Android (emu or device) | `BCWallet.apk`   | `ANDROID_APP`    |
