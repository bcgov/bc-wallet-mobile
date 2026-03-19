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

For a **physical iPhone** the local device config expects an **`.ipa`** (signed archive), not the simulator `.app`. Build for `iphoneos` and export to IPA.

**Option A — Xcode GUI:**  
Product → Archive, then Distribute App → Development, and export the `.ipa`. Copy it to `e2e/apps/BCWallet.ipa`.

**Option B — Command line (automated):**  
One-time: copy the export-options template and set your Apple Team ID (same as `XCODE_ORG_ID` for WDIO):

```bash
cp e2e/apps/ExportOptions.dev.plist.example app/ios/ExportOptions.dev.plist
# Edit app/ios/ExportOptions.dev.plist and replace YOUR_TEAM_ID with your team ID.
```

Then from the repo root:

```bash
cd app/ios

# 1) Create an archive (signed for a generic iOS device)
xcodebuild -workspace BCWallet.xcworkspace \
  -scheme BCWallet -configuration Debug \
  -sdk iphoneos -destination 'generic/platform=iOS' \
  -archivePath build/BCWallet.xcarchive \
  archive

# 2) Export the archive to an .ipa (Optional: you can use the GoogleService-Info.plist file to export the archive)
xcodebuild -exportArchive \
  -archivePath build/BCWallet.xcarchive \
  -exportOptionsPlist ExportOptions.dev.plist \
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
