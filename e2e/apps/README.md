# Local App Binaries

Place app builds here for running the E2E suite against simulators, emulators, real devices, or Sauce Labs RDC. Everything in this directory is **gitignored except this README**.

The E2E suite drives the **BCSC** build (the `bcsc-*` variants), so the binaries are named `BCSC.*`. The WDIO configs look for the filenames in the [table below](#expected-filenames); override them with the listed env vars.

## Prerequisites (all builds)

1. **Install deps** from the repo root: `yarn install` (and `cd packages/bcsc-core && yarn build` if it hasn't been built).
2. **Apply the BCSC variant.** This brands/configures the app — display name, bundle id, and the backend environment it talks to. The E2E suite (device authorize + in-person SM approval) targets the **SIT / TEST** backend, so use `bcsc-test` (or `bcsc-dev`):
   ```bash
   node scripts/apply-variant.mjs bcsc-test    # from the repo root
   ```
   `bcsc-test` → iOS bundle id `ca.bc.gov.idtest.servicescard`, `DEFAULT_ENVIRONMENT=TEST`. Re-run with a different variant to switch backends.
3. **Firebase config:** obtain `app/ios/GoogleService-Info.plist` and `app/android/app/google-services.json` from another developer.

> The Xcode **scheme is `BCWallet`** for every variant (the variant system only swaps product name / bundle id / assets), so all `xcodebuild` commands below use `-scheme BCWallet` even for the BCSC build. The exported product is named after the target; rename it to `BCSC.ipa` on copy.

---

## iOS Release IPA — for Sauce Labs RDC

Sauce runs a real-device `.ipa`. The camera **image injection** the verified journeys depend on is already enabled in the WDIO config (`sauceLabsImageInjectionEnabled: true`, see `configs/sauce/wdio.shared.sauce.conf.ts`). Sauce **re-signs and instruments** the app for its device pool on upload (instrumentation is what image injection needs), so the archive below only has to be a valid `iphoneos` build — a **development** or **ad-hoc** export is sufficient; you do not need Sauce's or the App Store's distribution profile.

### 1. Build a Release archive and export the IPA

```bash
node scripts/apply-variant.mjs bcsc-test    # repo root
cd app/ios
pod install

# Archive: Release, generic iOS device. -allowProvisioningUpdates lets Xcode
# manage signing automatically with your Apple Developer team. Do NOT set
# SKIP_BUNDLING locally — the RN build phase bundles the JS into the .app.
xcodebuild \
  -workspace BCWallet.xcworkspace \
  -scheme BCWallet \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -archivePath build/BCSC.xcarchive \
  -allowProvisioningUpdates \
  archive

# Export the archive to an .ipa using export-options.plist (below).
xcodebuild -exportArchive \
  -archivePath build/BCSC.xcarchive \
  -exportOptionsPlist export-options.plist \
  -exportPath build/export

# Copy into e2e/apps, renaming to the expected filename.
cp build/export/*.ipa ../../e2e/apps/BCSC.ipa
```

Create `app/ios/export-options.plist` — a **development** export (works on Sauce, which resigns):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>teamID</key>
  <string>L796QSLV3E</string>
  <key>method</key>
  <string>development</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>stripSwiftSymbols</key><true/>
  <key>uploadBitcode</key><false/>
  <key>uploadSymbols</key><true/>
</dict>
</plist>
```

- `L796QSLV3E` is the project's Apple team — use it if you're a member, otherwise substitute your own team id (Sauce resigns regardless).
- Use `<string>ad-hoc</string>` instead of `development` if you have an ad-hoc profile with the target devices registered.

> **Reference:** the CI release build (`.github/workflows/main.yaml`) archives the same way but with **manual** signing (`method=app-store`, a generated `release-variant.xcconfig` + provisioning profile) and pre-bundles JS with `SKIP_BUNDLING=1`. That path is for the App Store; the development export above is the local/Sauce equivalent.

### 2. Upload to Sauce Storage

The Sauce config references the app by storage filename — `appium:app: storage:filename=${IOS_APP_FILENAME}` (default `BCSC-Dev-latest.ipa`). Upload with the Storage REST API:

```bash
set -a; source e2e/.env.saucelabs; set +a      # SAUCE_USERNAME / SAUCE_ACCESS_KEY / SAUCE_REGION

# US data center (SAUCE_REGION=us). For EU use api.eu-central-1.saucelabs.com.
curl -u "$SAUCE_USERNAME:$SAUCE_ACCESS_KEY" \
  --location --request POST \
  "https://api.us-west-1.saucelabs.com/v1/storage/upload" \
  --form "payload=@e2e/apps/BCSC.ipa" \
  --form "name=BCSC.ipa"
```

Then point the config at it and run a suite:

```bash
# in e2e/.env.saucelabs
IOS_APP_FILENAME=BCSC.ipa

cd e2e && yarn test:ios:sauce --suite verify
```

> Sauce keeps recent uploads by name+hash; prune old builds with `node e2e/scripts/saucelabs-prune-builds.mjs`. Re-uploading the same `name` shadows the previous file for new sessions.

---

## iOS Simulator build — local simulator runs

The simulator uses a `.app` (not an `.ipa`), and Debug is fine:

```bash
node scripts/apply-variant.mjs bcsc-test
cd app/ios && pod install
xcodebuild -workspace BCWallet.xcworkspace \
  -scheme BCWallet -configuration Debug \
  -sdk iphonesimulator -derivedDataPath build
cp -r build/Build/Products/Debug-iphonesimulator/*.app ../../e2e/apps/BCSC.app
```

Run with `cd e2e && yarn test:ios:local` (set `IOS_APP=BCSC.app` if the filename differs from the config default).

## iOS Real Device build — USB-connected iPhone

Same as the [Release IPA](#ios-release-ipa--for-sauce-labs-rdc) above, but you can swap `-configuration Debug` for faster iteration. Copy the exported `.ipa` to `e2e/apps/BCSC.ipa` and run:

```bash
cd e2e && IOS_APP_DEVICE=BCSC.ipa yarn test:ios:device
```

Real-device runs also need `IOS_UDID`, `XCODE_ORG_ID`, and optionally `XCODE_SIGNING_ID` (see `e2e/README.md`). Note: with a Metro-connected debug build, an active VPN can break the packager↔device connection — use the Release IPA (self-contained JS bundle) when the run needs the VPN (e.g. the verified journeys' backend approval).

## Android build — emulator or real device

The same APK runs on an emulator and a USB device:

```bash
node scripts/apply-variant.mjs bcsc-test
cd app/android && ./gradlew assembleRelease   # or assembleDebug for faster iteration
cp app/build/outputs/apk/release/*.apk ../../e2e/apps/BCSC.apk
```

For Sauce, upload the APK the same way as the IPA and set `ANDROID_APP_FILENAME`.

---

## Expected filenames

The WDIO configs look for these by default (override via env var):

| Target                       | Config default        | Env var override    | Notes                                              |
| ---------------------------- | --------------------- | ------------------- | -------------------------------------------------- |
| iOS Simulator (local)        | `BCWallet.app`        | `IOS_APP`           | set to `BCSC.app`                                  |
| iOS Real Device (local)      | `BCWallet.ipa`        | `IOS_APP_DEVICE`    | set to `BCSC.ipa`                                  |
| iOS Sauce RDC                | `BCSC-Dev-latest.ipa` | `IOS_APP_FILENAME`  | the **Sauce Storage** name, not a local path       |
| Android (emu/device, local)  | `BCWallet.apk`        | `ANDROID_APP`       | set to `BCSC.apk`                                  |
| Android Sauce RDC            | —                     | `ANDROID_APP_FILENAME` | the Sauce Storage name                          |
| Previous release — Android   | `BCSC-prev.apk`       | `PREV_ANDROID_APP`  | upgrade suite's initial app (see below)            |
| Previous release — iOS       | `BCSC-prev.ipa`       | `PREV_IOS_APP`      | upgrade suite's initial app (see below)            |

Set the overrides in `e2e/.env.saucelabs` (Sauce) or your shell (local).

## Upgrade-source binaries (upgrade suites)

The upgrade suites boot an **older released build** first, then install the current build over it. GitHub Release assets are the durable origin of those older builds; Sauce storage holds a copy of each. A shipped build lives under one name in both places, `BCSC-v<version>.apk` / `.ipa`:

| Sauce name      | Lane                | Release it is attached to                                                              |
| --------------- | ------------------- | -------------------------------------------------------------------------------------- |
| `BCSC-v3.*`     | `migration`         | `bcsc-v3`                                                                              |
| `BCSC-v4.0.3.*` | `upgrade403`        | `bcsc-v4.0.2` (the 4.0.3 hotfix is what shipped; there is no `bcsc-v4.0.3` release)    |
| `BCSC-v4.1.0.*` | `upgrade` (pinned)  | `bcsc-v4.1.0_rc2` (the release object sits on the rc2 tag)                             |
| `BCSC-prev.*`   | `upgrade` (rolling) | the newest full `bcsc-v*` release carrying a `BCSC-v<x.y.z>.*` pair at 4.1.0 or later  |

The pinned rows are the manifest of `.github/workflows/refresh-e2e-sauce-builds.yml` (**Refresh E2E Sauce Builds**), which re-uploads every row plus `BCSC-prev.*` monthly (Sauce deletes storage files after 60 days of inactivity) and fails an entry whose release is missing its assets. 4.1.0 is the first release the standard upgrade suite can drive, so nothing older ever becomes `BCSC-prev.*`.

**Attaching a release's binaries.** Dispatch **Publish Release E2E Builds** with the release tag. It takes the bcsc-dev binaries from the release commit's build run, attaches them as `BCSC-v<version>.*` (derived from the tag), uploads the pinned Sauce copy and, for a full release at 4.1.0 or later, `BCSC-prev.*`. Once the run's artifacts are gone (7 days), pass `sauce_source=BCSC-Dev-<build>` to take the same build's Sauce storage copy instead; pass `asset_name` when the tag doesn't carry the shipped version:

```bash
gh workflow run publish-release-e2e-builds.yml -f release_tag=<tag> -f sauce_source=BCSC-Dev-<build>
# the tag says 4.0.2 but the shipped build is the 4.0.3 hotfix
gh workflow run publish-release-e2e-builds.yml -f release_tag=bcsc-v4.0.2 -f sauce_source=BCSC-v4.0.3 -f asset_name=BCSC-v4.0.3
```

Then add the version to the refresh manifest. A build that is in neither place must be rebuilt from its tag per the sections above and attached with `gh release upload <tag> <files>`.

**Local runs** pull the same release assets:

```bash
gh release download <tag> --pattern 'BCSC-v<version>.*' --dir e2e/apps &&
  mv e2e/apps/BCSC-v<version>.apk e2e/apps/BCSC-prev.apk &&
  mv e2e/apps/BCSC-v<version>.ipa e2e/apps/BCSC-prev.ipa
```

- **Sauce runs need no local file at all** — point the suite at any stored build: `PREV_ANDROID_APP=BCSC-v4.1.0.apk yarn test:android:upgrade:sauce`, or the `prev_build_number` input when dispatching the E2E workflow.
- **Local Android device runs** can also pull any build straight from Sauce storage (needs `e2e/.env.saucelabs` credentials):

  ```bash
  set -a; source e2e/.env.saucelabs; set +a
  NAME=BCSC-v4.1.0.apk
  id=$(curl -su "$SAUCE_USERNAME:$SAUCE_ACCESS_KEY" \
    "https://api.us-west-1.saucelabs.com/v1/storage/files?q=${NAME}&per_page=1" | jq -r '.items[0].id')
  curl -su "$SAUCE_USERNAME:$SAUCE_ACCESS_KEY" -o e2e/apps/BCSC-prev.apk \
    "https://api.us-west-1.saucelabs.com/v1/storage/download/${id}"
  ```

- **Local iOS device runs** should build the released tag from source per the sections above (a Sauce-stored `.ipa` is signed for another team, so it may not install on your device).
