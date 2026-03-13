# Local App Binaries

Place local builds here for running E2E tests against simulators and emulators. All files in this directory are gitignored except this README.

## iOS Simulator Build

```bash
cd app/ios
xcodebuild -workspace BCWallet.xcworkspace \
  -scheme BCSC -configuration Debug \
  -sdk iphonesimulator -derivedDataPath build
cp -r build/Build/Products/Debug-iphonesimulator/BCSC.app ../../e2e/apps/
```

## Android Emulator Build

```bash
cd app/android
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../../e2e/apps/BCSC.apk
```

## Expected Filenames

The WDIO configs look for these filenames by default (override via env vars):

| Platform | Default filename | Env var override |
|---|---|---|
| iOS | `BCSC.app` | `IOS_APP` |
| Android | `BCSC.apk` | `ANDROID_APP` |
