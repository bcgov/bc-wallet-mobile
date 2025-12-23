# Pairing Service Architecture

## Overview

The `PairingService` is a centralized service that handles pairing requests from multiple sources. Currently it supports deep links and FCM push notifications, with the architecture designed to easily accommodate future sources like QR codes or manual entry. This refactoring consolidates what was previously duplicated logic across `DeepLinkViewModel` and `FcmViewModel` into a single, shared service.

## Why This Change?

Before this refactoring, both `DeepLinkViewModel` and `FcmViewModel` independently handled:

- Buffering pending pairing requests when navigation wasn't ready (required because the app may be launched from a stopped/cold state by a deep link or push notification, so navigation listeners aren't registered yet)
- Notifying listeners about pending state changes
- Emitting navigation events to the ServiceLogin screen

This duplication made it difficult to:

1. **Add new pairing sources** (e.g., QR codes, NFC) without copying the same buffering/navigation logic
2. **Maintain consistency** across different entry points
3. **Test the core pairing logic** in isolation

Now, `DeepLinkViewModel` and `FcmViewModel` are thin adapters that parse their respective inputs and delegate to `PairingService`.

## File Structure

```
app/src/bcsc-theme/features/
├── pairing/
│   ├── index.ts                    # Public exports
│   ├── PairingService.ts           # Core service - buffering, navigation, state
│   ├── PairingServiceContext.tsx   # React context and provider
│   ├── usePendingPairing.ts        # Hook for consuming pending pairing state
│   ├── types.ts                    # PairingPayload, PairingNavigationEvent, etc.
│   └── __tests__/
│       └── PairingService.test.ts  # Unit tests
│
├── deep-linking/
│   ├── DeepLinkViewModel.ts        # Parses deep link URLs → delegates to PairingService
│   └── services/
│       └── deep-linking.ts         # Low-level deep link subscription
│
└── fcm/
    ├── FcmViewModel.ts             # Decodes FCM JWT → delegates to PairingService
    └── services/
        └── fcm-service.ts          # Low-level FCM subscription
```

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Deep Link     │     │   FCM Push      │     │   QR Code       │
│   (URL)         │     │   (JWT)         │     │   (future)      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│DeepLinkViewModel│     │  FcmViewModel   │     │  QrViewModel    │
│  (parse URL)    │     │  (decode JWT)   │     │  (parse QR)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │    PairingService      │
                    │  • Buffer if nav not   │
                    │    ready               │
                    │  • Emit navigation     │
                    │  • Track pending state │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   ServiceLoginScreen   │
                    │  (displays pairing UI) │
                    └────────────────────────┘
```

## Adding a New Pairing Source

To add a new pairing source (e.g., QR code scanning):

1. Create a new ViewModel that handles the source-specific parsing
2. Inject `PairingService` into the ViewModel
3. Call `pairingService.handlePairing()` with the parsed data

```typescript
// Example: QrViewModel.ts
export class QrViewModel {
  constructor(
    private readonly qrService: QrService,
    private readonly pairingService: PairingService,
  ) {}

  public initialize() {
    this.qrService.subscribe(this.handleQrScan.bind(this))
  }

  private handleQrScan(qrData: string) {
    const { serviceTitle, pairingCode } = this.parseQrData(qrData)

    this.pairingService.handlePairing({
      serviceTitle,
      pairingCode,
      source: 'qr',
    })
  }
}
```

## Key Types

```typescript
type PairingPayload = {
  serviceTitle: string
  pairingCode: string
  source: 'deep-link' | 'fcm' | 'manual' | 'qr'
}

type PairingNavigationEvent = {
  screen: 'ServiceLogin'
  params: { serviceTitle: string; pairingCode: string }
}
```

## Usage in Components

```typescript
// In a component that needs to react to pending pairings
const { hasPendingPairing } = usePendingPairing()

// In MainStack to handle navigation
const pairingService = usePairingService()

useEffect(() => {
  return pairingService.onNavigationRequest((event) => {
    navigation.navigate(event.screen, event.params)
  })
}, [])
```
