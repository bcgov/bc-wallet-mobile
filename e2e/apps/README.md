# Local App Binaries

Place local builds here for running E2E tests against simulators and emulators. All files in this directory are gitignored except this README.

## iOS Simulator Build

```bash
cd app/ios
xcodebuild -workspace BCWallet.xcworkspace \
  -scheme BCWallet -configuration Debug \
  -sdk iphonesimulator -derivedDataPath build
cp -r build/Build/Products/Debug-iphonesimulator/BCWallet.app ../../e2e/apps/
```

## Android Emulator Build

```bash
cd app/android
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../../e2e/apps/BCWallet.apk
```

## Expected Filenames

The WDIO configs look for these filenames by default (override via env vars):

| Platform | Default filename | Env var override |
|---|---|---|
| iOS | `BCWallet.app` | `IOS_APP` |
| Android | `BCWallet.apk` | `ANDROID_APP` |
