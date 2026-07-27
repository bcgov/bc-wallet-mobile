# _E2E Tests_

_End-to-end tests for BC Wallet and BC Services Card apps using **WebDriverIO (WDIO) + Appium**. The same test suite runs locally (emulator/simulator) and on SauceLabs (real devices), with variant-aware test flows._

## Architecture: per-area journeys + screen-object DSL

The suite is built on a typed **screen-object DSL** and **per-area journey files**. Core conventions:

- **testID keys** live in `src/test-ids/registry.ts` — the exact keys the app passes to `testIdWithKey`. Never write `com.ariesbifold:id/...` literals; wrap registry keys with `bcsc(key)`.
- **Screen descriptors** (`src/screens/<stack>.ts`) map semantic roles (`self`/`primary`/`secondary`/`back`/`help`/`menu` + named `links`/`inputs`/`elements`) to testIDs via `defineScreen`. Journeys call `tap('primary')`, `fill('pin', …)` — never raw selectors. `src/screens/main.ts` is the reference style.
- **Arrange flows** (`src/flows/`) are how journeys earn preconditions — there is no app-side seeding: `completeOnboarding()`, `skipToHome()`, `unlockWithPin()`, `completeVerification()`. The VerifyPrompt exists **only in the session that completed onboarding**; never relaunch between onboarding and verify entry.
- **Journeys** (`test/bcsc/journeys/<area>/*.journey.ts`): one file = one app session = one ordered journey of checkpoints, so a failure isolates to its file and reports per scenario. wdio `bail: 0` keeps files independent; `mochaOpts.bail: true` aborts the rest of a file on its first failure. See **[Writing Tests → Journeys](#journeys)** to add one.
- **Test context** (`src/support/context.ts`) carries the active `TestUser` across a journey's checkpoints (`setTestUser` / `getTestUser`).
- Failure screenshots + JUnit/Allure output land in `e2e/reports/` (gitignored).

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

| _Suite_      | _What it tests_                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `smoke`      | _App launch + initial navigation (fast sanity check)_                                                |
| `onboarding` | _Onboarding journeys — happy path + detours (`journeys/onboarding/*.journey.ts`)_                    |
| `auth`       | _Returning-user unlock journey — PIN unlock, wrong-PIN retry, lockout (`journeys/auth/*.journey.ts`)_ |
| `verify`     | _Verification journeys — the four card types + entry spine/detours (`journeys/verify/*.journey.ts`)_ |
| `main`       | _Main-stack journeys — unverified gating + settings (`journeys/main/*.journey.ts`)_                  |
| `biometrics` | _Onboarding with biometric auth (Sauce Labs RDC only, requires_ `allowTouchIdEnroll`_)_              |
| `migration`  | _V3→V4 upgrade: v3 onboarding + verification, upgrade to v4, unlock with the v3 PIN_                 |

```bash
# Run by suite name (per-area journey suites)
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --suite smoke
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --suite verify
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --suite main
```

_Without_ `--suite`_, the default spec is_ `smoke.spec.ts`_. The verified `verify` / `main` journeys need SiteMinder credentials (see the **SiteMinder** section) for the in-person approval step. A nightly `regression` suite spanning all journeys is being wired up (see the **CI/CD** section)._

### _Local — iOS Simulator_

```bash
# Place your .app build in e2e/apps/ (see apps/README.md)
yarn test:ios:local

# Run a specific suite
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --suite verify

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
yarn wdio configs/local/wdio.android.local.emu.conf.ts --suite verify
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
  yarn wdio configs/local/wdio.ios.local.device.conf.ts --suite verify
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
  yarn wdio configs/local/wdio.android.local.device.conf.ts --suite verify
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
yarn wdio configs/sauce/wdio.ios.sauce.rdc.conf.ts --suite verify
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

3. _Ensure SiteMinder credentials (_`SM_USER`_,_ `SM_PASSWORD`_) are set in_ `.env.e2e` _(the v3 flow uses in-person verification)._

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

_Two env files split general e2e config (including SiteMinder credentials) from SauceLabs credentials:_

- **`.env.e2e`** _— loaded for every run target (local + sauce). Copy from_ `.env.e2e.example`_. Includes the SiteMinder credentials used by the in-person verification approval flow._
- **`.env.saucelabs`** _— loaded only for sauce runs. Copy from_ `.env.saucelabs.example`_._

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

### _SiteMinder (in_ `.env.e2e`_)_

_The in-person verification approval flow (`approveInPersonRequest` in_ `src/helpers/approval.ts`_) automates the SiteMinder login used by the IDCheck portal. It reads credentials from_ `process.env` _— locally these come from_ `e2e/.env.e2e` _(loaded by_ `configs/wdio.shared.conf.ts`_), and in CI they come from GitHub Actions secrets injected via_ `.github/workflows/e2e.yml`_:_

| _Variable_    | _Description_                                          |
| ------------- | ------------------------------------------------------ |
| `SM_USER`     | _SiteMinder username for the IDCheck test environment_ |
| `SM_PASSWORD` | _SiteMinder password for the IDCheck test environment_ |

_For local runs, add them to your_ `.env.e2e` _(see_ `.env.e2e.example`_):_

```bash
# e2e/.env.e2e
SM_USER='your-siteminder-username'
SM_PASSWORD='your-siteminder-password'
```

_The same_ `scripts/login.mjs` _can also be invoked as a CLI; it loads_ `.env.e2e` _itself when run standalone. Without these credentials, any journey that completes in-person verification (the verified_ `verify` _/_ `main` _journeys, and_ `migration`_) will fail at the approval step._

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

_Screens are described with the action-based **screen-object DSL** (`defineScreen`). A descriptor maps **semantic roles** (`primary`, `secondary`, `back`, `help`, `menu`) plus named `links` / `inputs` / `elements` to test IDs; specs then drive screens **by role**, so a renamed test ID is a one-line descriptor edit rather than churn across every spec. Descriptors live **one file per stack** under_ `src/screens/<stack>.ts`_, built on the low-level_ `BaseScreen` _engine in_ `src/screens/core/`_._

_A spec speaks in roles — never raw test IDs:_

```typescript
import { Timeouts } from '../../src/constants.js'
import { OnboardingIntroScreen, OnboardingPrivacyPolicyScreen } from '../../src/screens/onboarding.js'

describe('App Launch', () => {
  it('cold-starts on the onboarding intro screen', async () => {
    await OnboardingIntroScreen.expectVisible(Timeouts.APP_LAUNCH)
  })

  it('advances Intro → Privacy Policy', async () => {
    await OnboardingIntroScreen.tap('primary') // 'menu' here would be a compile error — no such role
    await OnboardingPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
```

_A descriptor declares the roles a screen exposes._ `Screen` _methods:_ `expectVisible()`_,_ `tap(role)`_,_ `tapWhenEnabled(role)`_,_ `link(name)`_,_ `scrollToLink(name)`_,_ `fill(name, value)`_,_ `read(name)`_,_ `isVisible(name)`_,_ `back.tap()`_,_ `help.open()`_,_ `el(rawTestId)`_. A_ `const` _type parameter keeps role/name keys literal, so undeclared roles fail at compile time and everything autocompletes:_

```typescript
// src/screens/onboarding.ts
import { TestIds } from '../test-ids/registry.js'
import { bcsc, defineScreen } from './core/index.js'

const ob = TestIds.onboarding

export const OnboardingIntroScreen = defineScreen({
  self: bcsc(ob.intro.continue), // proves the screen mounted (defaults to `primary`)
  primary: bcsc(ob.intro.continue), // → Privacy Policy
  secondary: bcsc(ob.intro.learnMore),
  help: bcsc(TestIds.common.help),
})
```

**_Single source of test IDs._** _Test ID **keys** and the_ `com.ariesbifold:id/` _prefix live in one dependency-free registry,_ `src/test-ids/registry.ts`_;_ `bcsc(key)` _wraps a key into the selector both platforms use. That key is the same one the app passes to bifold's_ `testIdWithKey`_, and the registry is written to move into an app-owned/shared location so the app and the tests draw from it — a renamed key then updates both, enforced by_ `tsc`_. Pass a_ `{ ios, android }` _pair instead of a bare key for the rare element whose id differs per platform._

> _**Legacy:** a few remaining specs — the_ `smoke` _specs and the_ `manual/` _+_ `migration/` _specs — still use_ `new BaseScreen(BCSC_TestIDs.X)` _with the flat registry in_ `src/testIDs.ts` _(re-exported through the_ `src/screens/BaseScreen.ts` _shim). Every journey and screen descriptor uses the DSL +_ `registry.ts`_._

_Element lookup is cross-platform with no branching:_

| _Platform_ | _Strategy_         | _WDIO Selector_                            |
| ---------- | ------------------ | ------------------------------------------ |
| _iOS_      | _Accessibility ID_ | `~com.ariesbifold:id/Continue`             |
| _Android_  | _Resource ID_      | `android=new UiSelector().resourceId(...)` |

<a id="journeys"></a>

### Journeys

Tests are organized as **journeys**, not composable specs. Each `*.journey.ts` file is **one app session running one ordered sequence of checkpoints** (`it` blocks). Area suites glob them (`--suite verify` → `journeys/verify/*.journey.ts`). Runner-level `bail: 0` keeps files independent — a failed journey reports and the rest still run — while `mochaOpts.bail: true` stops the rest of a *single* file after its first failure, because later checkpoints depend on the state earlier ones left behind.

A journey earns its preconditions through the UI via **arrange flows** (`src/flows/`) — there is no state seeding — then chains dependent checkpoints so an expensive setup (a verification is ~5–8 min) is paid once and amortized. The active `TestUser` is set once and read via `src/support/context.ts`:

```typescript
// test/bcsc/journeys/verify/verified-photo.journey.ts (abridged)
import { TestUsers, Timeouts } from '../../../../src/constants.js'
import { completeOnboarding } from '../../../../src/flows/onboarding.js'
import {
  chooseAddAccount, completeVerification, enterBirthdate, enterSerialManually, startVerification,
} from '../../../../src/flows/verify.js'
import { HomeScreen } from '../../../../src/screens/main.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

describe('Verified journey: photo card', () => {
  before(() => setTestUser(TestUsers.photo)) // the active TestUser for every checkpoint below

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('enters the photo serial and submits the birthdate', async () => {
    await startVerification()
    await chooseAddAccount()
    await enterSerialManually(getTestUser())
    await enterBirthdate(getTestUser())
  })

  it('completes verification in person and lands on verified Home', async () => {
    await completeVerification(getTestUser(), { method: 'in-person' })
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
```

### Adding a test

- **A new checkpoint on an existing journey** — add an `it` that drives screen objects **by role**, placed so the preceding checkpoints leave the app in the state it needs. Assert arrival with `expectVisible()` before acting, and leave the app in a clean state for the next checkpoint.
- **A new screen** — add a descriptor to `src/screens/<stack>.ts` and its testID keys to `src/test-ids/registry.ts`. The keys must match what the app passes to `testIdWithKey` — **verify against the app source** (`grep testIdWithKey app/src/...`), don't guess. Anchor `self` on a stable, always-present element. For a screen with **no** usable testID (e.g. an inline `<Link>` iOS flattens into its paragraph), assert arrival by heading copy with `engine.findByText('…')` and return via the header `back` — but note not every stack sets `headerBackTestID` (AuthStack doesn't), so confirm the back button is addressable before relying on it.
- **A new journey** — add a `*.journey.ts` under the matching `test/bcsc/journeys/<area>/` directory; the area suite globs it automatically. `setTestUser()` in a `before` hook, arrange preconditions via `src/flows/`, then chain the checkpoints.
- **A new arrange flow** — if several journeys need the same UI-driven precondition, add it to `src/flows/<area>.ts` (used by ≥1 journey, reused by the rest) rather than duplicating steps.

Run just the file you are iterating on:

```bash
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --spec test/bcsc/journeys/verify/verified-photo.journey.ts
```

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

| _Trigger_            | _Suite_      | _Device Matrix_                     | _Variant_  | _Biometrics_ |
| -------------------- | ------------ | ----------------------------------- | ---------- | ------------ |
| _PR_                 | `smoke`      | _1 iOS (18) + 1 Android (15)_       | `bcsc-dev` | _No_         |
| _Nightly (schedule)_ | `regression` | _3 iOS (16–18) + 3 Android (13–15)_ | `bcsc-dev` | _Yes_        |

> _The nightly `regression` suite (all per-area journeys) replaces the retired `happy-path` / `full-regression` suites; the workflow wiring for it is being finalized separately._

_The device matrix is passed as a JSON array of_ `{platform, device, os_version}` _objects to_ `e2e.yml`_. Each entry spawns a separate SauceLabs session with its own logs and pass/fail status. Biometric tests run as a separate non-blocking job after the main E2E tests._

_**Note:** The_ `main` _merge E2E regression job is commented out pending GitHub Actions runner IP whitelisting with the BC Gov ID Check portal. See the IP whitelisting options documented in_ `main.yaml`_. Until resolved, nightly runs provide full regression coverage._

_**Concurrency:** SauceLabs sessions are limited to_ `max-parallel: 2`_. For PRs (2 devices = 2 jobs) this fits within a single round. Nightly runs with the full device matrix queue longer._

## _Local App Binaries_

_Place local builds in_ `e2e/apps/` _for local testing. See_ [`apps/README.md`](apps/README.md) _for instructions on producing builds._

## _Design Principles_

1. **_One test suite, many targets_** _— the same specs run locally and on SauceLabs. Config files are the only difference._
2. **_Variant + suite driven_** _— the_ `VARIANT` _env var selects which test directory to run (e.g._ `test/bcsc/`_), while_ `--suite` _selects scope:_ `smoke` _for a quick sanity check, or a per-area journey suite (_`onboarding`_,_ `auth`_,_ `verify`_,_ `main`_) for that area's ordered journeys._
3. **_Action-based screen objects_** _— specs drive screens by semantic role via typed descriptors (_`defineScreen`_, one file per stack under_ `src/screens/`_) on the_ `BaseScreen` _engine in_ `src/screens/core/`_. Test IDs come from one dependency-free registry (_`src/test-ids/registry.ts`_), so a renamed id is a single edit and undeclared roles fail at compile time._
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
│   ├── local/                               # local Appium: emulator/simulator + real-device caps
│   └── sauce/                               # SauceLabs service + rdc / migration / biometrics caps
│
├── src/
│   ├── constants.ts                         # Timeouts, TestUsers, TEST_PIN, and shared values
│   ├── e2eConfig.ts                         # variant detection (bcsc / bc-wallet)
│   ├── testIDs.ts                           # legacy flat registry (BCSC_TestIDs) — used by smoke + manual/ + migration/ specs
│   ├── v3TestIDs.ts                         # v3 native app selectors (iOS + Android) for migration
│   │
│   ├── test-ids/
│   │   └── registry.ts                      # single source of testID keys + com.ariesbifold:id/ prefix
│   │
│   ├── flows/                               # UI-driven arrange flows (earn preconditions; no seeding)
│   │   ├── onboarding.ts                    # completeOnboarding, skipToHome, skipNotificationsIfShown
│   │   ├── auth.ts                          # unlockWithPin, relaunchApp, selectAccountLandingIfPresent
│   │   ├── verify.ts                        # startVerification, enterSerialManually, completeVerification, evidence/email
│   │   └── main.ts                          # main-stack arrange helpers
│   │
│   ├── support/
│   │   └── context.ts                       # per-journey TestUser context (setTestUser / getTestUser)
│   │
│   ├── helpers/
│   │   ├── alerts.ts                        # iOS system alert acceptance (permissions, dialogs)
│   │   ├── approval.ts                      # in-person verification approval via SiteMinder
│   │   ├── biometrics.ts                    # biometric simulation (Sauce Labs RDC)
│   │   ├── camera.ts                        # camera image injection + padding (photos, QR, video)
│   │   ├── deep-link.ts                     # dispatch <scheme>:// deep links (pairing / login)
│   │   ├── email.ts                         # temp-inbox email verification helper
│   │   ├── gestures.ts                      # swipe, scroll, tap-at-coordinate wrappers
│   │   ├── pairing-code.ts                  # mint pairing codes / deep links against SIT
│   │   └── sauce.ts                         # SauceLabs-specific utilities (detection, annotations)
│   │
│   └── screens/                             # action-based screen-object DSL, one file per stack
│       ├── core/
│       │   ├── BaseScreen.ts                # cross-platform element lookup, tap, wait, scroll (engine)
│       │   ├── defineScreen.ts              # role → testID descriptor + typed Screen<S>
│       │   ├── appId.ts                     # bcsc(key): wraps a key in the shared prefix
│       │   └── index.ts                     # core barrel
│       ├── onboarding.ts                    # onboarding stack descriptors
│       ├── auth.ts                          # auth / unlock stack descriptors
│       ├── verify.ts                        # verify stack descriptors (entry + card-type + method screens)
│       ├── main.ts                          # main stack descriptors (tabs, settings, contacts, account, pairing, transfer)
│       └── BaseScreen.ts                    # deprecated shim → core/BaseScreen (keeps legacy specs compiling)
│
├── test/
│   ├── bc-wallet/                           # BC Wallet variant
│   │   └── smoke.spec.ts                    # app launch (default spec)
│   │
│   └── bcsc/                                # BCSC variant
│       ├── smoke.spec.ts                    # app launch + initial navigation (default spec)
│       │
│       ├── journeys/                        # per-area journeys — one file = one app session (globbed by the area suites)
│       │   ├── onboarding/
│       │   │   ├── onboarding.journey.ts            # happy-path onboarding → VerifyPrompt
│       │   │   └── onboarding-detours.journey.ts    # back-nav, webviews, help menu, onboarding settings, analytics decline
│       │   ├── auth/
│       │   │   └── auth-unlock.journey.ts           # unlock, Get Help, wrong-PIN retry, lockout
│       │   ├── verify/
│       │   │   ├── verify-entry.journey.ts          # entry spine (stops short of authorize)
│       │   │   ├── verify-entry-detours.journey.ts  # transfer/scan/OtherID detours + mismatched-serial error
│       │   │   ├── verified-photo.journey.ts        # photo card + send-video/live-call detours
│       │   │   ├── verified-non-photo.journey.ts    # non-photo card (+ additional photo ID)
│       │   │   ├── verified-combined.journey.ts     # combined card + login/deep-link/transfer/contacts/account
│       │   │   └── verified-non-bcsc.journey.ts     # non-BCSC (two IDs + address + email)
│       │   └── main/
│       │       ├── unverified-main.journey.ts       # unverified tab / QRCore gating
│       │       └── settings.journey.ts              # settings rows, change-PIN, auto-lock, reset/remove account
│       │
│       ├── manual/                          # camera/biometric flows — local or Sauce, NOT in the CI journey suites
│       │   ├── biometrics.spec.ts           # onboarding with biometric auth (--suite biometrics)
│       │   ├── card-csn-scanning.spec.ts    # card barcode scan (camera injection)
│       │   └── send-image-video.spec.ts     # photo/video capture (camera injection)
│       │
│       └── migration/                       # v3 → v4 upgrade (--suite migration; deprioritized)
│           ├── migration.spec.ts            # orchestrator: v3 onboarding → upgrade → v4 unlock
│           ├── migration-context.ts         # shared state (PIN) between v3 and v4 specs
│           ├── v3-onboarding.spec.ts        # v3 app onboarding + card verification
│           ├── upgrade.spec.ts              # install v4 over v3 via driver.installApp()
│           └── v4-unlock.spec.ts            # unlock v4 with the v3 PIN
│
├── assets/                                  # test images for camera injection
│   ├── README.md
│   ├── USERS.md                             # test account reference (Scooby-Doo themed)
│   └── images/                              # ID, driver's licence, and passport photos
│
├── logs/                                    # Appium logs (gitignored)
├── reports/                                 # JUnit + Allure output + failure screenshots (gitignored)
│
└── apps/                                    # local app binaries (gitignored)
    ├── .gitkeep
    └── README.md
```
