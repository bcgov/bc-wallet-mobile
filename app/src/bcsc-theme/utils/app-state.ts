import { AppStateStatus } from 'react-native'

/**
 * Whether an `AppStateStatus` should be treated as backgrounded for the purposes of
 * deactivating a camera or suppressing its runtime errors — covers a fully backgrounded
 * app and iOS's transitional 'inactive' state (app switcher, notification shade, an
 * incoming call). Any other value, including ones that shouldn't occur in practice
 * (e.g. 'unknown'), is treated as NOT backgrounded, so callers fail safe toward an
 * active camera with visible errors rather than one silently stuck off forever.
 */
export const isBackgroundedAppState = (status: AppStateStatus): boolean =>
  status === 'background' || status === 'inactive'
