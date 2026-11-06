import type { BCState } from '@/store'
import { IASEnvironment } from '@/utils/environment'
import Config from 'react-native-config'
import { getBundleId } from 'react-native-device-info'
import { getActiveEnvironment } from './active-environment'

export function selectActiveEnvironment(state: BCState): IASEnvironment {
  return getActiveEnvironment({
    bundleId: getBundleId(),
    selectedEnvironment: state.developer.environment,
    buildEnvironmentName: Config.DEFAULT_ENVIRONMENT,
  })
}

export function selectNewEnvironment(environment: IASEnvironment): IASEnvironment {
  return getActiveEnvironment({
    bundleId: getBundleId(),
    selectedEnvironment: environment,
    buildEnvironmentName: Config.DEFAULT_ENVIRONMENT,
  })
}

export function selectInitialEnvironment(): IASEnvironment {
  return getActiveEnvironment({
    bundleId: getBundleId(),
    selectedEnvironment: undefined,
    buildEnvironmentName: Config.DEFAULT_ENVIRONMENT,
  })
}
