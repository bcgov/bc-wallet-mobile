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
    private readonly pairingService: PairingService
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

---

## AI Agent Specification: Adding a New Pairing Source

This section provides detailed specifications for AI agents implementing new pairing sources (e.g., QR codes, NFC, Bluetooth). Follow these guidelines to ensure consistency and maintainability.

### Architecture Pattern

All pairing sources follow the **ViewModel Adapter Pattern**:

1. **Service Layer** - Low-level platform integration (e.g., camera for QR, NFC reader)
2. **ViewModel Layer** - Parses source-specific data and delegates to `PairingService`
3. **PairingService** - Shared logic for buffering, navigation, and state management

**DO NOT** duplicate buffering, navigation, or pending state logic in your ViewModel. The `PairingService` handles all of this.

### Step-by-Step Implementation Checklist

#### 1. Update the Source Type (Required)

Add your new source to the `PairingPayload` type in `pairing/types.ts`:

```typescript
// In pairing/types.ts
export type PairingPayload = {
  serviceTitle: string
  pairingCode: string
  source: 'deep-link' | 'fcm' | 'manual' | 'qr' | 'nfc' | 'YOUR_NEW_SOURCE'
}
```

#### 2. Create a Feature Directory (Required)

Create a new feature directory following this structure:

```
app/src/bcsc-theme/features/YOUR_SOURCE/
├── index.ts                    # Public exports
├── YourSourceViewModel.ts      # ViewModel that delegates to PairingService
├── services/
│   └── your-source-service.ts  # Low-level platform integration
└── __tests__/
    └── YourSourceViewModel.test.ts
```

#### 3. Implement the Service Layer (Required)

Create a service that handles the platform-specific integration:

```typescript
// services/your-source-service.ts
export type YourSourcePayload = {
  // Raw data from your source (e.g., QR string, NFC tag data)
  rawData: string
  // Add any source-specific metadata
}

export type YourSourceHandler = (payload: YourSourcePayload) => void

export class YourSourceService {
  private handler: YourSourceHandler | null = null

  public subscribe(handler: YourSourceHandler): () => void {
    this.handler = handler
    return () => {
      this.handler = null
    }
  }

  public init(): void {
    // Initialize platform-specific listeners
    // Call this.handler when data is received
  }
}
```

#### 4. Implement the ViewModel (Required)

Create a ViewModel that parses your source data and delegates to `PairingService`:

```typescript
// YourSourceViewModel.ts
import { AbstractBifoldLogger } from '@bifold/core'
import { PairingService } from '../pairing'
import { YourSourceService, YourSourcePayload } from './services/your-source-service'

export class YourSourceViewModel {
  constructor(
    private readonly sourceService: YourSourceService,
    private readonly logger: AbstractBifoldLogger,
    private readonly pairingService: PairingService
  ) {}

  public initialize(): void {
    this.sourceService.subscribe(this.handlePayload.bind(this))
    this.sourceService.init()
  }

  private handlePayload(payload: YourSourcePayload): void {
    this.logger.info(`[YourSourceViewModel] Received: ${payload.rawData}`)

    const parsed = this.parsePayload(payload)
    if (!parsed) {
      this.logger.warn(`[YourSourceViewModel] Failed to parse payload`)
      return
    }

    // IMPORTANT: Always delegate to PairingService
    this.pairingService.handlePairing({
      serviceTitle: parsed.serviceTitle,
      pairingCode: parsed.pairingCode,
      source: 'your-source', // Use your source identifier
    })
  }

  private parsePayload(payload: YourSourcePayload): { serviceTitle: string; pairingCode: string } | null {
    // Implement your parsing logic here
    // Return null if parsing fails
  }
}
```

#### 5. Wire Up in App.tsx (Required)

Instantiate your ViewModel in `App.tsx` and pass the shared `PairingService`:

```typescript
// In App.tsx, after creating PairingService
const pairingService = new PairingService(logger)

// Create your ViewModel with the shared PairingService
const yourSourceViewModel = new YourSourceViewModel(
  new YourSourceService(),
  logger,
  pairingService // Pass the SAME instance
)

// Initialize in useEffect
useEffect(() => {
  yourSourceViewModel.initialize()
}, [])
```

#### 6. Write Tests (Required)

Create tests that verify:

1. The ViewModel initializes the service correctly
2. Valid payloads are delegated to `PairingService.handlePairing()`
3. Invalid payloads do not call `PairingService.handlePairing()`
4. The correct `source` identifier is passed

```typescript
// __tests__/YourSourceViewModel.test.ts
describe('YourSourceViewModel', () => {
  let mockService: { subscribe: jest.Mock; init: jest.Mock }
  let mockPairingService: { handlePairing: jest.Mock }
  let capturedHandler: ((payload: any) => void) | undefined

  beforeEach(() => {
    capturedHandler = undefined
    mockService = {
      subscribe: jest.fn((handler) => {
        capturedHandler = handler
        return () => undefined
      }),
      init: jest.fn(),
    }
    mockPairingService = { handlePairing: jest.fn() }
  })

  it('delegates valid payload to PairingService', () => {
    const viewModel = new YourSourceViewModel(
      mockService as any,
      { info: jest.fn(), warn: jest.fn() } as any,
      mockPairingService as any
    )

    viewModel.initialize()
    capturedHandler?.({ rawData: 'valid-data' })

    expect(mockPairingService.handlePairing).toHaveBeenCalledWith({
      serviceTitle: expect.any(String),
      pairingCode: expect.any(String),
      source: 'your-source',
    })
  })

  it('does not delegate invalid payload', () => {
    const viewModel = new YourSourceViewModel(
      mockService as any,
      { info: jest.fn(), warn: jest.fn() } as any,
      mockPairingService as any
    )

    viewModel.initialize()
    capturedHandler?.({ rawData: 'invalid' })

    expect(mockPairingService.handlePairing).not.toHaveBeenCalled()
  })
})
```

### What NOT to Do

❌ **DO NOT** create your own context/provider for pending state  
❌ **DO NOT** implement buffering logic in your ViewModel  
❌ **DO NOT** directly navigate to screens from your ViewModel  
❌ **DO NOT** create duplicate hooks like `useHasPendingYourSource`  
❌ **DO NOT** store pending pairing state in your ViewModel

All of the above is handled by `PairingService`.

### Validation Checklist

Before submitting your implementation, verify:

- [ ] Source type added to `PairingPayload` in `pairing/types.ts`
- [ ] ViewModel only parses data and calls `pairingService.handlePairing()`
- [ ] ViewModel does NOT have any pending/buffering state
- [ ] ViewModel does NOT directly call navigation
- [ ] Tests mock `PairingService` and verify `handlePairing()` calls
- [ ] ViewModel is instantiated in `App.tsx` with shared `PairingService`
- [ ] Feature directory follows the established structure
