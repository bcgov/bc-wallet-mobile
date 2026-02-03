# Barcode Scanning Architecture

## Component Hierarchy

```
ScanSerialScreen
    ├── CodeScanningCamera (Enhanced)
    │   ├── GestureDetector (Pinch-to-Zoom)
    │   │   └── Camera (react-native-vision-camera)
    │   ├── Pressable (Tap-to-Focus)
    │   ├── Focus Indicator (Animated)
    │   ├── Barcode Highlights (Animated, Optional)
    │   ├── Scan Area Guide
    │   ├── Zoom Level Indicator
    │   └── Torch Toggle Button
    └── ScreenWrapper
        ├── Instructions Text
        ├── Highlight Toggle Switch
        └── Manual Entry Button
```

## Data Flow

```
User Interaction
    ↓
┌─────────────────────────────────────────┐
│  Pinch Gesture / Tap Focus              │
│  ↓                                      │
│  GestureDetector / Pressable            │
│  ↓                                      │
│  Update Zoom / Call camera.focus()     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Camera Frame Captured                  │
│  ↓                                      │
│  Code Scanner Processes Frame           │
│  ↓                                      │
│  Barcodes Detected                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Calculate Position & Orientation       │
│  ↓                                      │
│  Create EnhancedCode[] Array            │
│  ↓                                      │
│  Trigger onCodeScanned Callback         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Screen-Specific Processing             │
│  ↓                                      │
│  useCardScanner.scanCard()              │
│  ↓                                      │
│  Decode Barcode Data                    │
│  ↓                                      │
│  Navigate to Next Screen                │
└─────────────────────────────────────────┘
```

## Enhanced Code Interface

```typescript
interface EnhancedCode extends Code {
  // Original Code properties
  type: CodeType              // e.g., 'code-128', 'pdf-417'
  value: string               // Decoded barcode data
  corners: Point[]            // Barcode corner coordinates
  
  // New enhanced properties
  position?: {
    x: number                 // Top-left X coordinate
    y: number                 // Top-left Y coordinate
    width: number             // Bounding box width
    height: number            // Bounding box height
  }
  orientation?: 'horizontal' | 'vertical'
}
```

## Feature Layers

```
┌──────────────────────────────────────────────────┐
│              User Interface Layer                 │
│  - Toggle switches                                │
│  - Buttons                                        │
│  - Instructions                                   │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│           Interaction Layer                       │
│  - Pinch-to-Zoom (GestureDetector)              │
│  - Tap-to-Focus (Pressable)                      │
│  - Torch Toggle                                   │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│           Visualization Layer                     │
│  - Focus Indicator (Animated)                    │
│  - Barcode Highlights (Animated, Optional)       │
│  - Zoom Level Indicator                          │
│  - Scan Area Guide                               │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│           Camera Layer                            │
│  - Device Selection                              │
│  - Format Optimization                           │
│  - Focus Control                                 │
│  - Zoom Control                                  │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│           Scanning Layer                          │
│  - Code Type Filtering                           │
│  - Multi-Code Detection                          │
│  - Position Calculation                          │
│  - Orientation Detection                         │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│           Processing Layer                        │
│  - Barcode Decoding                              │
│  - Data Validation                               │
│  - Business Logic                                │
│  - Navigation                                    │
└──────────────────────────────────────────────────┘
```

## State Management

```typescript
CodeScanningCamera State:
├── zoom: number                           // Current zoom level
├── zoomOffset: number                     // Base zoom for pinch gesture
├── torchEnabled: boolean                  // Torch on/off
├── focusPoint: {x, y} | null             // Active focus point
├── detectedCodes: EnhancedCode[]         // Currently highlighted codes
├── focusOpacity: Animated.Value          // Focus animation
├── focusScale: Animated.Value            // Focus animation
└── highlightFadeAnim: Animated.Value     // Highlight animation

ScanSerialScreen State:
├── hasPermission: boolean                 // Camera permission
├── isLoading: boolean                     // Permission request state
└── showBarcodeHighlight: boolean         // User preference
```

## Camera Format Selection

```
Device Check
    ↓
┌──────────────────────────┐
│  iOS Platform?           │
├──────────────────────────┤
│  Yes: Max FPS            │
│  No:  60 FPS             │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│  Select Resolution       │
├──────────────────────────┤
│  Photo: 1920x1080        │
│  Video: Max Available    │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│  Enable Stabilization    │
├──────────────────────────┤
│  Mode: Auto              │
└──────────────────────────┘
    ↓
Optimized Format
```

## Device Selection Priority

```
iOS:
1. Ultra-Wide-Angle Camera (best focus)
2. Wide-Angle Camera (fallback)
3. Default Camera (last resort)

Android:
1. Wide-Angle Camera (best available)
2. Default Camera (fallback)
```

## Barcode Type Support

```
┌────────────────────────────────────────┐
│  Supported Barcode Types               │
├────────────────────────────────────────┤
│  code-39      → BC Services Card       │
│  code-128     → BC Services Card (old) │
│  pdf-417      → Driver's License       │
│  qr           → QR Codes               │
│  ean-13       → Product Barcodes       │
│  upc-a        → Product Barcodes       │
│  ...and more via vision-camera         │
└────────────────────────────────────────┘
```

## Performance Optimization Flow

```
Camera Initialization
    ↓
Select Optimal Device
    ↓
Configure Format (High FPS + Resolution)
    ↓
Enable Code Scanner
    ↓
┌─────────────────────────────────┐
│  Frame Captured                 │
│  ↓                              │
│  Scan for Codes (Native)        │
│  ↓                              │
│  Filter by Code Type            │
│  ↓                              │
│  Calculate Metadata (JS)        │
│  ↓                              │
│  Callback to App (Once)         │
└─────────────────────────────────┘
    ↓
Process in App Logic
    ↓
Update UI (if highlight enabled)
```

## Error Handling

```
Camera Error
    ↓
┌──────────────────────┐
│  Permission Denied?  │
├──────────────────────┤
│  Show Permission UI  │
└──────────────────────┘

Focus Error
    ↓
┌──────────────────────┐
│  Focus Canceled?     │
├──────────────────────┤
│  Ignore (expected)   │
└──────────────────────┘
    ↓
┌──────────────────────┐
│  Other Error?        │
├──────────────────────┤
│  Rethrow             │
└──────────────────────┘

Scan Error
    ↓
┌──────────────────────┐
│  Invalid Barcode?    │
├──────────────────────┤
│  Log & Continue      │
└──────────────────────┘
```

## Testing Strategy

```
Unit Tests
    ├── Component Rendering
    ├── Props Validation
    ├── State Management
    └── Snapshot Tests

Integration Tests (Manual)
    ├── Gesture Handling
    ├── Camera Interaction
    ├── Barcode Detection
    ├── Multi-Code Scanning
    └── Platform Compatibility

End-to-End Tests (Manual)
    ├── Full Scan Flow
    ├── Error Scenarios
    ├── Performance
    └── User Experience
```
