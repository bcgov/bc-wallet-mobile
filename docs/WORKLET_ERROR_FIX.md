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

## Root Causes (Fixed in Two Iterations)

### First Issue: Calling Regular Functions from Worklet

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

**Why This Fails:** Worklets cannot access regular JavaScript functions from the component scope.

### Second Issue: Calling React State Setters from Worklet

Even after inlining the constraint logic, calling `setZoom()` directly from the worklet still crashed:

```typescript
const pinchGesture = Gesture.Pinch()
  .onUpdate((event) => {
    const newZoom = calculateZoom(event.scale)
    setZoom(newZoom) // ❌ ERROR: Cannot call state setter from worklet
  })
```

**Why This Fails:** React state setters are JavaScript functions that must run on the JavaScript thread, not the UI thread where worklets execute.

### Why Worklets Have These Restrictions

In **react-native-reanimated v2+**, gesture handlers run in a **worklet context** (a special JavaScript environment on the UI thread). Worklets:

1. Run on the UI thread for better performance (60 FPS)
2. Cannot access regular JavaScript functions from the component scope
3. Cannot call React state setters directly
4. Can only access:
   - Variables/constants that are serializable
   - Other worklet functions (marked with `'worklet'` directive)
   - Built-in JavaScript functions (Math, etc.)
5. Must use `runOnJS` to call JavaScript functions

## Solution (Complete Fix)

The fix required two changes:

### 1. Inline the Constraint Logic

Move all calculations inline within the gesture handler:

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
    
    // ... (still need to fix state update)
  })
```

### 2. Use runOnJS for State Updates

Import and use `runOnJS` to call React state setters from worklet:

```typescript
import { runOnJS } from 'react-native-reanimated'

const pinchGesture = Gesture.Pinch()
  .enabled(enableZoom)
  .onUpdate((event) => {
    // ... calculation logic ...
    const newZoom = Math.max(effectiveMinZoom, Math.min(rawZoom, effectiveMaxZoom))
    
    // ✅ CORRECT: Wrap state setter with runOnJS
    runOnJS(setZoom)(newZoom)
  })
```

**How runOnJS works:**
- Schedules the function call to run on the JavaScript thread
- Allows worklets to safely update React state
- Maintains thread safety and prevents crashes

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
2. **Use runOnJS for React updates**: Always wrap state setters, callbacks, and side effects with `runOnJS`
3. **Mark reusable logic as worklets**: Use `'worklet'` directive for complex shared functions
4. **Test on physical devices**: Worklet errors only appear at runtime, not in development
5. **Read error messages carefully**: Stack traces will mention worklet context
6. **Avoid closures in worklets**: Don't reference component state/functions unless necessary
7. **Prefer useSharedValue for animations**: Use reanimated's `useSharedValue` instead of React state for smooth animations

### Common Patterns

**❌ Wrong: Direct state setter call**
```typescript
.onUpdate((event) => {
  setZoom(event.scale) // Crashes!
})
```

**✅ Correct: Wrapped with runOnJS**
```typescript
.onUpdate((event) => {
  runOnJS(setZoom)(event.scale) // Works!
})
```

**❌ Wrong: Calling external function**
```typescript
const helper = () => { /* ... */ }

.onUpdate((event) => {
  helper() // Crashes!
})
```

**✅ Correct: Inline or worklet directive**
```typescript
const helper = () => {
  'worklet'
  // ... logic ...
}

.onUpdate((event) => {
  helper() // Works!
})
```

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
