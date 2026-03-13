# E2E Tests

End-to-end tests for BC Wallet and BC Services Card apps using **WebDriverIO (WDIO) + Appium**. The same test suite runs locally (emulator/simulator) and on SauceLabs (real devices), with variant-aware test flows.

## Design Principles

1. **One test suite, many targets** — the same specs run locally and on SauceLabs. Config files are the only difference.
2. **Variant-driven, not variant-duplicated** — a single test file uses the `VARIANT` env var to branch flows, avoiding duplicate specs.
3. **Page Object Model** — screens are abstracted behind page objects that hide platform/selector details.
4. **Workspace package** — `e2e/` is a Yarn workspace package with its own `package.json`, isolated from `app/`.

## Directory Structure

```
e2e/
├── package.json                             # workspace package with WDIO + Appium deps
├── tsconfig.json                            # TypeScript config (strict, ESNext modules)
├── .env.saucelabs.example                   # template for local SauceLabs credentials
│
├── configs/
│   ├── wdio.shared.conf.ts                  # base WDIO config (framework, reporters, hooks)
│   ├── local/
│   │   ├── wdio.shared.local.appium.conf.ts # local Appium server settings
│   │   ├── wdio.android.local.emu.conf.ts   # Android emulator capabilities
│   │   └── wdio.ios.local.sim.conf.ts       # iOS simulator capabilities
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

## Prerequisites

- **Node.js 20+** and **Yarn**
- For local runs: [Appium](https://appium.io/) and platform drivers are installed automatically via devDependencies
- For SauceLabs runs: a SauceLabs account with `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY`

## Setup

```bash
cd e2e
yarn install
```

## Running Tests

### Local — iOS Simulator

```bash
# Place your .app build in e2e/apps/ (see apps/README.md)
yarn test:ios:local

# Run a single spec
yarn wdio configs/local/wdio.ios.local.sim.conf.ts --spec test/smoke.spec.ts
```

### Local — Android Emulator

```bash
# Place your .apk build in e2e/apps/ (see apps/README.md)
yarn test:android:local

# Run a single spec
yarn wdio configs/local/wdio.android.local.emu.conf.ts --spec test/smoke.spec.ts
```

### SauceLabs — Real Devices

```bash
# Set credentials (or copy .env.saucelabs.example → .env.saucelabs and source it)
export SAUCE_USERNAME=your-username
export SAUCE_ACCESS_KEY=your-access-key
export APP_FILENAME=BCSC-Dev-123.aab   # filename as uploaded to SauceLabs storage

# Run on both platforms
yarn test:sauce

# Or individually
yarn test:android:sauce
yarn test:ios:sauce
```

### Variant Selection

All commands respect the `VARIANT` env var. Defaults to `bcsc-dev` if not set.

```bash
VARIANT=bcwallet-prod yarn test:ios:local
VARIANT=bcsc-qa yarn test:android:sauce
```

Available variants: `bcsc-dev`, `bcsc-test`, `bcsc-qa`, `bcsc-prod`, `bcwallet-prod`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VARIANT` | `bcsc-dev` | App variant to test |
| `SAUCE_USERNAME` | — | SauceLabs username (sauce runs only) |
| `SAUCE_ACCESS_KEY` | — | SauceLabs access key (sauce runs only) |
| `SAUCE_REGION` | `us` | SauceLabs data center region (`us` or `eu`) |
| `APP_FILENAME` | varies | App filename in SauceLabs storage |
| `BUILD_NAME` | `local-<timestamp>` | SauceLabs build name |
| `TEST_NAME` | `E2E Tests` | SauceLabs test name |
| `IOS_DEVICE` | `iPhone 16` | iOS simulator device name (local) |
| `IOS_VERSION` | `18.3` | iOS simulator version (local) |
| `IOS_APP` | `BCSC.app` | iOS app filename in `apps/` (local) |
| `ANDROID_DEVICE` | `Pixel_7_API_34` | Android emulator name (local) |
| `ANDROID_VERSION` | `14.0` | Android emulator version (local) |
| `ANDROID_APP` | `BCSC.apk` | Android app filename in `apps/` (local) |

## Config Hierarchy

```
wdio.shared.conf.ts                         ← base (specs, framework, reporters, hooks)
  ├── local/wdio.shared.local.appium.conf.ts   ← + local Appium service
  │   ├── local/wdio.android.local.emu.conf.ts    ← + Android emulator caps
  │   └── local/wdio.ios.local.sim.conf.ts         ← + iOS simulator caps
  └── sauce/wdio.shared.sauce.conf.ts          ← + SauceLabs service
      ├── sauce/wdio.android.sauce.rdc.conf.ts    ← + Android real device caps
      └── sauce/wdio.ios.sauce.rdc.conf.ts         ← + iOS real device caps
```

Each leaf config only contains **capabilities** (device name, platform version, app path). Everything else is inherited.

## Writing Tests

### Page Objects

Screen interactions are encapsulated in page objects under `src/screens/`. Each extends `BaseScreen` which provides cross-platform element lookup via `testID`:

```typescript
// All elements are found by testID — cross-platform with no branching
await this.tapByTestId('com.ariesbifold:id/Continue')
```

| Platform | Strategy | WDIO Selector |
|---|---|---|
| iOS | Accessibility ID | `~com.ariesbifold:id/Continue` |
| Android | Resource ID | `android=new UiSelector().resourceId(...)` |

### Flows

For multi-screen sequences, use flow helpers in `src/flows/` rather than calling page objects directly:

```typescript
import { completeFullOnboarding } from '../src/flows/onboarding.flow'

it('should complete onboarding', async () => {
  await completeFullOnboarding()
})
```

### Variant-Aware Tests

Use `getVariantConfig()` to branch behavior based on the active variant:

```typescript
import { getVariantConfig } from '../src/variant'

const variant = getVariantConfig()
if (variant.family === 'bcsc') {
  // BCSC-specific flow
}
```

## CI/CD

Tests run automatically in GitHub Actions:

| Trigger | Scope | Devices |
|---|---|---|
| PR | `smoke.spec.ts` only | 1 Android RDC + 1 iOS RDC |
| `main` merge | All specs | Multiple device/OS combos |

## Local App Binaries

Place local builds in `e2e/apps/` for local testing. See [`apps/README.md`](apps/README.md) for instructions on producing builds.
