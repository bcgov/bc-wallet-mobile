# Barcode Scanner Usage Guide

## Quick Start

The enhanced `CodeScanningCamera` component provides advanced features for scanning small barcodes (code-39, code-128, PDF417) from physical cards.

### Basic Usage

```typescript
import CodeScanningCamera, { EnhancedCode } from '@/components/CodeScanningCamera'
import { CodeScannerFrame } from 'react-native-vision-camera'

const MyScreen = () => {
  const handleCodeScanned = (codes: EnhancedCode[], frame: CodeScannerFrame) => {
    codes.forEach(code => {
      console.log('Scanned:', code.type, code.value)
      console.log('Position:', code.position)
      console.log('Orientation:', code.orientation)
    })
  }

  return (
    <CodeScanningCamera
      codeTypes={['code-39', 'code-128', 'pdf-417']}
      onCodeScanned={handleCodeScanned}
      cameraType="back"
    />
  )
}
```

### Features

#### 1. Pinch-to-Zoom

Enable zoom functionality for scanning small barcodes:

```typescript
<CodeScanningCamera
  enableZoom={true}
  initialZoom={1.0}
  minZoom={1.0}
  maxZoom={4.0}
  // ...other props
/>
```

**User Experience:**
- Users can pinch to zoom in/out on the camera preview
- Zoom level indicator appears when zoomed
- Smooth gesture handling

#### 2. Tap-to-Focus

Already built-in! Users can tap on the barcode to focus:

```typescript
<CodeScanningCamera
  cameraType="back"
  // ...other props
/>
```

**User Experience:**
- Tap anywhere on the preview to focus
- Visual feedback with animated circle
- Improved scanning accuracy

#### 3. Barcode Highlight Overlay

Show visual feedback when barcodes are detected:

```typescript
const [showHighlight, setShowHighlight] = useState(false)

<CodeScanningCamera
  showBarcodeHighlight={showHighlight}
  // ...other props
/>
```

**User Experience:**
- Green border around detected barcodes
- Automatic fade animation
- Helps with card alignment

#### 4. Multiple Barcode Detection

Automatically scans all visible barcodes:

```typescript
const handleCodeScanned = (codes: EnhancedCode[], frame: CodeScannerFrame) => {
  // codes is an array of all detected barcodes
  if (codes.length > 1) {
    console.log('Multiple barcodes detected!')
  }
}
```

**Use Case:**
- BC Services Card combo cards (multiple barcodes)
- Scanning front and back of cards
- Batch scanning scenarios

#### 5. Position & Orientation Metadata

Each scanned code includes position and orientation:

```typescript
const handleCodeScanned = (codes: EnhancedCode[]) => {
  codes.forEach(code => {
    if (code.position) {
      console.log('X:', code.position.x)
      console.log('Y:', code.position.y)
      console.log('Width:', code.position.width)
      console.log('Height:', code.position.height)
    }
    console.log('Orientation:', code.orientation) // 'horizontal' or 'vertical'
  })
}
```

**Use Cases:**
- Highlighting barcode locations
- Validating barcode positioning
- Analytics and debugging

## Configuration Options

### CodeScanningCameraProps

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `codeTypes` | `CodeType[]` | required | Array of barcode types to scan |
| `onCodeScanned` | `function` | required | Callback when codes are detected |
| `cameraType` | `'front' \| 'back'` | `'back'` | Which camera to use |
| `showBarcodeHighlight` | `boolean` | `false` | Show visual feedback for detected codes |
| `enableZoom` | `boolean` | `true` | Enable pinch-to-zoom gesture |
| `initialZoom` | `number` | `1.0` | Initial zoom level |
| `minZoom` | `number` | `1.0` | Minimum zoom level |
| `maxZoom` | `number` | `4.0` | Maximum zoom level |
| `style` | `ViewStyle` | `undefined` | Custom container style |

### Supported Barcode Types

- `'code-39'` - BC Services Card (newer format)
- `'code-128'` - BC Services Card (legacy format)
- `'pdf-417'` - Driver's License
- `'qr'` - QR codes
- Many more supported by react-native-vision-camera

## Best Practices

### 1. Optimize for Small Barcodes

For small barcodes (like code-39, code-128):

```typescript
<CodeScanningCamera
  enableZoom={true}
  maxZoom={4.0}  // Allow significant zoom
  showBarcodeHighlight={true}  // Visual feedback
  // ...
/>
```

### 2. Handle Multiple Barcodes

Always handle arrays of codes:

```typescript
const handleCodeScanned = (codes: EnhancedCode[]) => {
  // Process all detected codes
  const bcscCodes = codes.filter(c => c.type === 'code-39')
  const licenseCodes = codes.filter(c => c.type === 'pdf-417')
  
  // Handle each type appropriately
  if (bcscCodes.length && licenseCodes.length) {
    // Combo card detected!
  }
}
```

### 3. Prevent Duplicate Scans

Use a flag to prevent processing the same scan multiple times:

```typescript
const scanningRef = useRef(true)

const handleCodeScanned = async (codes: EnhancedCode[]) => {
  if (!scanningRef.current) return
  
  scanningRef.current = false
  await processScannedCodes(codes)
  // Don't re-enable unless user explicitly retries
}
```

### 4. Provide User Guidance

Tell users about the features:

```typescript
<View>
  <Text>Pinch to zoom for small barcodes</Text>
  <Text>Tap to focus on the barcode</Text>
  <Switch
    value={showHighlight}
    onValueChange={setShowHighlight}
  />
  <Text>Show barcode highlight</Text>
</View>
```

## Troubleshooting

### Barcode Not Scanning

1. **Check lighting** - Use torch if needed
2. **Try zooming in** - Small barcodes need close-up view
3. **Tap to focus** - Ensure barcode is in focus
4. **Check barcode type** - Ensure it's in `codeTypes` array
5. **Check barcode condition** - Damaged barcodes may not scan

### Performance Issues

1. **Reduce FPS** - Lower frame rate on older devices
2. **Limit barcode types** - Only scan needed types
3. **Disable highlight** - Reduces rendering overhead
4. **Optimize callbacks** - Avoid heavy processing in `onCodeScanned`

### Platform Differences

**iOS:**
- Better focus control with ultra-wide camera
- Higher frame rates available
- May need camera permission in Info.plist

**Android:**
- Focus capability varies by device
- Fixed at 60 FPS for stability
- May need camera permission in AndroidManifest.xml

## Examples

See these screens for complete examples:

- `ScanSerialScreen.tsx` - Basic barcode scanning with toggle
- `EvidenceCaptureScreen.tsx` - Photo capture with scanning
- `TransferQRScannerScreen.tsx` - QR code scanning

## API Reference

See the full documentation in:
- `docs/BARCODE_SCANNING_OPTIMIZATIONS.md` - Complete feature documentation
- `docs/BARCODE_QR_SCANNING_COMPONENTS.md` - Component catalog

## Support

For issues or questions:
1. Check the documentation files in `/docs`
2. Review the example screens
3. Consult react-native-vision-camera documentation
