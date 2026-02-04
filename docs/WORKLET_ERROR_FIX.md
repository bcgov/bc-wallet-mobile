# Worklet Error Fix - CodeScanningCamera

## Issue

Runtime crash when using pinch-to-zoom gesture:

```
com.facebook.jni.CppException: Object is not a function
TypeError: Object is not a function
    at CodeScanningCameraTsx2 (:1:123)
    at apply (native)
    at runWorklet_reactNativeGestureHandler_useAnimatedGestureTs3 (:1:250)
```

## Root Cause

The `constrainZoom` function was defined as a regular JavaScript function in the component scope:

```typescript
const constrainZoom = (value: number): number => {
  const deviceMinZoom = device?.minZoom ?? 1
  const deviceMaxZoom = device?.maxZoom ?? 1
  const effectiveMinZoom = Math.max(minZoom, deviceMinZoom)
  const effectiveMaxZoom = Math.min(maxZoom, deviceMaxZoom)
  return Math.max(effectiveMinZoom, Math.min(value, effectiveMaxZoom))
}
```

It was then called inside the gesture handler's worklet:

```typescript
const pinchGesture = Gesture.Pinch()
  .onUpdate((event) => {
    const newZoom = constrainZoom(zoomOffset.current * event.scale) // ❌ ERROR
    setZoom(newZoom)
  })
```

### Why This Fails

In **react-native-reanimated v2+**, gesture handlers run in a **worklet context** (a special JavaScript environment on the UI thread). Worklets:

1. Run on the UI thread for better performance
2. Cannot access regular JavaScript functions from the component scope
3. Can only access:
   - Variables/constants that are serializable
   - Other worklet functions (marked with `'worklet'` directive)
   - Built-in JavaScript functions (Math, etc.)

When the gesture handler tried to call `constrainZoom()`, it wasn't available in the worklet context, resulting in "Object is not a function" error.

## Solution

Move all logic inline within the gesture handler's callbacks:

```typescript
const pinchGesture = Gesture.Pinch()
  .enabled(enableZoom)
  .onUpdate((event) => {
    // Calculate new zoom level based on pinch scale
    const rawZoom = zoomOffset.current * event.scale
    
    // Constrain zoom level to device capabilities and configured limits
    // This logic must be inline to work in the worklet context
    const deviceMinZoom = device?.minZoom ?? 1
    const deviceMaxZoom = device?.maxZoom ?? 1
    const effectiveMinZoom = Math.max(minZoom, deviceMinZoom)
    const effectiveMaxZoom = Math.min(maxZoom, deviceMaxZoom)
    const newZoom = Math.max(effectiveMinZoom, Math.min(rawZoom, effectiveMaxZoom))
    
    setZoom(newZoom) // ✅ WORKS
  })
```

## Alternative Solutions

If you need to reuse complex logic across multiple worklets, you can:

### 1. Use the 'worklet' directive

```typescript
const constrainZoom = (value: number): number => {
  'worklet'; // Mark this function as a worklet
  const deviceMinZoom = device?.minZoom ?? 1
  const deviceMaxZoom = device?.maxZoom ?? 1
  const effectiveMinZoom = Math.max(minZoom, deviceMinZoom)
  const effectiveMaxZoom = Math.min(maxZoom, deviceMaxZoom)
  return Math.max(effectiveMinZoom, Math.min(value, effectiveMaxZoom))
}
```

**Limitation:** The function can only access variables that are available in the worklet context (no closures over component state).

### 2. Use useSharedValue and useAnimatedStyle

For more complex cases involving animated values:

```typescript
import { useSharedValue, useAnimatedGestureHandler } from 'react-native-reanimated'

const zoom = useSharedValue(1)

const gestureHandler = useAnimatedGestureHandler({
  onActive: (event) => {
    zoom.value = constrainZoom(event.scale)
  }
})
```

## Best Practices

1. **Keep worklet logic simple**: Inline simple calculations
2. **Mark reusable logic as worklets**: Use `'worklet'` directive for complex shared functions
3. **Test on physical devices**: Worklet errors only appear at runtime
4. **Read error messages carefully**: Stack traces will mention worklet context
5. **Avoid closures in worklets**: Don't reference component state/functions unless necessary

## Testing

To verify the fix:

1. Build and run the app on an Android device
2. Navigate to the barcode scanner screen
3. Use pinch gesture to zoom in/out
4. Verify no crashes occur
5. Confirm zoom level indicator updates correctly

## References

- [react-native-reanimated Worklets](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#worklet)
- [react-native-gesture-handler with Reanimated](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/migrating-off-rngh1/)
