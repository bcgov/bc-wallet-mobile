import { View } from 'react-native'

const Easing = {
  linear: (t: number) => t,
  bezier: () => (t: number) => t,
}

module.exports = {
  __esModule: true,
  default: {
    addWhitelistedNativeProps: jest.fn(),
    createAnimatedComponent: (component: any) => component,
    View,
  },
  Easing,
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (factory: () => any) => factory(),
  useAnimatedProps: (factory: () => any) => factory(),
  withTiming: (toValue: unknown) => toValue,
  interpolate: jest.fn((value: number) => value),
  Extrapolation: { CLAMP: 'clamp' },
  runOnJS: (fn: any) => fn,
}
