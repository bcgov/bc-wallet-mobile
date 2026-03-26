# _E2E Tests_

_End-to-end tests for BC Wallet and BC Services Card apps using **WebDriverIO (WDIO) + Appium**. The same test suite runs locally (emulator/simulator) and on SauceLabs (real devices), with variant-aware test flows._

## _Design Principles_

1. **_One test suite, many targets_** _— the same specs run locally and on SauceLabs. Config files are the only difference._
2. **_Named suites_** _— tests are organized into named suites (`smoke`, `happy-path`, `full-regression`), each with dedicated spec files describing a single, explicit test path with no runtime conditionals._
3. **_Generic screen objects_** _— a single_ `BaseScreen` _class paired with a central_ `BCSC_TestIDs` _registry replaces per-screen page objects, keeping selectors in one place and screen interactions uniform._
4. **_Workspace package_** _—_ `e2e/` _is a Yarn workspace package with its own_ `package.json`_, isolated from_ `app/`_._

## _Directory Structure_

```
e2e/
├── package.json                             # workspace package with WDIO + Appium deps
├── tsconfig.json                            # TypeScript config (strict, ESNext modules)
├── USERS.md                                 # test account reference (Scooby-Doo themed)
├── .env.saucelabs.example                   # template (copy to .env.saucelabs)
│
├── scripts/
│   ├── setup-drivers.mjs                    # installs Appium drivers (yarn setup)
│   └── start-android-emulator.mjs           # launches emulator with DNS (yarn emulator:android)
│
├── configs/
│   ├── wdio.shared.conf.ts                  # base WDIO config (framework, reporters, suites)
│   ├── local/
│   │   ├── wdio.shared.local.appium.conf.ts # local Appium server settings
│   │   ├── wdio.android.local.emu.conf.ts   # Android emulator capabilities
│   │   ├── wdio.android.local.device.conf.ts # Android real device (USB)
│   │   ├── wdio.ios.local.sim.conf.ts       # iOS simulator capabilities
│   │   └── wdio.ios.local.device.conf.ts    # iOS real device (USB)
│   └── sauce/
│       ├── wdio.shared.sauce.conf.ts        # SauceLabs auth, region, sauce service
│       ├── wdio.android.sauce.rdc.conf.ts   # Android real device (SauceLabs)
│       └── wdio.ios.sauce.rdc.conf.ts       # iOS real device (SauceLabs)
│
├── src/
│   ├── constants.ts                         # timeouts, test users, and shared values
│   ├── e2eConfig.ts                         # variant detection (VARIANT env var)
│   ├── testIDs.ts                           # central registry of accessibility / resource IDs
│   │
│   ├── helpers/
│   │   ├── biometrics.ts                    # biometric simulation (local + SauceLabs)
│   │   ├── camera.ts                        # camera image injection (QR codes, photos)
│   │   ├── video.ts                         # video frame injection + device file push
│   │   ├── gestures.ts                      # swipe, scroll, long-press wrappers
│   │   ├── iosPermissions.ts                # iOS local-network permission dialog handling
│   │   ├── notifications.ts                 # notification permission dialog handling (iOS + Android)
│   │   └── sauce.ts                         # SauceLabs-specific utilities (detection, annotations)
│   │
│   └── screens/                             # screen objects — generic base + BCSC_TestIDs registry
│       └── BaseScreen.ts                    # cross-platform element lookup, tap, wait, scroll
│
├── test/
│   ├── bc-wallet/                           # BC Wallet variant test suite
│   │   └── smoke.spec.ts                    # app launch + initial navigation
│   └── bcsc/                                # BCSC variant test suite
│       ├── smoke.spec.ts                    # app launch + initial navigation (default)
│       ├── happy-path/                      # straight-through flow, no detours
│       │   ├── happy-path.spec.ts           # orchestrator: onboarding → verify → main
│       │   ├── onboarding/
│       │   │   └── onboarding.spec.ts       # PIN auth, no detours
│       │   ├── verify/
│       │   │   └── verify.spec.ts           # combined card, in-person verification
│       │   └── main/
│       │       └── main.spec.ts             # tab navigation, settings
│       └── full-regression/                 # comprehensive flow with detours & extra coverage
│           ├── full-regression.spec.ts      # orchestrator: onboarding → verify → main
│           ├── onboarding/
│           │   └── onboarding.spec.ts       # transfer detour, setup types, help detours, PIN auth
│           ├── verify/
│           │   └── verify.spec.ts           # non-photo card, additional ID evidence, in-person
│           └── main/
│               └── main.spec.ts             # tab navigation, settings
│
├── assets/                                  # test images for camera/video injection
│   └── README.md
│
├── logs/                                    # Appium logs (gitignored)
│
└── apps/                                    # local app binaries (gitignored)
    ├── .gitkeep
    └── README.md
```

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

