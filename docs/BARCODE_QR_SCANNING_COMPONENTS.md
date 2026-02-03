# Barcode and QR Code Scanning Components

This document identifies all components and screens that specifically use the camera for **barcode or QR code scanning** (not just photo/video capture).

## Quick Answer

**Components/Screens using camera specifically for barcode/QR scanning:**

1. ✅ **CodeScanningCamera** - Core barcode/QR scanning component
2. ✅ **ScanSerialScreen** - Scans BC Services Card & Driver's License barcodes
3. ✅ **EvidenceCaptureScreen** - Document photo capture with simultaneous barcode scanning
4. ✅ **TransferQRScannerScreen** - QR code scanning for device transfer
5. ✅ **useCardScanner** - Hook that processes barcode scan results

**NOT for barcode/QR scanning:**
- ❌ TakePhotoScreen - Photo capture only
- ❌ TakeVideoScreen - Video recording only
- ❌ StartCallScreen - Microphone permission only
- ❌ MaskedCamera - Primarily photo capture (scanning optional)

## Summary

**Total Scanning Components**: 4 screens + 1 core component + 1 hook

---

## Core Scanning Component

### 1. CodeScanningCamera
**Location**: `app/src/bcsc-theme/components/CodeScanningCamera.tsx`

**Purpose**: Dedicated barcode and QR code scanning camera component

**Scanning Features**:
- Multi-code type support: QR codes, PDF417, Code128, etc.
- Real-time code detection via `useCodeScanner`
- Configurable code types through `codeTypes` prop
- Tap-to-focus for better scan accuracy
- Torch for low-light scanning
- Visual scan area overlay

**Key Vision Camera APIs**:
- `useCodeScanner()` - Real-time code detection
- `useCameraDevice()` - Device selection
- `useCameraFormat()` - Format optimization
- `Camera` component with `codeScanner` prop

---

## Screens Using Barcode/QR Scanning

### 2. ScanSerialScreen
**Location**: `app/src/bcsc-theme/features/verify/ScanSerialScreen.tsx`

**Scanning Purpose**: Scan BC Services Card and Driver's License barcodes

**Implementation**:
- Uses `CodeScanningCamera` component
- Integrates with `useCardScanner` hook for business logic
- Scans multiple barcode formats:
  - BC Services Card barcode (current format)
  - BC Services Card barcode (legacy format)
  - BC Driver's License PDF417 barcode

**Code Types Scanned**: PDF417, Code128

**Workflow**:
1. User points camera at ID card barcode
2. `CodeScanningCamera` detects and decodes barcode
3. `useCardScanner` processes the scanned data
4. Navigates to appropriate next step based on card type

---

### 3. EvidenceCaptureScreen
**Location**: `app/src/bcsc-theme/features/verify/non-photo/EvidenceCaptureScreen.tsx`

**Scanning Purpose**: Simultaneously scan barcodes while capturing document photos

**Implementation**:
- Uses `MaskedCamera` component with `useCodeScanner` integration
- Dual functionality: photo capture + barcode scanning
- Automatically extracts barcode data from ID documents during photo capture

**Code Types Scanned**: BC Services Card and Driver's License barcodes

**Workflow**:
1. User captures photos of their ID document
2. While capturing, camera simultaneously scans for barcodes
3. If barcode detected, extracts serial number and metadata
4. Saves both photo and extracted barcode data

**Key Code**:
```typescript
const codeScanner = useCodeScanner({
  codeTypes: scanner.codeTypes,
  onCodeScanned: async (codes) => {
    await scanner.scanCard(codes, async (bcscSerial, license) => {
      // Process scanned barcode data
    })
  },
})
```

---

### 4. TransferQRScannerScreen
**Location**: `app/src/bcsc-theme/features/account-transfer/transferee/TransferQRScannerScreen.tsx`

**Scanning Purpose**: Scan QR codes for device-to-device account transfer

**Implementation**:
- Uses `ScanCamera` from @bifold/core (wrapper around vision-camera)
- Scans QR codes containing transfer authentication tokens
- Handles device attestation and authorization flow

**Code Types Scanned**: QR codes

**Workflow**:
1. Verified device displays QR code
2. New device scans QR code
3. Extracts transfer authentication data
4. Completes device authorization and account transfer

---

## Hooks for Barcode Scanning

### 5. useCardScanner
**Location**: `app/src/bcsc-theme/hooks/useCardScanner.tsx`

**Purpose**: Business logic hook for processing scanned BC Services Card and Driver's License data

**Scanning Logic**:
- Decodes multiple barcode formats
- Extracts serial numbers from BC Services Card barcodes
- Extracts metadata from Driver's License PDF417 barcodes
- Handles "combo cards" (cards with both serial and license data)
- Orchestrates device authorization flow

**Supported Barcode Types**:
```typescript
codeTypes: [
  BC_SERVICES_CARD_BARCODE,           // Code128
  OLD_BC_SERVICES_CARD_BARCODE,       // Code128 (legacy)
  DRIVERS_LICENSE_BARCODE             // PDF417
]
```

**Key Methods**:
- `scanCard()` - Main scanning handler
- `handleScanComboCard()` - Processes combo card (serial + license)
- `handleScanBCServicesCard()` - Processes BC Services Card only
- `handleScanDriversLicense()` - Processes Driver's License only

---

## Non-Scanning Camera Components (For Reference)

These components use the camera but **NOT** for barcode/QR scanning:

- **TakePhotoScreen** - Selfie photo capture only (no scanning)
- **TakeVideoScreen** - Video recording only (no scanning)
- **MaskedCamera** - Photo capture component (scanning is optional)
- **StartCallScreen** - Microphone permission only (no camera)

---

## Technical Implementation Details

### Code Scanning Configuration

**Optimal Format for Barcode Scanning** (from `camera-format.ts`):
```typescript
MaskedWithBarcodeDetection: [
  { fps: 60 },                      // High FPS for better detection
  { videoResolution: 'max' },       // Max resolution for clarity
  { photoResolution: PHOTO_RESOLUTION_720P }
]
```

### Permission Handling

All scanning screens use:
```typescript
const { hasPermission, requestPermission } = useCameraPermission()
```

And handle permission states with:
- `useAutoRequestPermission` hook for automatic permission requests
- `PermissionDisabled` component for denied permissions
- `LoadingScreenContent` during permission requests

### Common Pattern

```typescript
// 1. Define code types to scan
const codeTypes = [QR_CODE, PDF417, CODE128]

// 2. Set up code scanner
const codeScanner = useCodeScanner({
  codeTypes,
  onCodeScanned: (codes, frame) => {
    // Process scanned codes
  }
})

// 3. Pass to Camera component
<Camera
  codeScanner={codeScanner}
  // ... other props
/>
```

---

## Summary Table

| Component/Screen | Scanning Type | Code Types | Primary Purpose |
|-----------------|---------------|------------|-----------------|
| CodeScanningCamera | Barcode/QR | Configurable | Core scanning component |
| ScanSerialScreen | Barcode | Code128, PDF417 | Scan ID card barcodes |
| EvidenceCaptureScreen | Barcode | Code128, PDF417 | Document photo + barcode scan |
| TransferQRScannerScreen | QR Code | QR | Device transfer authentication |
| useCardScanner | Barcode | Code128, PDF417 | Barcode processing logic |

---

## Related Files

- **Decoder**: `app/src/bcsc-theme/utils/decoder-strategy/DecoderStrategy.ts`
- **Constants**: `app/src/constants.ts` (barcode type definitions)
- **Format Config**: `app/src/bcsc-theme/components/utils/camera-format.ts`
