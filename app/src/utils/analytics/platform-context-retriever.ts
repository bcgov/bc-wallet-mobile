import NetInfo from '@react-native-community/netinfo'
import { PlatformContextProperty, PlatformContextRetriever } from '@snowplow/react-native-tracker'
import { Dimensions, PixelRatio, Platform } from 'react-native'
import {
  getAndroidId,
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
    getCarrier: getCarrier,
    getNetworkType: _getNetworkType,
    getNetworkTechnology: _getNetworkTechnology,
    // getAppleIdfa?: () => Promise<string | undefined>;
    // getAppleIdfv?: () => Promise<string | undefined>;
    getAvailableStorage: getFreeDiskStorage,
    getTotalStorage: getTotalDiskCapacity,
    getPhysicalMemory: getTotalMemory,
    getAppAvailableMemory: _getAppAvailableMemory,
    getBatteryLevel: getBatteryLevel,
    getBatteryState: _getBatteryState,
    getLowPowerMode: _getLowPowerMode,
    isPortrait: _isPortrait,
    getResolution: _getResolution,
    getScale: _getScale,
    getLanguage: _getLanguage,
    // getAndroidIdfa?: () => Promise<string | undefined>;
    getAppSetId: getAndroidId,
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
    // PlatformContextProperty.AppleIdfa,
    // PlatformContextProperty.AppleIdfv,
    PlatformContextProperty.PhysicalMemory,
    PlatformContextProperty.AppAvailableMemory,
    PlatformContextProperty.BatteryLevel,
    PlatformContextProperty.BatteryLevel,
    PlatformContextProperty.LowPowerMode,
    PlatformContextProperty.AvailableStorage,
    PlatformContextProperty.TotalStorage,
    PlatformContextProperty.IsPortrait,
    PlatformContextProperty.Resolution,
    PlatformContextProperty.Scale,
    PlatformContextProperty.Language,
    // PlatformContextProperty.AndroidIdfa,
    PlatformContextProperty.SystemAvailableMemory,
    PlatformContextProperty.AppSetId,
    // PlatformContextProperty.AppSetIdScope,
  ]
}

// Helper functions for platform context retriever

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
  return `${Dimensions.get('window').width}x${Dimensions.get('window').height}`
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
    case 'vpn':
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
