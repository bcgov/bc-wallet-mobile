# _E2E Tests_

_End-to-end tests for BC Wallet and BC Services Card apps using **WebDriverIO (WDIO) + Appium**. The same test suite runs locally (emulator/simulator) and on SauceLabs (real devices), with variant-aware test flows._

## _Design Principles_

1. **\*One test suite, many targets** — the same specs run locally and on SauceLabs. Config files are the only difference.\*
2. **\*Variant-driven, not variant-duplicated** — a single test file uses the* `VARIANT` *env var to branch flows, avoiding duplicate specs.\*
3. **\*Page Object Model** — screens are abstracted behind page objects that hide platform/selector details.\*
4. **\*Workspace package** —* `e2e/` *is a Yarn workspace package with its own* `package.json`*, isolated from* `app/`*.\*

## _Directory Structure_

```
e2e/
├── package.json                             # workspace package with WDIO + Appium deps
├── tsconfig.json                            # TypeScript config (strict, ESNext modules)
├── .env.saucelabs.example                   # template (copy to .env.saucelabs)
│
├── configs/
│   ├── wdio.shared.conf.ts                  # base WDIO config (framework, reporters, hooks)
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
│   ├── constants.ts                         # test IDs, timeouts, shared values
│   ├── variant.ts                           # variant detection + variant-specific config
│   │
│   ├── helpers/
│   │   ├── biometrics.ts                    # biometric simulation (local + SauceLabs)
│   │   ├── camera.ts                        # camera/image injection helpers
│   │   ├── gestures.ts                      # swipe, scroll, long-press wrappers
│   │   ├── sauce.ts                         # SauceLabs-specific utilities
│   │   └── waits.ts                         # custom wait strategies
│   │
│   ├── screens/                             # Page Object Model — one class per screen
│   │   ├── BaseScreen.ts                    # abstract base with shared selectors/actions
│   │   ├── OnboardingScreen.ts              # onboarding carousel + agreement
│   │   └── PinScreen.ts                     # PIN setup / entry
│   │
│   └── flows/                               # multi-screen orchestrations
│       └── onboarding.flow.ts               # complete onboarding (variant-aware)
│
├── test/
│   └── smoke.spec.ts                        # app launch + onboarding navigation
│
└── apps/                                    # local app binaries (gitignored)
    ├── .gitkeep
    └── README.md
```

## _Prerequisites_

