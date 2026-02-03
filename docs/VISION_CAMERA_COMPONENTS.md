# React Native Vision Camera Components

This document catalogs all components, screens, and utilities using `react-native-vision-camera` (v4.7.3) in the BC Wallet Mobile application.

> **Note**: For a focused list of components specifically used for **barcode/QR code scanning**, see [BARCODE_QR_SCANNING_COMPONENTS.md](./BARCODE_QR_SCANNING_COMPONENTS.md)

## Quick Reference Table

| Component/Screen | Camera Usage | Barcode/QR Scanning |
|-----------------|--------------|---------------------|
| CodeScanningCamera | ✅ Core scanning | ✅ Yes |
| MaskedCamera | ✅ Photo capture | ⚠️ Optional |
| ScanSerialScreen | ✅ Barcode scanning | ✅ Yes |
| EvidenceCaptureScreen | ✅ Photo + scanning | ✅ Yes |
| TransferQRScannerScreen | ✅ QR scanning | ✅ Yes |
| TakePhotoScreen | ✅ Photo capture | ❌ No |
| TakeVideoScreen | ✅ Video recording | ❌ No |
| StartCallScreen | ✅ Microphone only | ❌ No |
| useCardScanner | 🔧 Hook | ✅ Barcode processing |

## Core Camera Components

### CodeScanningCamera
**Location**: `app/src/bcsc-theme/components/CodeScanningCamera.tsx`

Specialized QR/barcode scanning component with:
- Multi-code type support (QR, PDF417, Code128)
- Tap-to-focus with visual feedback
- Torch toggle
- Configurable scan area overlay
- iOS ultra-wide-angle camera selection for better focus

**Key APIs**: `Camera`, `useCameraDevice`, `useCameraFormat`, `useCameraPermission`, `useCodeScanner`

### MaskedCamera
**Location**: `app/src/bcsc-theme/components/MaskedCamera.tsx`

Photo capture component with overlay guidance:
- Front/back camera selection
- SVG mask overlays (oval, rectangle)
- Optional code scanning during capture
- Photo capture with torch support
- Configurable format filters

**Key APIs**: `Camera`, `useCameraDevice`, `useCameraFormat`, `CodeScanner`

## Hooks

### useCardScanner
**Location**: `app/src/bcsc-theme/hooks/useCardScanner.tsx`

Business logic for BC Services Card and Driver's License scanning:
- Handles BC Services Card barcode (current and legacy formats)
- Decodes Driver's License PDF417 barcodes
- Extracts combo card data (serial + license metadata)
- Orchestrates device authorization flow

**Supported CodeTypes**: BC Services Card barcode, Old BC Services Card barcode, Driver's License barcode

## Screen Components

### TakePhotoScreen
**Location**: `app/src/bcsc-theme/features/verify/TakePhotoScreen.tsx`
- Uses `MaskedCamera` with oval mask
- Front-facing selfie capture for identity verification
- Permission handling via `useCameraPermission`

### TakeVideoScreen
**Location**: `app/src/bcsc-theme/features/verify/send-video/TakeVideoScreen.tsx`
- Direct `Camera` component usage
- Front-facing video recording (480p @ 24fps)
- Constrained duration recording (min/max bounds)
- Requires both camera and microphone permissions

### ScanSerialScreen
**Location**: `app/src/bcsc-theme/features/verify/ScanSerialScreen.tsx`
- Uses `CodeScanningCamera`
- Integrates with `useCardScanner` hook
- Handles BC Services Card and Driver's License barcode scanning

### EvidenceCaptureScreen
**Location**: `app/src/bcsc-theme/features/verify/non-photo/EvidenceCaptureScreen.tsx`
- Uses `MaskedCamera` with `useCodeScanner`
- Multi-step document photo capture
- Simultaneous barcode scanning during capture
- Photo review workflow

### TransferQRScannerScreen
**Location**: `app/src/bcsc-theme/features/account-transfer/transferee/TransferQRScannerScreen.tsx`
- QR code scanning for device-to-device account transfer
- Handles device attestation and authorization
- Uses `ScanCamera` from @bifold/core (vision-camera wrapper)

### StartCallScreen
**Location**: `app/src/bcsc-theme/features/verify/live-call/StartCallScreen.tsx`
- Uses `useMicrophonePermission` hook
- Prepares permissions for live video call verification

## Utilities

### camera-format.ts
**Location**: `app/src/bcsc-theme/components/utils/camera-format.ts`

Defines optimized camera format configurations:
- `MaskedWithBarcodeDetection`: 60 FPS, max video resolution, 720p photos

### DecoderStrategy.ts
**Location**: `app/src/bcsc-theme/utils/decoder-strategy/DecoderStrategy.ts`

Barcode decoding logic for BC Services Card and Driver's License formats.

## Common Patterns

### Permission Management
All screens use `useCameraPermission()` and `useMicrophonePermission()` with the `useAutoRequestPermission` hook for consistent permission handling.

### Device and Format Selection
- `useCameraDevice('front' | 'back')` selects camera
- `useCameraFormat(device, filters)` optimizes camera settings per use case
- iOS uses `physicalDevices: ['ultra-wide-angle-camera']` for focus capability

### Focus Management
Components use `useFocusEffect()` to manage torch state and camera activation lifecycle tied to screen focus.

### Code Scanning
`useCodeScanner()` provides reactive barcode/QR detection with configurable code types and frame callbacks.
