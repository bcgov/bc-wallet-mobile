import NetInfo from '@react-native-community/netinfo'
import { PlatformContextProperty } from '@snowplow/react-native-tracker'
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

import { getPlatformContextProperties, getPlatformContextRetriever } from './platform-context-retriever'

describe('getPlatformContextRetriever', () => {
  describe('when disabled', () => {
    it('returns undefined', () => {
      expect(getPlatformContextRetriever(false)).toBeUndefined()
    })
  })

  describe('when enabled', () => {
    let retriever: NonNullable<ReturnType<typeof getPlatformContextRetriever>>

    beforeEach(() => {
      retriever = getPlatformContextRetriever(true)!
    })

    it('returns a PlatformContextRetriever object', () => {
      expect(retriever).toBeDefined()
    })

    describe('getOsType', () => {
      it('returns Platform.OS', async () => {
        const result = await retriever.getOsType!()
        expect(result).toBe(Platform.OS)
      })
    })

    describe('getOsVersion', () => {
      it('returns system version', async () => {
        const result = await retriever.getOsVersion!()
        expect(result).toBe(getSystemVersion())
      })
    })

    describe('getDeviceModel', () => {
      it('returns device model', async () => {
        const result = await retriever.getDeviceModel!()
        expect(result).toBe(getModel())
      })
    })

    describe('getDeviceManufacturer', () => {
      it('is the getManufacturer function', () => {
        expect(retriever.getDeviceManufacturer).toBe(getManufacturer)
      })
    })

    describe('getCarrier', () => {
      it('returns carrier string when non-empty', async () => {
        jest.mocked(getCarrier).mockResolvedValueOnce('Telus')
        const result = await retriever.getCarrier!()
        expect(result).toBe('Telus')
      })

      it('returns undefined when carrier is empty string', async () => {
        jest.mocked(getCarrier).mockResolvedValueOnce('')
        const result = await retriever.getCarrier!()
        expect(result).toBeUndefined()
      })

      it('returns undefined when getCarrier throws', async () => {
        jest.mocked(getCarrier).mockRejectedValueOnce(new Error('unavailable'))
        const result = await retriever.getCarrier!()
        expect(result).toBeUndefined()
      })
    })

    describe('getNetworkType', () => {
      it.each([
        ['cellular', 'mobile'],
        ['wifi', 'wifi'],
        ['ethernet', 'wifi'],
        ['none', 'offline'],
        ['unknown', 'offline'],
      ])('maps %s to %s', async (networkType, expected) => {
        jest.mocked(NetInfo.fetch).mockResolvedValueOnce({ type: networkType } as never)
        const result = await retriever.getNetworkType!()
        expect(result).toBe(expected)
      })

      it('returns undefined for unrecognized network type', async () => {
        jest.mocked(NetInfo.fetch).mockResolvedValueOnce({ type: 'bluetooth' } as never)
        const result = await retriever.getNetworkType!()
        expect(result).toBeUndefined()
      })

      it('returns undefined when NetInfo.fetch throws', async () => {
        jest.mocked(NetInfo.fetch).mockRejectedValueOnce(new Error('unavailable'))
        const result = await retriever.getNetworkType!()
        expect(result).toBeUndefined()
      })
    })

    describe('getNetworkTechnology', () => {
      it('returns cellular generation for cellular connections', async () => {
        jest.mocked(NetInfo.fetch).mockResolvedValueOnce({
          type: 'cellular',
          details: { cellularGeneration: '4g' },
        } as never)
        const result = await retriever.getNetworkTechnology!()
        expect(result).toBe('4g')
      })

      it('returns undefined for non-cellular connections', async () => {
        jest.mocked(NetInfo.fetch).mockResolvedValueOnce({ type: 'wifi', details: {} } as never)
        const result = await retriever.getNetworkTechnology!()
        expect(result).toBeUndefined()
      })

      it('returns undefined when cellularGeneration is null', async () => {
        jest.mocked(NetInfo.fetch).mockResolvedValueOnce({
          type: 'cellular',
          details: { cellularGeneration: null },
        } as never)
        const result = await retriever.getNetworkTechnology!()
        expect(result).toBeUndefined()
      })
    })

    describe('getAvailableStorage', () => {
      it('returns free disk storage', async () => {
        jest.mocked(getFreeDiskStorage).mockResolvedValueOnce(1024)
        const result = await retriever.getAvailableStorage!()
        expect(result).toBe(1024)
      })

      it('returns undefined when getFreeDiskStorage throws', async () => {
        jest.mocked(getFreeDiskStorage).mockRejectedValueOnce(new Error('unavailable'))
        const result = await retriever.getAvailableStorage!()
        expect(result).toBeUndefined()
      })
    })

    describe('getTotalStorage', () => {
      it('returns total disk capacity', async () => {
        jest.mocked(getTotalDiskCapacity).mockResolvedValueOnce(65536)
        const result = await retriever.getTotalStorage!()
        expect(result).toBe(65536)
      })

      it('returns undefined when getTotalDiskCapacity throws', async () => {
        jest.mocked(getTotalDiskCapacity).mockRejectedValueOnce(new Error('unavailable'))
        const result = await retriever.getTotalStorage!()
        expect(result).toBeUndefined()
      })
    })

    describe('getPhysicalMemory', () => {
      it('returns total memory', async () => {
        jest.mocked(getTotalMemory).mockResolvedValueOnce(8192)
        const result = await retriever.getPhysicalMemory!()
        expect(result).toBe(8192)
      })

      it('returns undefined when getTotalMemory throws', async () => {
        jest.mocked(getTotalMemory).mockRejectedValueOnce(new Error('unavailable'))
        const result = await retriever.getPhysicalMemory!()
        expect(result).toBeUndefined()
      })
    })

    describe('getAppAvailableMemory', () => {
      it('returns total memory minus used memory', async () => {
        jest.mocked(getTotalMemory).mockResolvedValueOnce(8000)
        jest.mocked(getUsedMemory).mockResolvedValueOnce(3000)
        const result = await retriever.getAppAvailableMemory!()
        expect(result).toBe(5000)
      })

      it('returns undefined when getTotalMemory throws', async () => {
        jest.mocked(getTotalMemory).mockRejectedValueOnce(new Error('unavailable'))
        const result = await retriever.getAppAvailableMemory!()
        expect(result).toBeUndefined()
      })
    })

    describe('getBatteryLevel', () => {
      it('returns battery level as integer percentage', async () => {
        jest.mocked(getBatteryLevel).mockResolvedValueOnce(0.75)
        const result = await retriever.getBatteryLevel!()
        expect(result).toBe(75)
      })

      it('rounds the battery level', async () => {
        jest.mocked(getBatteryLevel).mockResolvedValueOnce(0.456)
        const result = await retriever.getBatteryLevel!()
        expect(result).toBe(46)
      })

      it('returns undefined when getBatteryLevel throws', async () => {
        jest.mocked(getBatteryLevel).mockRejectedValueOnce(new Error('unavailable'))
        const result = await retriever.getBatteryLevel!()
        expect(result).toBeUndefined()
      })
    })

    describe('getBatteryState', () => {
      it('returns battery state when not unknown', async () => {
        jest.mocked(getPowerState).mockResolvedValueOnce({ batteryState: 'charging' } as never)
        const result = await retriever.getBatteryState!()
        expect(result).toBe('charging')
      })

      it('returns undefined when battery state is unknown', async () => {
        jest.mocked(getPowerState).mockResolvedValueOnce({ batteryState: 'unknown' } as never)
        const result = await retriever.getBatteryState!()
        expect(result).toBeUndefined()
      })

      it('returns undefined when getPowerState throws', async () => {
        jest.mocked(getPowerState).mockRejectedValueOnce(new Error('unavailable'))
        const result = await retriever.getBatteryState!()
        expect(result).toBeUndefined()
      })
    })

    describe('getLowPowerMode', () => {
      it('returns true when low power mode is active', async () => {
        jest.mocked(getPowerState).mockResolvedValueOnce({ lowPowerMode: true } as never)
        const result = await retriever.getLowPowerMode!()
        expect(result).toBe(true)
      })

      it('returns false when low power mode is inactive', async () => {
        jest.mocked(getPowerState).mockResolvedValueOnce({ lowPowerMode: false } as never)
        const result = await retriever.getLowPowerMode!()
        expect(result).toBe(false)
      })

      it('returns undefined when getPowerState throws', async () => {
        jest.mocked(getPowerState).mockRejectedValueOnce(new Error('unavailable'))
        const result = await retriever.getLowPowerMode!()
        expect(result).toBeUndefined()
      })
    })

    describe('isPortrait', () => {
      it('returns true when not in landscape mode', async () => {
        jest.mocked(isLandscape).mockResolvedValueOnce(false)
        const result = await retriever.isPortrait!()
        expect(result).toBe(true)
      })

      it('returns false when in landscape mode', async () => {
        jest.mocked(isLandscape).mockResolvedValueOnce(true)
        const result = await retriever.isPortrait!()
        expect(result).toBe(false)
      })

      it('returns undefined when isLandscape throws', async () => {
        jest.mocked(isLandscape).mockRejectedValueOnce(new Error('unavailable'))
        const result = await retriever.isPortrait!()
        expect(result).toBeUndefined()
      })
    })

    describe('getResolution', () => {
      it('returns floored width x height as string', async () => {
        const mockDimensions = { width: 390.5, height: 844.9, scale: 3, fontScale: 1 }
        // _getResolution calls Dimensions.get('window') twice (once for width, once for height)
        jest.spyOn(Dimensions, 'get').mockReturnValue(mockDimensions)
        const result = await retriever.getResolution!()
        expect(result).toBe('390x844')
        jest.spyOn(Dimensions, 'get').mockRestore()
      })

      it('returns undefined when Dimensions.get throws', async () => {
        jest.spyOn(Dimensions, 'get').mockImplementationOnce(() => {
          throw new Error('unavailable')
        })
        const result = await retriever.getResolution!()
        expect(result).toBeUndefined()
      })
    })

    describe('getScale', () => {
      it('returns the pixel ratio', async () => {
        jest.spyOn(PixelRatio, 'get').mockReturnValueOnce(3)
        const result = await retriever.getScale!()
        expect(result).toBe(3)
      })

      it('returns undefined when PixelRatio.get throws', async () => {
        jest.spyOn(PixelRatio, 'get').mockImplementationOnce(() => {
          throw new Error('unavailable')
        })
        const result = await retriever.getScale!()
        expect(result).toBeUndefined()
      })
    })

    describe('getLanguage', () => {
      it('returns the language code from the first locale', async () => {
        const result = await retriever.getLanguage!()
        expect(result).toBe('en')
      })
    })
  })
})

describe('getPlatformContextProperties', () => {
  it('returns undefined when disabled', () => {
    expect(getPlatformContextProperties(false)).toBeUndefined()
  })

  it('returns an array when enabled', () => {
    const result = getPlatformContextProperties(true)
    expect(Array.isArray(result)).toBe(true)
  })

  it('contains all expected PlatformContextProperty values', () => {
    const result = getPlatformContextProperties(true)
    expect(result).toEqual(
      expect.arrayContaining([
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
      ])
    )
  })
})
