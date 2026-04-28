# _E2E Tests_

_End-to-end tests for BC Wallet and BC Services Card apps using **WebDriverIO (WDIO) + Appium**. The same test suite runs locally (emulator/simulator) and on SauceLabs (real devices), with variant-aware test flows._

## _Prerequisites_

- **_Node.js 20+_** _and_ **_Yarn_**
- _For local runs: [Appium](https://appium.io/) is installed as a devDependency; platform drivers are installed via the setup script_
- _For SauceLabs runs: a SauceLabs account with_ `SAUCE_USERNAME` _and_ `SAUCE_ACCESS_KEY`

## _Setup_

```bash
cd e2e
yarn install
yarn setup    # installs Appium drivers (uiautomator2 + xcuitest)
```

_The_ `yarn setup` _step registers the Appium drivers into Appium's driver registry. This is a one-time step (re-run if you upgrade Appium or want to update drivers)._

## _Running Tests_

### _Suites_

_Tests are organized into named suites. Use the_ `--suite` _flag to select which suite to run:_

| _Suite_           | _What it tests_                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `smoke`           | _App launch + initial navigation (fast sanity check)_                                            |
| `happy-path`      | _Full flow: straight-through onboarding (PIN auth), combined-card verification, main navigation_ |
| `full-regression` | _Full flow: card scanning + send video verification (two orchestrated specs via directory glob)_ |
| `biometrics`      | _Onboarding with biometric auth (Sauce Labs RDC only, requires_ `allowTouchIdEnroll`_)_          |
| `migration`       | _V3→V4 upgrade: runs v3 onboarding + verification, upgrades to v4, unlocks with v3 PIN_          |

```bash
# Run by suite name
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --suite smoke
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --suite happy-path
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --suite full-regression
```

_Without_ `--suite`_, the default spec is_ `smoke.spec.ts`_._

### _Local — iOS Simulator_

```bash
# Place your .app build in e2e/apps/ (see apps/README.md)
yarn test:ios:local

# Run a specific suite
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --suite happy-path

# Run a single spec directly
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --spec test/bcsc/smoke.spec.ts
```

### _Local — Android Emulator_

_For reliable internet in the emulator (e.g. API calls during tests), start the emulator with explicit DNS before running tests. Use the same AVD name as_ `ANDROID_DEVICE` _(default_ `Pixel_7_API_35`_)._

**Option A — start emulator via script (recommended):**

```bash
# Terminal 1: start emulator with DNS, then leave it running
cd e2e
yarn emulator:android

# Terminal 2: run tests (after emulator has booted)
yarn test:android:local
```

**Option B — start emulator manually:**

```bash
# List AVDs; use one that matches ANDROID_DEVICE (see Environment variables)
emulator -list-avds
emulator -avd Pixel_7_API_35 -dns-server 8.8.8.8,8.8.4.4
# Then in another terminal:
cd e2e && yarn test:android:local
```

**Run tests (with emulator already running):**

```bash
# Place your .apk build in e2e/apps/ (see apps/README.md)
yarn test:android:local

# Run a specific suite
yarn wdio configs/local/wdio.android.local.emu.conf.ts --suite happy-path
```

### _Local — iOS Real Device_

Real-device runs use a **signed `.ipa`** (device build), not the simulator `.app`. The device config uses `IOS_APP_DEVICE` (default `BCWallet.ipa`) so that `IOS_APP=BCWallet.app` in `.env.e2e` does not load the wrong binary.

1. **Build and place the .ipa** in `e2e/apps/` (see [apps/README.md](apps/README.md) — "iOS Real Device Build").
2. In `.env.e2e` set `IOS_APP_DEVICE=BCWallet.ipa` (or leave unset to use the default), and set `IOS_UDID` and `XCODE_ORG_ID` for your device and team.

```bash
# Place your .ipa in e2e/apps/; set IOS_UDID and XCODE_ORG_ID (e.g. in .env.e2e or inline)
IOS_UDID=<device-udid> XCODE_ORG_ID=<team-id> yarn test:ios:device

# Run a specific suite
IOS_UDID=<device-udid> XCODE_ORG_ID=<team-id> \
  yarn wdio configs/local/wdio.ios.local.device.conf.ts --suite happy-path
```

_Find your device UDID via Finder (click the device name in the sidebar) or:_

```bash
xcrun xctrace list devices
```

**WebDriverAgent (WDA) on real device**
Appium installs **WebDriverAgentRunner** on the device to drive automation. It must be built and signed with your Apple team. If you see `xcodebuild failed with code 65` or "Unable to launch WebDriverAgent", WDA code signing is not set up:

1. **Device:** Trust the computer (USB prompt), enable **Developer Mode** (iOS 16+: Settings → Privacy & Security), and **trust your developer certificate** (Settings → General → VPN & Device Management → your team → Trust).
2. **WDA signing:** Follow [Appium's real device preparation](https://appium.github.io/appium-xcuitest-driver/latest/preparation/real-device-config/). Easiest is [Basic Automatic Configuration](https://appium.github.io/appium-xcuitest-driver/latest/preparation/prov-profile-basic-auto/) (paid Apple Developer account). If that fails, use one of the manual approaches (e.g. open WDA in Xcode: `appium driver run xcuitest open-wda` from the e2e folder, then sign the WebDriverAgent target with your team).
3. **Logs:** Set `SHOW_XCODE_LOG=true` (in `.env.e2e` or inline) to print full xcodebuild output when WDA fails; check `e2e/logs/` after a run.

### _Local — Android Real Device_

The debug APK loads the JS bundle from Metro. To avoid Metro connection errors on a real device:

1. **Start Metro** in the app directory (in a separate terminal): `cd app && yarn start`
2. **Connect the device via USB** with USB debugging enabled.
3. Run the tests. The device config runs `adb reverse tcp:8081 tcp:8081` in `onPrepare` so the device can reach Metro on your machine.

```bash
# Place your .apk build in e2e/apps/ (see apps/README.md)
ANDROID_UDID=<device-serial> yarn test:android:device

# Run a specific suite
ANDROID_UDID=<device-serial> \
  yarn wdio configs/local/wdio.android.local.device.conf.ts --suite happy-path
```

_Find your device serial via:_

```bash
adb devices
```

### _SauceLabs — Real Devices_

```bash
# One-time: create both env files
cp e2e/.env.e2e.example e2e/.env.e2e              # general e2e settings (variant, flow, devices)
cp e2e/.env.saucelabs.example e2e/.env.saucelabs  # SauceLabs credentials + app filenames

# Run on both platforms (env files are loaded automatically)
yarn test:sauce

# Or individually
yarn test:android:sauce
yarn test:ios:sauce

# Run a specific suite on SauceLabs
yarn wdio configs/sauce/wdio.ios.sauce.rdc.conf.ts --suite happy-path
```

### _Migration Tests (v3 → v4)_

_The migration suite tests upgrading from the v3 BC Services Card app (native Swift/Java) to the v4 BCSC app (React Native). It runs the full v3 onboarding and verification flow, then installs v4 over v3 and verifies the app unlocks with the v3 PIN._

**_Prerequisites:_**

1. _Upload both the v3 and v4 app builds to Sauce Labs storage._
2. _Set the v3 app filenames in_ `.env.saucelabs`_:_

```bash
V3_ANDROID_APP=BCSC-v3.apk
V3_IOS_APP=BCSC-v3.ipa

# Migration upgrade uses the standard current-build vars:
# ANDROID_APP_FILENAME / IOS_APP_FILENAME
```

3. _Ensure SiteMinder credentials are in_ `local.env` _(the v3 flow uses in-person verification)._

```bash
# Run migration on both platforms
yarn test:migration:sauce

# Or individually
yarn test:android:migration:sauce
yarn test:ios:migration:sauce

# Or with a specific config
yarn wdio configs/sauce/wdio.ios.sauce.migration.conf.ts --suite migration
```

_The migration configs start with the v3 app as the initial install. During the test, `driver.installApp()` upgrades to v4 mid-session. Both apps share the same bundle/package ID (eg. `ca.bc.gov.id.servicescard.dev`), so the upgrade preserves app data._

### _Variant Selection_

_All commands respect the_ `VARIANT` _env var. Defaults to_ `bcsc` _if not set. Values starting with_ `bcsc` _normalize to_ `bcsc`_; values starting with_ `bcwallet` _or_ `bc-wallet` _normalize to_ `bc-wallet`_._

```bash
VARIANT=bcwallet yarn test:ios:local
VARIANT=bcsc yarn test:android:sauce
```

## _Environment Variables_

_Three env files split general e2e config, SauceLabs credentials, and SiteMinder credentials:_

- **`.env.e2e`** _— loaded for every run target (local + sauce). Copy from_ `.env.e2e.example`_._
- **`.env.saucelabs`** _— loaded only for sauce runs. Copy from_ `.env.saucelabs.example`_._
- **`local.env`** _— SiteMinder credentials for the in-person verification approval flow (gitignored). Create manually — see_ [_SiteMinder section_](#siteminder-localenv) _below._

### _General (`.env.e2e`)_

| _Variable_         | _Default_           | _Description_                                                                   |
| ------------------ | ------------------- | ------------------------------------------------------------------------------- |
| `VARIANT`          | `bcsc`              | _App variant to test (normalized:_ `bcsc` _or_ `bc-wallet`_)_                   |
| `IOS_DEVICE`       | `iPhone 16`         | _iOS simulator/device name (local)_                                             |
| `IOS_VERSION`      | `18.5`              | _iOS simulator/device version (local)_                                          |
| `IOS_APP`          | `BCWallet.app`      | _iOS app filename in_ `apps/` _(local sim)_                                     |
| `IOS_APP_DEVICE`   | `BCWallet.ipa`      | _iOS app filename in_ `apps/` _(local real device)_                             |
| `IOS_UDID`         | _—_                 | _iOS device UDID (iOS real device only)_                                        |
| `XCODE_ORG_ID`     | _—_                 | _Apple Team ID (iOS real device only)_                                          |
| `XCODE_SIGNING_ID` | `Apple Development` | _WDA signing identity; required for automatic signing with current Xcode_       |
| `SHOW_XCODE_LOG`   | _unset_             | _Set to_ `true` _to print xcodebuild output when WebDriverAgent fails to build_ |
| `ANDROID_DEVICE`   | `Pixel_7_API_35`    | _Android emulator/device name (local)_                                          |
| `ANDROID_VERSION`  | `15.0`              | _Android emulator/device version (local)_                                       |
| `ANDROID_APP`      | `BCWallet.apk`      | _Android app filename in_ `apps/` _(local)_                                     |
| `ANDROID_UDID`     | _—_                 | _Android device serial (Android real device only)_                              |
| `NO_RESET`         | `false`             | _Set to_ `true` _to skip app reinstall between runs (preserves app state)_      |

### _SauceLabs (`.env.saucelabs`)_

| _Variable_                 | _Default_             | _Description_                                                                 |
| -------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `SAUCE_USERNAME`           | _—_                   | _SauceLabs username_                                                          |
| `SAUCE_ACCESS_KEY`         | _—_                   | _SauceLabs access key_                                                        |
| `SAUCE_REGION`             | `us`                  | _SauceLabs data center region (_`us` _or_ `eu`_)_                             |
| `ANDROID_APP_FILENAME`     | `BCSC-Dev-latest.apk` | _Android app filename in SauceLabs storage_                                   |
| `IOS_APP_FILENAME`         | `BCSC-Dev-latest.ipa` | _iOS app filename in SauceLabs storage_                                       |
| `IOS_DEVICE_NAME`          | `iPhone.*`            | _iOS device name regex for Sauce RDC allocation_                              |
| `IOS_PLATFORM_VERSION`     | _unset_               | _Pin iOS version (e.g._ `18`_). Unset = Sauce picks any available match._     |
| `ANDROID_DEVICE_NAME`      | `Google.*`            | _Android device name regex for Sauce RDC allocation_                          |
| `ANDROID_PLATFORM_VERSION` | _unset_               | _Pin Android version (e.g._ `15`_). Unset = Sauce picks any available match._ |
| `BUILD_NAME`               | `local-<timestamp>`   | _SauceLabs build name_                                                        |
| `TEST_NAME`                | `E2E Tests`           | _SauceLabs test name_                                                         |
| `V3_ANDROID_APP`           | `BCSC-v3.apk`         | _V3 Android app for migration tests (local file or Sauce storage filename)_   |
| `V3_IOS_APP`               | `BCSC-v3.ipa`         | _V3 iOS app for migration tests (local file or Sauce storage filename)_       |

### _SiteMinder (`local.env`)_

_The in-person verification approval flow (`approveInPersonRequest` in_ `src/helpers/approval.ts`_) automates the SiteMinder login used by the IDCheck portal. It reads credentials from_ `e2e/local.env`_:_

| _Variable_    | _Description_                                          |
| ------------- | ------------------------------------------------------ |
| `SM_USER`     | _SiteMinder username for the IDCheck test environment_ |
| `SM_PASSWORD` | _SiteMinder password for the IDCheck test environment_ |

_Create the file manually (it is gitignored):_

```bash
# e2e/local.env
SM_USER='your-siteminder-username'
SM_PASSWORD='your-siteminder-password'
```

_Without these credentials, any test suite that includes in-person verification (e.g._ `happy-path`_,_ `full-regression`_) will fail at the approval step._

## _Config Hierarchy_

```
wdio.shared.conf.ts                         ← base (specs, suites, framework, reporters, hooks)
  ├── local/wdio.shared.local.appium.conf.ts   ← + local Appium service
  │   ├── local/wdio.android.local.emu.conf.ts    ← + Android emulator caps
  │   ├── local/wdio.android.local.device.conf.ts ← + Android real device caps
  │   ├── local/wdio.ios.local.sim.conf.ts         ← + iOS simulator caps
  │   └── local/wdio.ios.local.device.conf.ts      ← + iOS real device caps
  └── sauce/wdio.shared.sauce.conf.ts          ← + SauceLabs service
      ├── sauce/wdio.android.sauce.rdc.conf.ts    ← + Android real device caps
      ├── sauce/wdio.ios.sauce.rdc.conf.ts         ← + iOS real device caps
      ├── sauce/wdio.android.sauce.migration.conf.ts ← + Android migration (v3 app)
      └── sauce/wdio.ios.sauce.migration.conf.ts     ← + iOS migration (v3 app)
```

_Each leaf config only contains **capabilities** (device name, platform version, app path). Everything else is inherited. Each platform config reads its own env vars (_`IOS_DEVICE_NAME`_,_ `IOS_PLATFORM_VERSION`_,_ `ANDROID_DEVICE_NAME`_,_ `ANDROID_PLATFORM_VERSION`_) to allow CI to control device targeting without config changes._

## _Writing Tests_

### _Screen Objects & TestIDs_

_Screen interactions use_ `BaseScreen` _instances backed by the central_ `BCSC_TestIDs` _registry in_ `src/testIDs.ts`_. Each screen group is created by passing its TestID section to_ `BaseScreen`_:_

```typescript
import { BaseScreen } from '../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../src/testIDs.js'

const AccountSetup = new BaseScreen(BCSC_TestIDs.AccountSetup)
const IntroCarousel = new BaseScreen(BCSC_TestIDs.IntroCarousel)

describe('App Launch', () => {
  it('should launch and display the first screen', async () => {
    await AccountSetup.waitFor('AddAccount')
  })

  it('should navigate through setup', async () => {
    await AccountSetup.tap('AddAccount')
    await IntroCarousel.waitFor('CarouselNext', 20_000)
    await IntroCarousel.tap('CarouselNext')
  })
})
```

_Element lookup is cross-platform with no branching:_

| _Platform_ | _Strategy_         | _WDIO Selector_                            |
| ---------- | ------------------ | ------------------------------------------ |
| _iOS_      | _Accessibility ID_ | `~com.ariesbifold:id/Continue`             |
| _Android_  | _Resource ID_      | `android=new UiSelector().resourceId(...)` |

### _Composable Specs & Suite Orchestrators_

_Specs are small, focused files that each test a single action or feature. Suites are composed by importing the relevant specs in order — no runtime conditionals, no test logic duplication._

| _Old (flow-based)_                                   | _New (suite-based)_       |
| ---------------------------------------------------- | ------------------------- |
| `E2E_FLOW=simple ... --spec test/bcsc/e2e.spec.ts`   | `--suite happy-path`      |
| `E2E_FLOW=advanced ... --spec test/bcsc/e2e.spec.ts` | `--suite full-regression` |

_Orchestrator files import composable specs in order, preserving a single Mocha session for stateful flows. Adding a new permutation (e.g. biometric + combined card) is just a new orchestrator with different imports:_

```typescript
// test/bcsc/happy-path.spec.ts — used by --suite happy-path
import './onboarding/app-launch.spec.js'
import './onboarding/add-account.spec.js'
import './onboarding/consent.spec.js'
import './onboarding/notifications.spec.js'
import './onboarding/pin-auth.spec.js'
import './verify/card-type/config-combined-card.js'
import './verify/nickname.spec.js'
import './verify/card-csn.spec.js'
import './verify/in-person-verification.spec.js'
import './main/main.spec.js'
```

_The_ `full-regression` _suite uses a **directory glob** (`full-regression/*.spec.ts`) rather than a single orchestrator. Each file in the_ `full-regression/` _directory is an independent orchestrated flow (e.g. card scanning, send video). The standalone_ `full-regression.spec.ts` _orchestrator still exists for running the full non-photo-card flow via_ `--spec`_:_

```typescript
// test/bcsc/full-regression/card-csn-scanning.spec.ts — card scanning flow
import '../onboarding/app-launch.spec.js'
import '../onboarding/add-account.spec.js'
import '../onboarding/consent.spec.js'
import '../onboarding/notifications.spec.js'
import '../onboarding/pin-auth.spec.js'
import '../verify/card-type/config-combined-card.js'
import '../verify/nickname.spec.js'
import '../verify/card-scan.spec.js'
```

_Shared state (e.g. test user data) flows between specs via_ `verify/card-type/card-context.ts`_. Card-type config modules (e.g._ `config-combined-card.ts`_) set_ `verifyContext.testUser` _and_ `verifyContext.cardTypeButton` _at module evaluation time; downstream specs like_ `card-csn.spec.ts` _and_ `in-person-verification.spec.ts` _read them lazily inside_ `it` _blocks._

### _Camera Image Injection_

_The_ `camera` _helper simulates camera input on Sauce Labs RDC via image injection. The injected image replaces the live camera feed for both still capture and video frame output, so the same call works for photo capture, QR/barcode scanning, and video recording._

_Place test images in_ `e2e/assets/images/` _(see_ [`assets/README.md`](assets/README.md)_). Helpers resolve relative filenames from the_ `assets/` _directory automatically._

_The_ `injectPhoto` _function takes a path and a padding object. Padding (in pixels) repositions the image within the injected camera frame — useful for aligning barcodes with the app's scanning target area:_

```typescript
import { injectPhoto } from '../../src/helpers/camera.js'
import { CARD_SCAN_PADDING } from '../../src/constants.js'

// Inject a driver's licence photo for card barcode scanning (with padding)
await injectPhoto('images/dl_velma.jpg', CARD_SCAN_PADDING)

// Inject a selfie for evidence capture (no padding needed)
await injectPhoto('images/id_shaggy.jpg', { top: 0, right: 0, bottom: 0, left: 0 })
await TakePhoto.tap('TakePhoto')
```

_For local testing, camera injection is not available — use a test-mode flag in the app instead._

## _CI/CD_

_Tests run automatically in GitHub Actions via a device matrix that controls which OS versions are tested:_

| _Trigger_            | _Suite_           | _Device Matrix_                     | _Variant_  | _Biometrics_ |
| -------------------- | ----------------- | ----------------------------------- | ---------- | ------------ |
| _PR_                 | `smoke`           | _1 iOS (18) + 1 Android (15)_       | `bcsc-dev` | _No_         |
| _Nightly (schedule)_ | `full-regression` | _3 iOS (16–18) + 3 Android (13–15)_ | `bcsc-dev` | _Yes_        |

_The device matrix is passed as a JSON array of_ `{platform, device, os_version}` _objects to_ `e2e.yml`_. Each entry spawns a separate SauceLabs session with its own logs and pass/fail status. Biometric tests run as a separate non-blocking job after the main E2E tests._

_**Note:** The_ `main` _merge E2E regression job is commented out pending GitHub Actions runner IP whitelisting with the BC Gov ID Check portal. See the IP whitelisting options documented in_ `main.yaml`_. Until resolved, nightly runs provide full regression coverage._

_**Concurrency:** SauceLabs sessions are limited to_ `max-parallel: 2`_. For PRs (2 devices = 2 jobs) this fits within a single round. Nightly runs with the full device matrix queue longer._

## _Local App Binaries_

_Place local builds in_ `e2e/apps/` _for local testing. See_ [`apps/README.md`](apps/README.md) _for instructions on producing builds._

## _Design Principles_

1. **_One test suite, many targets_** _— the same specs run locally and on SauceLabs. Config files are the only difference._
2. **_Variant + suite driven_** _— the_ `VARIANT` _env var selects which test directory to run (e.g._ `test/bcsc/`_), while_ `--suite` _selects the depth:_ `smoke` _for a quick sanity check,_ `happy-path` _for a straight-through flow,_ `full-regression` _for full coverage with detours and additional verification._
3. **_Generic screen objects_** _— a single_ `BaseScreen` _class paired with a central_ `BCSC_TestIDs` _registry replaces per-screen page objects, keeping selectors in one place and screen interactions uniform._
4. **_Workspace package_** _—_ `e2e/` _is a Yarn workspace package with its own_ `package.json`_, isolated from_ `app/`_._

## _Directory Structure_

```
e2e/
├── package.json                             # workspace package with WDIO + Appium deps
├── tsconfig.json                            # TypeScript config (strict, ESNext modules)
├── eslint.config.mjs                        # ESLint flat config
├── .env.e2e.example                         # general e2e config template (copy to .env.e2e)
├── .env.saucelabs.example                   # SauceLabs credentials template (copy to .env.saucelabs)
│
├── scripts/
│   ├── login.mjs                            # SiteMinder login helper for approval flow
│   ├── setup-drivers.mjs                    # installs Appium drivers (yarn setup)
│   └── start-android-emulator.mjs           # launches emulator with DNS (yarn emulator:android)
│
├── configs/
│   ├── wdio.shared.conf.ts                  # base WDIO config (framework, reporters, suites, hooks)
│   ├── local/
│   │   ├── wdio.shared.local.appium.conf.ts # local Appium server settings
│   │   ├── wdio.android.local.emu.conf.ts   # Android emulator capabilities
│   │   ├── wdio.android.local.device.conf.ts # Android real device (USB)
│   │   ├── wdio.ios.local.sim.conf.ts       # iOS simulator capabilities
│   │   └── wdio.ios.local.device.conf.ts    # iOS real device (USB)
│   └── sauce/
│       ├── wdio.shared.sauce.conf.ts        # SauceLabs auth, region, sauce service
│       ├── wdio.android.sauce.rdc.conf.ts   # Android real device (SauceLabs)
│       ├── wdio.ios.sauce.rdc.conf.ts       # iOS real device (SauceLabs)
│       ├── wdio.android.sauce.migration.conf.ts # Android migration v3→v4 (SauceLabs)
│       ├── wdio.ios.sauce.migration.conf.ts     # iOS migration v3→v4 (SauceLabs)
│       └── biometrics/
│           ├── wdio.android.bio.sauce.rdc.conf.ts # Android + allowTouchIdEnroll
│           └── wdio.ios.bio.sauce.rdc.conf.ts     # iOS + allowTouchIdEnroll
│
├── src/
│   ├── constants.ts                         # timeouts, TestUsers, and shared values
│   ├── e2eConfig.ts                         # variant detection (bcsc / bc-wallet)
│   ├── testIDs.ts                           # central registry of accessibility / resource IDs
│   ├── v3TestIDs.ts                         # v3 native app selectors (iOS + Android) for migration
│   │
│   ├── helpers/
│   │   ├── alerts.ts                        # iOS system alert acceptance (permissions, dialogs)
│   │   ├── approval.ts                      # in-person verification approval via SiteMinder
│   │   ├── biometrics.ts                    # biometric simulation (Sauce Labs RDC)
│   │   ├── camera.ts                        # camera image injection + padding (photos, QR, video)
│   │   ├── gestures.ts                      # swipe, scroll, tap-at-coordinate wrappers
│   │   └── sauce.ts                         # SauceLabs-specific utilities (detection, annotations)
│   │
│   └── screens/                             # screen objects — generic base + BCSC_TestIDs registry
│       └── BaseScreen.ts                    # cross-platform element lookup, tap, wait, scroll
│
├── test/
│   ├── bc-wallet/                           # BC Wallet variant test suite
│   │   └── smoke.spec.ts                    # app launch (default spec)
│   │
│   └── bcsc/                                # BCSC variant test suite
│       ├── smoke.spec.ts                    # app launch + initial navigation (default spec)
│       ├── happy-path.spec.ts               # suite orchestrator: onboarding → combined card → main
│       ├── full-regression.spec.ts          # orchestrator: full onboarding → non-photo + passport → main
│       ├── biometrics.spec.ts               # orchestrator: onboarding with biometric auth
│       ├── full-regression/                 # full-regression suite (glob: *.spec.ts)
│       │   ├── card-csn-scanning.spec.ts    # card scanning flow (onboarding → scan → verify)
│       │   └── send-image-video.spec.ts     # send video flow (onboarding → photo/video capture)
│       ├── onboarding/
│       │   ├── app-launch.spec.ts           # app launch + first screen
│       │   ├── add-account.spec.ts          # add account flow
│       │   ├── biometric-auth.spec.ts       # biometric auth setup (biometrics suite)
│       │   ├── consent.spec.ts              # consent screen
│       │   ├── notifications.spec.ts        # notification permission
│       │   ├── notifications-help.spec.ts   # notification help detour
│       │   ├── pin-auth.spec.ts             # PIN creation
│       │   ├── secure-app-help.spec.ts      # secure app help detour
│       │   ├── setup-type-interaction.spec.ts # setup type selection detour
│       │   └── transfer-detour.spec.ts      # transfer detour
│       ├── verify/
│       │   ├── card-csn.spec.ts             # card serial + birthdate entry
│       │   ├── card-scan.spec.ts            # card barcode scanning via camera injection
│       │   ├── nickname.spec.ts             # nickname entry
│       │   ├── additional-id-passport.spec.ts # passport evidence capture
│       │   ├── in-person-verification.spec.ts # in-person verification method
│       │   ├── send-video-verification.spec.ts # photo + video evidence capture
│       │   └── card-type/
│       │       ├── card-context.ts          # shared mutable verify context (testUser, cardType)
│       │       ├── config-combined-card.ts  # sets context for combined card (happy-path)
│       │       └── config-non-photo-card.ts # sets context for non-photo card
│       ├── main/
│       │   └── main.spec.ts                 # tab navigation, settings, account tests
│       └── migration/
│           ├── migration.spec.ts            # suite orchestrator: v3 onboarding → upgrade → v4 unlock
│           ├── migration-context.ts         # shared state (PIN) between v3 and v4 specs
│           ├── v3-onboarding.spec.ts        # v3 app onboarding + card verification
│           ├── upgrade.spec.ts              # install v4 over v3 via driver.installApp()
│           └── v4-unlock.spec.ts            # unlock v4 with v3 PIN, verify Home screen
│
├── assets/                                  # test images for camera injection
│   ├── README.md
│   ├── USERS.md                             # test account reference (Scooby-Doo themed)
│   └── images/                              # ID, driver's licence, and passport photos
│       ├── dl_daphne.jpg                    # driver's licence — Daphne (non-photo card)
│       ├── dl_shaggy.jpg                    # driver's licence — Shaggy (photo card)
│       ├── dl_velma.jpg                     # driver's licence — Velma (combo card)
│       ├── id_daphne.jpg                    # ID selfie — Daphne
│       ├── id_fred.jpg                      # ID selfie — Fred
│       ├── id_shaggy.jpg                    # ID selfie — Shaggy
│       ├── id_velma.jpg                     # ID selfie — Velma
│       └── passport.jpg                     # passport photo
│
├── logs/                                    # Appium logs (gitignored)
│
└── apps/                                    # local app binaries (gitignored)
    ├── .gitkeep
    └── README.md
```