| _Suite_            | _What it tests_                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `smoke`            | _App launch + initial navigation (fast sanity check)_                                            |
| `happy-path`       | _Full flow: straight-through onboarding (PIN auth), combined-card verification, main navigation_ |
| `full-regression`  | _Full flow: onboarding with transfer/setup/help detours, non-photo card with additional ID_      |

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

Real-device runs use a **signed `.ipa`** (device build), not the simulator `.app`. The device config uses `IOS_APP_DEVICE` (default `BCWallet.ipa`) so that `IOS_APP=BCWallet.app` in `.env.saucelabs` does not load the wrong binary.

1. **Build and place the .ipa** in `e2e/apps/` (see [apps/README.md](apps/README.md) — "iOS Real Device Build").
2. In `.env.saucelabs` set `IOS_APP_DEVICE=BCWallet.ipa` (or leave unset to use the default), and set `IOS_UDID` and `XCODE_ORG_ID` for your device and team.

```bash
# Place your .ipa in e2e/apps/; set IOS_UDID and XCODE_ORG_ID (e.g. in .env.saucelabs or inline)
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
3. **Logs:** The device config sets `showXcodeLog: true` so Appium logs show the actual xcodebuild error; check `e2e/logs/` after a run.

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
# One-time: create .env.saucelabs and add your credentials
cp e2e/.env.saucelabs.example e2e/.env.saucelabs
# Edit e2e/.env.saucelabs with SAUCE_USERNAME, SAUCE_ACCESS_KEY, app filenames

# Run on both platforms (env is loaded automatically from .env.saucelabs)
yarn test:sauce

# Or individually
yarn test:android:sauce
yarn test:ios:sauce

# Run a specific suite on SauceLabs
yarn wdio configs/sauce/wdio.ios.sauce.rdc.conf.ts --suite happy-path
```

### _Variant Selection_

_All commands respect the_ `VARIANT` _env var. Defaults to_ `bcsc` _if not set. Values starting with_ `bcsc` _normalize to_ `bcsc`_; values starting with_ `bcwallet` _normalize to_ `bcwallet`_._

```bash
VARIANT=bcwallet yarn test:ios:local
VARIANT=bcsc yarn test:android:sauce
```

## _Environment Variables_

| _Variable_             | _Default_             | _Description_                                                                   |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `VARIANT`              | `bcsc`                | _App variant to test (normalized:_ `bcsc` _or_ `bcwallet`_)_                    |
| `SAUCE_USERNAME`       | _—_                   | _SauceLabs username (sauce runs only)_                                          |
| `SAUCE_ACCESS_KEY`     | _—_                   | _SauceLabs access key (sauce runs only)_                                        |
| `SAUCE_REGION`         | `us`                  | _SauceLabs data center region (_`us` _or_ `eu`_)_                               |
| `ANDROID_APP_FILENAME` | `BCSC-Dev-latest.aab` | _Android app filename in SauceLabs storage_                                     |
| `IOS_APP_FILENAME`     | `BCSC-Dev-latest.ipa` | _iOS app filename in SauceLabs storage_                                         |
| `BUILD_NAME`           | `local-<timestamp>`   | _SauceLabs build name_                                                          |
| `TEST_NAME`            | `E2E Tests`           | _SauceLabs test name_                                                           |
| `IOS_DEVICE`           | `iPhone 16`           | _iOS simulator/device name (local)_                                             |
| `IOS_VERSION`          | `18.5`                | _iOS simulator/device version (local)_                                          |
| `IOS_APP`              | `BCWallet.app`        | _iOS app filename in_ `apps/` _(local sim)_                                     |
| `IOS_APP_DEVICE`       | `BCWallet.ipa`        | _iOS app filename in_ `apps/` _(local real device)_                             |
| `ANDROID_DEVICE`       | `Pixel_7_API_35`      | _Android emulator/device name (local)_                                          |
| `ANDROID_VERSION`      | `15.0`                | _Android emulator/device version (local)_                                       |
| `ANDROID_APP`          | `BCWallet.apk`        | _Android app filename in_ `apps/` _(local)_                                     |
| `IOS_UDID`             | _—_                   | _iOS device UDID (iOS real device only)_                                        |
| `ANDROID_UDID`         | _—_                   | _Android device serial (Android real device only)_                              |
| `XCODE_ORG_ID`         | _—_                   | _Apple Team ID (iOS real device only)_                                          |
| `XCODE_SIGNING_ID`     | `Apple Development`   | _WDA signing identity; required for automatic signing with current Xcode_       |
| `SHOW_XCODE_LOG`       | _unset_               | _Set to_ `true` _to print xcodebuild output when WebDriverAgent fails to build_ |
| `NO_RESET`             | `false`               | _Set to_ `true` _to skip app reinstall between runs (preserves app state)_      |
| `CARD_SERIAL`          | _—_                   | _Test card serial number for verification flows_                                |
| `BIRTH_DATE`           | _—_                   | _Test birthdate for verification flows (format:_ `YYYYMMDD`_)_                  |

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
      └── sauce/wdio.ios.sauce.rdc.conf.ts         ← + iOS real device caps
