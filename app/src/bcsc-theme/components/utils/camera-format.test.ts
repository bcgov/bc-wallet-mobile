import type { CameraDeviceFormat } from 'react-native-vision-camera'
import { CameraFormat } from './camera'

type TestCameraDeviceFormat = Partial<CameraDeviceFormat> & { _id: string }

const { getCameraFormat } = jest.requireActual(
  'react-native-vision-camera/src/devices/getCameraFormat'
) as typeof import('react-native-vision-camera/src/devices/getCameraFormat')

const ModernDevice = {
  id: 'modern-device-id',
  formats: [
    {
      _id: 'modern-format-1',
      supportsVideoHdr: true,
      maxFps: 120,
      photoHeight: 2160,
      photoWidth: 3840,
      videoHeight: 2160,
      videoWidth: 3840,
      videoStabilizationModes: ['standard', 'cinematic', 'auto'],
    },
    {
      _id: 'modern-format-2',
      supportsVideoHdr: false,
      maxFps: 60,
      photoHeight: 2160,
      photoWidth: 3840,
      videoHeight: 2160,
      videoWidth: 3840,
      videoStabilizationModes: ['standard', 'cinematic', 'auto'],
    },
    {
      _id: 'modern-format-3',
      supportsVideoHdr: false,
      maxFps: 30,
      photoHeight: 1080,
      photoWidth: 1920,
      videoHeight: 1080,
      videoWidth: 1920,
      videoStabilizationModes: ['standard', 'cinematic', 'auto'],
    },
    {
      _id: 'modern-format-4',
      supportsVideoHdr: false,
      maxFps: 30,
      photoHeight: 720,
      photoWidth: 1280,
      videoHeight: 720,
      videoWidth: 1280,
      videoStabilizationModes: ['standard', 'cinematic', 'auto'],
    },
  ] satisfies TestCameraDeviceFormat[],
}

const LegacyDevice = {
  id: 'legacy-device-id',
  formats: [
    {
      _id: 'legacy-format-1',
      supportsVideoHdr: false,
      maxFps: 30,
      photoHeight: 1080,
      photoWidth: 1920,
      videoHeight: 1080,
      videoWidth: 1920,
      videoStabilizationModes: ['standard', 'cinematic', 'auto'],
    },
    {
      _id: 'legacy-format-2',
      supportsVideoHdr: false,
      maxFps: 30,
      photoHeight: 720,
      photoWidth: 1280,
      videoHeight: 720,
      videoWidth: 1280,
      videoStabilizationModes: ['standard', 'cinematic', 'auto'],
    },
    {
      _id: 'legacy-format-3',
      supportsVideoHdr: false,
      maxFps: 24,
      photoHeight: 480,
      photoWidth: 640,
      videoHeight: 480,
      videoWidth: 640,
      videoStabilizationModes: ['standard', 'cinematic', 'auto'],
    },
  ] satisfies TestCameraDeviceFormat[],
}

describe('CameraFormat', () => {
  describe('CodeScanningFormat: ModernDevice', () => {
    it('should return modern-format-3 for ModernDevice', () => {
      const format: any = getCameraFormat(ModernDevice as any, CameraFormat.CodeScanningFormat)

      expect(format?._id).toBe('modern-format-3')
    })

    describe('CodeScanningFormat: LegacyDevice', () => {
      it('should return legacy-format-1 for LegacyDevice', () => {
        const format: any = getCameraFormat(LegacyDevice as any, CameraFormat.CodeScanningFormat)

        expect(format?._id).toBe('legacy-format-1')
      })
    })

    describe('MaskedWithBarcodeDetection: ModernDevice', () => {
      it('should return modern-format-3 for ModernDevice', () => {
        const format: any = getCameraFormat(ModernDevice as any, CameraFormat.MaskedWithBarcodeDetection)

        expect(format?._id).toBe('modern-format-3')
      })

      it('should return legacy-format-1 for LegacyDevice', () => {
        const format: any = getCameraFormat(LegacyDevice as any, CameraFormat.MaskedWithBarcodeDetection)

        expect(format?._id).toBe('legacy-format-1')
      })
    })

    describe('SelfiePhotoFormat: ModernDevice', () => {
      it('should return modern-format-3 for ModernDevice', () => {
        const format: any = getCameraFormat(ModernDevice as any, CameraFormat.SelfiePhoto)

        expect(format?._id).toBe('modern-format-3')
      })

      describe('SelfiePhotoFormat: LegacyDevice', () => {
        it('should return legacy-format-1 for LegacyDevice', () => {
          const format: any = getCameraFormat(LegacyDevice as any, CameraFormat.SelfiePhoto)

          expect(format?._id).toBe('legacy-format-1')
        })
      })
    })

    describe('SmallBarcodeScanning: ModernDevice', () => {
      it('should return modern-format-3 for ModernDevice', () => {
        const format: any = getCameraFormat(ModernDevice as any, CameraFormat.SmallBarcodeScanning)

        expect(format?._id).toBe('modern-format-2')
      })

      it('should return legacy-format-1 for LegacyDevice', () => {
        const format: any = getCameraFormat(LegacyDevice as any, CameraFormat.SmallBarcodeScanning)

        expect(format?._id).toBe('legacy-format-1')
      })
    })
  })
})
