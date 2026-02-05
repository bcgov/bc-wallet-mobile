# Barcode Highlight Delay Feature

## Overview

When the "Show Barcode Highlight" feature is enabled in the barcode scanner, a 10-second delay is now added before proceeding to the next screen/step after a successful scan. This allows users to see the visual feedback of the barcode highlight overlay before the app navigates away.

## Behavior

### When Highlight is Enabled (`showBarcodeHighlight = true`)

1. **Barcode Detected**: When a valid barcode is scanned
2. **Highlight Displayed**: Green border overlay appears around the detected barcode(s)
3. **10-Second Delay**: The app waits 10 seconds while displaying the highlight
4. **Highlight Fades**: After 10 seconds, the highlight fades out over 500ms
5. **Navigation**: Immediately after the delay, the app proceeds to the next screen

### When Highlight is Disabled (`showBarcodeHighlight = false`)

- **Immediate Navigation**: No delay is added, maintaining the original behavior
- The app proceeds to the next screen immediately after barcode detection

## Implementation Details

### Files Modified

1. **`ScanSerialScreen.tsx`**
   - Added conditional 10-second delay in the `onCodeScanned` callback
   - Uses `await new Promise(resolve => setTimeout(resolve, 10000))` for clean async/await pattern
   - Delay is applied before calling `scanner.completeScan()` and navigation methods

2. **`CodeScanningCamera.tsx`**
   - Updated highlight fade-out timing from 2 seconds to 10 seconds
   - Changed `setTimeout` delay from `2000ms` to `10000ms`
   - Ensures highlight remains visible for the entire delay period

### Code Changes

**ScanSerialScreen.tsx:**
```typescript
const onCodeScanned = async (barcodes: ScanableCode[]) => {
  await scanner.scanCard(barcodes, async (bcscSerial, license) => {
    // If barcode highlight is enabled, add a 10-second delay
    if (showBarcodeHighlight) {
      await new Promise(resolve => setTimeout(resolve, 10000))
    }
    
    // ... rest of the scanning logic
  })
}
```

**CodeScanningCamera.tsx:**
```typescript
// Keep highlight visible for 10 seconds to match navigation delay
setTimeout(() => {
  Animated.timing(highlightFadeAnim, {
    toValue: 0,
    duration: 500,
    useNativeDriver: true,
  }).start(() => {
    setDetectedCodes([])
  })
}, 10000) // Changed from 2000ms
```

## User Experience

### Timeline (with highlight enabled)

```
0ms    - Barcode detected
0ms    - Highlight appears (fade-in: 200ms)
200ms  - Highlight fully visible
...
10000ms - Highlight starts fading out (duration: 500ms)
10000ms - Navigation begins to next screen
10500ms - Highlight fully faded, navigation complete
```

### Benefits

1. **Visual Confirmation**: Users can clearly see which barcode(s) were detected
2. **Educational**: Helps users understand the barcode detection system
3. **Debugging**: Useful for testing and verifying barcode positioning
4. **Optional**: Feature can be toggled off for immediate navigation

## Testing

### Manual Test Cases

1. **Test with Highlight Enabled**
   - Enable "Show Barcode Highlight" toggle
   - Scan a BC Services Card barcode
   - Verify highlight appears immediately
   - Verify highlight remains visible for 10 seconds
   - Verify navigation occurs after 10 seconds
   - Verify highlight fades out smoothly

2. **Test with Highlight Disabled**
   - Disable "Show Barcode Highlight" toggle
   - Scan a BC Services Card barcode
   - Verify immediate navigation to next screen
   - Verify no delay occurs

3. **Test Multiple Barcodes**
   - Enable "Show Barcode Highlight"
   - Scan a combo card with multiple barcodes
   - Verify all barcodes are highlighted
   - Verify 10-second delay before navigation

4. **Test Toggle During Scan**
   - Enable highlight, scan a barcode
   - While highlight is showing, toggle off the setting
   - Verify behavior is consistent

### Edge Cases

- **Quick Toggle**: User toggles highlight on/off rapidly
  - Expected: Current state at scan time determines delay behavior
  
- **Multiple Scans**: User scans multiple times in quick succession
  - Expected: Scanner's `completeScan()` logic prevents multiple simultaneous scans

- **App Background**: User backgrounds app during delay
  - Expected: React Native lifecycle handles cleanup appropriately

## Configuration

### Adjusting the Delay

To change the delay duration, modify both files:

**ScanSerialScreen.tsx** (line 67):
```typescript
await new Promise(resolve => setTimeout(resolve, 10000)) // Change 10000 to desired ms
```

**CodeScanningCamera.tsx** (line 234):
```typescript
}, 10000) // Change 10000 to match the delay
```

> **Note**: Both values should match to ensure the highlight is visible for the entire delay period.

## Future Enhancements

Potential improvements for this feature:

1. **Configurable Delay**: Make the delay duration a user preference or prop
2. **Progress Indicator**: Show a countdown or progress bar during the delay
3. **Cancel Option**: Allow users to tap to proceed immediately
4. **Sound Feedback**: Add audio confirmation when barcode is detected
5. **Haptic Feedback**: Add vibration when barcode is detected

## Related Documentation

- [Barcode Scanning Optimizations](./BARCODE_SCANNING_OPTIMIZATIONS.md)
- [Barcode Scanner Usage Guide](./BARCODE_SCANNER_USAGE.md)
- [UI/UX Changes](./UI_UX_CHANGES.md)
