import NetInfo from '@react-native-community/netinfo'
import { PlatformContextProperty, PlatformContextRetriever } from '@snowplow/react-native-tracker'
import { Dimensions, PixelRatio, Platform } from 'react-native'
import {
  getBatteryLevel,
  getCarrier,
  getFreeDiskStorage,
  getManufacturer,
  getModel,
  getPowerState,
  getSystemVersion,
  getTotalDiskCapacity,
  getTotalMemory,
  getUsedMemory,
  isLandscape,
} from 'react-native-device-info'
import * as RNLocalize from 'react-native-localize'

/**
 * Returns a PlatformContextRetriever for analytics
 *
 * @param {boolean} enable - Flag to enable or disable the PlatformContextRetriever
 * @returns {*} {PlatformContextRetriever} The PlatformContextRetriever instance
 */
export const getPlatformContextRetriever = (enable: boolean): PlatformContextRetriever | undefined => {
  if (!enable) {
    return undefined
  }

  // TODO (MD): implement missing methods if possible
  return {
    getOsType: async () => Platform.OS,
    getOsVersion: async () => getSystemVersion(),
    getDeviceModel: async () => getModel(),
    getDeviceManufacturer: getManufacturer,
    getCarrier: safeAsync(_getCarrier),
    getNetworkType: safeAsync(_getNetworkType),
    getNetworkTechnology: safeAsync(_getNetworkTechnology),
    getAvailableStorage: safeAsync(getFreeDiskStorage),
    getTotalStorage: safeAsync(getTotalDiskCapacity),
    getPhysicalMemory: safeAsync(getTotalMemory),
    getAppAvailableMemory: safeAsync(_getAppAvailableMemory),
    getBatteryLevel: safeAsync(getBatteryLevel),
    getBatteryState: safeAsync(_getBatteryState),
    getLowPowerMode: safeAsync(_getLowPowerMode),
    isPortrait: safeAsync(_isPortrait),
    getResolution: safeAsync(_getResolution),
    getScale: safeAsync(_getScale),
    getLanguage: safeAsync(_getLanguage),
    // getAppleIdfa?: () => Promise<string | undefined>;
    // getAppleIdfv?: () => Promise<string | undefined>;
    // getAndroidIdfa?: () => Promise<string | undefined>;
    // getAppSetId: getAndroidId,
    // getAppSetIdScope?: () => Promise<string | undefined>;
  }
}

/**
 * Returns a list of optional properties of the platform context to be tracked
 *
 * @param {boolean} enable - Flag to enable or disable the PlatformContextProperties
 * @returns {*} {PlatformContextProperty[]} The list of PlatformContextProperty to be tracked
 */
export const getPlatformContextProperties = (enable: boolean): PlatformContextProperty[] | undefined => {
  if (!enable) {
    return undefined
  }

  return [
    PlatformContextProperty.Carrier,
    PlatformContextProperty.NetworkType,
    PlatformContextProperty.NetworkTechnology,
    PlatformContextProperty.PhysicalMemory,
    PlatformContextProperty.AppAvailableMemory,
    PlatformContextProperty.BatteryLevel,
    PlatformContextProperty.LowPowerMode,
    PlatformContextProperty.AvailableStorage,
    PlatformContextProperty.TotalStorage,
    PlatformContextProperty.IsPortrait,
    PlatformContextProperty.Resolution,
    PlatformContextProperty.Scale,
    PlatformContextProperty.Language,
    PlatformContextProperty.SystemAvailableMemory,
    // PlatformContextProperty.AppleIdfa,
    // PlatformContextProperty.AppleIdfv,
    // PlatformContextProperty.AndroidIdfa,
    // PlatformContextProperty.AppSetId,
    // PlatformContextProperty.AppSetIdScope,
  ]
}

// Helper functions for platform context retriever

const safeAsync = <T>(fn: () => Promise<T>): (() => Promise<T | undefined>) => {
  return async () => {
    try {
      return await fn()
    } catch {
      return undefined
    }
  }
}
const _getCarrier = async () => {
  const carrier = await getCarrier()
  return carrier || undefined
}

const _getAppAvailableMemory = async () => {
  const [totalMemory, usedMemory] = await Promise.all([getTotalMemory(), getUsedMemory()])
  return totalMemory - usedMemory
}

const _getBatteryState = async () => {
  const powerState = await getPowerState()
  if (powerState.batteryState === 'unknown') {
    return undefined
  }
  return powerState.batteryState
}

const _getLowPowerMode = async () => {
  const powerState = await getPowerState()
  return powerState.lowPowerMode
}

const _isPortrait = async () => {
  const landscapeMode = await isLandscape()
  return !landscapeMode
}

const _getResolution = async () => {
  const width = Dimensions.get('window').width
  const height = Dimensions.get('window').height

  return `${Math.floor(width)}x${Math.floor(height)}`
}

const _getScale = async () => {
  return PixelRatio.get()
}

const _getLanguage = async () => {
  return RNLocalize.getLocales()[0].languageCode
}

const _getNetworkType = async () => {
  const netInfo = await NetInfo.fetch()
  switch (netInfo.type) {
    case 'cellular':
      return 'mobile'
    case 'wifi':
    case 'ethernet':
      return 'wifi'
    case 'none':
    case 'unknown':
      return 'offline'
    default:
      return undefined
  }
}

const _getNetworkTechnology = async () => {
  const netInfo = await NetInfo.fetch()

  if (netInfo.type !== 'cellular' || netInfo.details.cellularGeneration === null) {
    return
  }

  return netInfo.details.cellularGeneration
}