```

_Each leaf config only contains **capabilities** (device name, platform version, app path). Everything else is inherited._

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

### _Suite-Based Tests_

_Each suite has its own dedicated spec files with explicit test steps — no runtime conditionals. Suite selection replaces the old_ `E2E_FLOW` _env var:_

| _Old (flow-based)_                               | _New (suite-based)_                                        |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `E2E_FLOW=simple ... --spec test/bcsc/e2e.spec.ts`  | `--suite happy-path`                                       |
| `E2E_FLOW=advanced ... --spec test/bcsc/e2e.spec.ts` | `--suite full-regression`                                  |

_Each suite's orchestrator imports sub-specs in order (onboarding → verify → main), preserving a single Mocha session for stateful flows:_

```typescript
// test/bcsc/happy-path/happy-path.spec.ts
import './onboarding/onboarding.spec.js'
import './verify/verify.spec.js'
import './main/main.spec.js'
```

### _Camera & Video Injection_

_The_ `camera` _and_ `video` _helpers simulate camera input on Sauce Labs RDC. Both use Sauce Labs' image injection under the hood — still images for photo capture / QR scanning, and the same mechanism for video frames (Sauce feeds the injected image into_ `AVCaptureVideoDataOutput` _on iOS and_ `camera2` _on Android)._

_Place test images in_ `e2e/assets/` _(see_ [`assets/README.md`](assets/README.md)_). Helpers resolve relative filenames from that directory automatically._

```typescript
import { injectQRCode, injectPhoto } from '../../src/helpers/camera.js'
import { injectVideoFrame, sustainedFrameInjection } from '../../src/helpers/video.js'

// Inject a QR code before the scanner screen opens
await injectQRCode('qr-invite.png')
await SerialInstructions.tap('ScanBarcode')

// Inject an ID photo for evidence capture
await injectPhoto('id-drivers-license.jpg')
await EvidenceCapture.tap('TakePhoto')

// Inject a face image as video frames while recording
await injectVideoFrame('selfie-liveness.png')
await TakeVideo.tap('StartRecordingButton')
// Keep re-injecting during the recording duration
await sustainedFrameInjection('selfie-liveness.png', { durationMs: 8_000 })
```

_For local testing, camera injection is not available — use a test-mode flag in the app instead._

## _CI/CD_

_Tests run automatically in GitHub Actions:_

| _Trigger_      | _Scope_                  | _Devices_                   |
| -------------- | ------------------------ | --------------------------- |
| _PR_           | `--suite smoke` _only_   | _1 Android RDC + 1 iOS RDC_ |
| `main` _merge_ | _All suites_             | _Multiple device/OS combos_ |

## _Local App Binaries_

_Place local builds in_ `e2e/apps/` _for local testing. See_ [`apps/README.md`](apps/README.md) _for instructions on producing builds._