- **\*Node.js 20+** and **Yarn\***
- _For local runs: [Appium 3](https://appium.io/) is installed as a devDependency; platform drivers are installed via the setup script_
- _For SauceLabs runs: a SauceLabs account with_ `SAUCE_USERNAME` _and_ `SAUCE_ACCESS_KEY`

## _Setup_

```bash
cd e2e
yarn install
yarn setup    # installs Appium drivers (uiautomator2 + xcuitest)
```

_The_ `yarn setup` _step registers the Appium drivers into Appium's driver registry. This is a one-time step (re-run if you upgrade Appium or want to update drivers)._

## _Running Tests_

### _Local — iOS Simulator_

```bash
# Place your .app build in e2e/apps/ (see apps/README.md)
yarn test:ios:local

# Run a single spec
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --spec test/smoke.spec.ts
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

# Run a single spec
yarn wdio configs/local/wdio.android.local.emu.conf.ts --spec test/smoke.spec.ts
```

### _Local — iOS Real Device_

```bash
# Place your .ipa build in e2e/apps/ (see apps/README.md)
# Requires: device UDID, Apple Team ID, signing identity
UDID=<device-udid> XCODE_ORG_ID=<team-id> yarn test:ios:device

# Run a single spec
UDID=<device-udid> XCODE_ORG_ID=<team-id> \
  yarn wdio configs/local/wdio.ios.local.device.conf.ts --spec test/smoke.spec.ts
```

_Find your device UDID via Finder (click the device name in the sidebar) or:_

```bash
xcrun xctrace list devices
```

### _Local — Android Real Device_

```bash
# Place your .apk build in e2e/apps/ (see apps/README.md)
# Connect device via USB with USB debugging enabled
UDID=<device-serial> yarn test:android:device

# Run a single spec
UDID=<device-serial> \
  yarn wdio configs/local/wdio.android.local.device.conf.ts --spec test/smoke.spec.ts
```

_Find your device serial via:_

```bash
adb devices
```

### _SauceLabs — Real Devices_

```bash
# One-time: create .env.saucelabs and add your credentials
cp e2e/.env.saucelabs.example e2e/.env.saucelabs
# Edit e2e/.env.saucelabs with SAUCE_USERNAME, SAUCE_ACCESS_KEY, APP_FILENAME

# Run on both platforms (env is loaded automatically from .env.saucelabs)
yarn test:sauce

# Or individually
yarn test:android:sauce
yarn test:ios:sauce
```

### _Variant Selection_

_All commands respect the_ `VARIANT` _env var. Defaults to_ `bcsc-dev` _if not set._

```bash
VARIANT=bcwallet-prod yarn test:ios:local
VARIANT=bcsc-qa yarn test:android:sauce
```

_Available variants:_ `bcsc-dev`_,_ `bcsc-test`_,_ `bcsc-qa`_,_ `bcsc-prod`_,_ `bcwallet-prod`_._

## _Environment Variables_

| _Variable_         | _Default_           | _Description_                                     |
| ------------------ | ------------------- | ------------------------------------------------- |
| `VARIANT`          | `bcsc-dev`          | _App variant to test_                             |
| `SAUCE_USERNAME`   | _—_                 | _SauceLabs username (sauce runs only)_            |
| `SAUCE_ACCESS_KEY` | _—_                 | _SauceLabs access key (sauce runs only)_          |
| `SAUCE_REGION`     | `us`                | _SauceLabs data center region (_`us` _or_ `eu`_)_ |
| `APP_FILENAME`     | _varies_            | _App filename in SauceLabs storage_               |
| `BUILD_NAME`       | `local-<timestamp>` | _SauceLabs build name_                            |
| `TEST_NAME`        | `E2E Tests`         | _SauceLabs test name_                             |
| `IOS_DEVICE`       | `iPhone 16`         | _iOS simulator/device name (local)_               |
| `IOS_VERSION`      | `18.3`              | _iOS simulator/device version (local)_            |
| `IOS_APP`          | `BCSC.app`          | _iOS app filename in_ `apps/` _(local sim)_       |
| `ANDROID_DEVICE`   | `Pixel_7_API_34`    | _Android emulator/device name (local)_            |
| `ANDROID_VERSION`  | `14.0`              | _Android emulator/device version (local)_         |
| `ANDROID_APP`      | `BCSC.apk`          | _Android app filename in_ `apps/` _(local)_       |
| `UDID`             | _—_                 | _Device UDID/serial (real device runs only)_      |
| `XCODE_ORG_ID`     | _—_                 | _Apple Team ID (iOS real device only)_            |
| `XCODE_SIGNING_ID` | `iPhone Developer`  | _Xcode signing identity (iOS real device only)_   |

## _Config Hierarchy_

```
wdio.shared.conf.ts                         ← base (specs, framework, reporters, hooks)
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

### _Page Objects_

_Screen interactions are encapsulated in page objects under_ `src/screens/`_. Each extends_ `BaseScreen` _which provides cross-platform element lookup via_ `testID`_:_

```typescript
// All elements are found by testID — cross-platform with no branching
await this.tapByTestId('com.ariesbifold:id/Continue')
```

| _Platform_ | _Strategy_         | _WDIO Selector_                            |
| ---------- | ------------------ | ------------------------------------------ |
| _iOS_      | _Accessibility ID_ | `~com.ariesbifold:id/Continue`             |
| _Android_  | _Resource ID_      | `android=new UiSelector().resourceId(...)` |

### _Flows_

_For multi-screen sequences, use flow helpers in_ `src/flows/` _rather than calling page objects directly:_

```typescript
import { completeFullOnboarding } from '../src/flows/onboarding.flow'

it('should complete onboarding', async () => {
  await completeFullOnboarding()
})
```

### _Variant-Aware Tests_

_Use_ `getVariantConfig()` _to branch behavior based on the active variant:_

```typescript
import { getVariantConfig } from '../src/variant'

const variant = getVariantConfig()
if (variant.family === 'bcsc') {
  // BCSC-specific flow
}
```

## _CI/CD_

_Tests run automatically in GitHub Actions:_

| _Trigger_      | _Scope_                | _Devices_                   |
| -------------- | ---------------------- | --------------------------- |
| _PR_           | `smoke.spec.ts` _only_ | _1 Android RDC + 1 iOS RDC_ |
| `main` _merge_ | _All specs_            | _Multiple device/OS combos_ |

## _Local App Binaries_

_Place local builds in_ `e2e/apps/` _for local testing. See_ `[apps/README.md](apps/README.md)` _for instructions on producing builds._
