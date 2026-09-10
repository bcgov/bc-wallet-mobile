// import { type CameraDeviceFormat } from 'react-native-vision-camera'
// import { CameraFormat } from './camera'
//
// type TestCameraDeviceFormat = Partial<CameraDeviceFormat> & { _id: string }
//
// const { getCameraFormat } = jest.requireActual(
//   'react-native-vision-camera/src/devices/getCameraFormat'
// ) as typeof import('react-native-vision-camera/src/devices/getCameraFormat')
//
// const RealDevice = {
//   id: 'real-device-id',
//   formats: [
//     {
//       _id: 'format-1',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 192,
//       videoHeight: 144,
//       photoWidth: 4032,
//       photoHeight: 3024,
//       videoStabilizationModes: ['auto', 'off'],
//     },
//     {
//       _id: 'format-2',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 352,
//       videoHeight: 288,
//       photoWidth: 3696,
//       photoHeight: 3024,
//       videoStabilizationModes: ['auto', 'off'],
//     },
//     {
//       _id: 'format-3',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 480,
//       videoHeight: 360,
//       photoWidth: 4032,
//       photoHeight: 3024,
//       videoStabilizationModes: ['auto', 'off'],
//     },
//     {
//       _id: 'format-4',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 640,
//       videoHeight: 480,
//       photoWidth: 4032,
//       photoHeight: 3024,
//       videoStabilizationModes: ['auto', 'off'],
//     },
//     {
//       _id: 'format-5',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 640,
//       videoHeight: 480,
//       photoWidth: 2016,
//       photoHeight: 1512,
//       videoStabilizationModes: ['auto', 'off'],
//     },
//     {
//       _id: 'format-6',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 960,
//       videoHeight: 540,
//       photoWidth: 4224,
//       photoHeight: 2384,
//       videoStabilizationModes: ['auto', 'cinematic', 'off', 'standard', 'cinematic-extended'],
//     },
//     {
//       _id: 'format-7',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 1024,
//       videoHeight: 768,
//       photoWidth: 4032,
//       photoHeight: 3024,
//       videoStabilizationModes: ['auto', 'off', 'standard'],
//     },
//     {
//       _id: 'format-8',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 30,
//       videoWidth: 1280,
//       videoHeight: 720,
//       photoWidth: 4224,
//       photoHeight: 2376,
//       videoStabilizationModes: ['auto', 'cinematic', 'off', 'standard', 'cinematic-extended'],
//     },
//     {
//       _id: 'format-9',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 1280,
//       videoHeight: 720,
//       photoWidth: 4224,
//       photoHeight: 2384,
//       videoStabilizationModes: ['auto', 'cinematic', 'off', 'standard', 'cinematic-extended'],
//     },
//     {
//       _id: 'format-10',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'contrast-detection',
//       maxFps: 60,
//       videoWidth: 1280,
//       videoHeight: 720,
//       photoWidth: 2112,
//       photoHeight: 1188,
//       videoStabilizationModes: ['auto', 'cinematic', 'off', 'standard', 'cinematic-extended'],
//     },
//     {
//       _id: 'format-11',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'contrast-detection',
//       maxFps: 240,
//       videoWidth: 1280,
//       videoHeight: 720,
//       photoWidth: 1280,
//       photoHeight: 720,
//       videoStabilizationModes: ['auto', 'off', 'standard'],
//     },
//     {
//       _id: 'format-12',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 1440,
//       videoHeight: 1080,
//       photoWidth: 2016,
//       photoHeight: 1512,
//       videoStabilizationModes: ['auto', 'off'],
//     },
//     {
//       _id: 'format-13',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 30,
//       videoWidth: 1920,
//       videoHeight: 1080,
//       photoWidth: 4224,
//       photoHeight: 2376,
//       videoStabilizationModes: ['auto', 'cinematic', 'off', 'standard', 'cinematic-extended'],
//     },
//     {
//       _id: 'format-14',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 1920,
//       videoHeight: 1080,
//       photoWidth: 4224,
//       photoHeight: 2384,
//       videoStabilizationModes: ['auto', 'cinematic', 'off', 'standard', 'cinematic-extended'],
//     },
//     {
//       _id: 'format-15',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'contrast-detection',
//       maxFps: 60,
//       videoWidth: 1920,
//       videoHeight: 1080,
//       photoWidth: 2112,
//       photoHeight: 1188,
//       videoStabilizationModes: ['auto', 'cinematic', 'off', 'standard', 'cinematic-extended'],
//     },
//     {
//       _id: 'format-16',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 120,
//       videoWidth: 1920,
//       videoHeight: 1080,
//       photoWidth: 1920,
//       photoHeight: 1080,
//       videoStabilizationModes: ['auto', 'cinematic', 'off', 'standard'],
//     },
//     {
//       _id: 'format-17',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'contrast-detection',
//       maxFps: 240,
//       videoWidth: 1920,
//       videoHeight: 1080,
//       photoWidth: 1920,
//       photoHeight: 1080,
//       videoStabilizationModes: ['auto', 'off', 'standard'],
//     },
//     {
//       _id: 'format-18',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 30,
//       videoWidth: 1920,
//       videoHeight: 1440,
//       photoWidth: 4032,
//       photoHeight: 3024,
//       videoStabilizationModes: ['auto', 'off'],
//     },
//     {
//       _id: 'format-19',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 1920,
//       videoHeight: 1440,
//       photoWidth: 2016,
//       photoHeight: 1512,
//       videoStabilizationModes: ['auto', 'off'],
//     },
//     {
//       _id: 'format-20',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 30,
//       videoWidth: 2592,
//       videoHeight: 1944,
//       photoWidth: 4032,
//       photoHeight: 3024,
//       videoStabilizationModes: ['auto', 'off'],
//     },
//     {
//       _id: 'format-21',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 30,
//       videoWidth: 3264,
//       videoHeight: 2448,
//       photoWidth: 4032,
//       photoHeight: 3024,
//       videoStabilizationModes: ['auto', 'off'],
//     },
//     {
//       _id: 'format-22',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 30,
//       videoWidth: 3840,
//       videoHeight: 2160,
//       photoWidth: 4224,
//       photoHeight: 2376,
//       videoStabilizationModes: ['auto', 'cinematic', 'off', 'standard', 'cinematic-extended'],
//     },
//     {
//       _id: 'format-23',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 60,
//       videoWidth: 3840,
//       videoHeight: 2160,
//       photoWidth: 3840,
//       photoHeight: 2160,
//       videoStabilizationModes: ['auto', 'cinematic', 'off', 'standard', 'cinematic-extended'],
//     },
//     {
//       _id: 'format-24',
//       supportsVideoHdr: false,
//       autoFocusSystem: 'phase-detection',
//       maxFps: 30,
//       videoWidth: 4032,
//       videoHeight: 3024,
//       photoWidth: 4032,
//       photoHeight: 3024,
//       videoStabilizationModes: ['auto', 'off'],
//     },
//   ],
// }
//
// const ModernDevice = {
//   id: 'modern-device-id',
//   formats: [
//     {
//       _id: 'modern-format-1',
//       supportsVideoHdr: true,
//       maxFps: 120,
//       photoHeight: 2160,
//       photoWidth: 3840,
//       videoHeight: 2160,
//       videoWidth: 3840,
//       videoStabilizationModes: ['standard', 'cinematic', 'auto'],
//     },
//     {
//       _id: 'modern-format-2',
//       supportsVideoHdr: false,
//       maxFps: 60,
//       photoHeight: 2160,
//       photoWidth: 3840,
//       videoHeight: 2160,
//       videoWidth: 3840,
//       videoStabilizationModes: ['standard', 'cinematic', 'auto'],
//     },
//     {
//       _id: 'modern-format-3',
//       supportsVideoHdr: false,
//       maxFps: 30,
//       photoHeight: 1080,
//       photoWidth: 1920,
//       videoHeight: 1080,
//       videoWidth: 1920,
//       videoStabilizationModes: ['standard', 'cinematic', 'auto'],
//     },
//     {
//       _id: 'modern-format-4',
//       supportsVideoHdr: false,
//       maxFps: 30,
//       photoHeight: 720,
//       photoWidth: 1280,
//       videoHeight: 720,
//       videoWidth: 1280,
//       videoStabilizationModes: ['standard', 'cinematic', 'auto'],
//     },
//   ] satisfies TestCameraDeviceFormat[],
// }
//
// const LegacyDevice = {
//   id: 'legacy-device-id',
//   formats: [
//     {
//       _id: 'legacy-format-1',
//       supportsVideoHdr: false,
//       maxFps: 30,
//       photoHeight: 1080,
//       photoWidth: 1920,
//       videoHeight: 1080,
//       videoWidth: 1920,
//       videoStabilizationModes: ['standard', 'cinematic', 'auto'],
//     },
//     {
//       _id: 'legacy-format-2',
//       supportsVideoHdr: false,
//       maxFps: 30,
//       photoHeight: 720,
//       photoWidth: 1280,
//       videoHeight: 720,
//       videoWidth: 1280,
//       videoStabilizationModes: ['standard', 'cinematic', 'auto'],
//     },
//     {
//       _id: 'legacy-format-3',
//       supportsVideoHdr: false,
//       maxFps: 24,
//       photoHeight: 480,
//       photoWidth: 640,
//       videoHeight: 480,
//       videoWidth: 640,
//       videoStabilizationModes: ['standard', 'cinematic', 'auto'],
//     },
//   ] satisfies TestCameraDeviceFormat[],
// }
//
// describe('CameraFormat', () => {
//   describe('CodeScanningFormat: ModernDevice', () => {
//     it('should return modern-format-3 for ModernDevice', () => {
//       const format: any = getCameraFormat(ModernDevice as any, CameraFormat.CodeScanningFormat)
//
//       expect(format?._id).toBe('modern-format-3')
//     })
//   })
//
//   describe('CodeScanningFormat: LegacyDevice', () => {
//     it('should return legacy-format-1 for LegacyDevice', () => {
//       const format: any = getCameraFormat(LegacyDevice as any, CameraFormat.CodeScanningFormat)
//
//       expect(format?._id).toBe('legacy-format-1')
//     })
//   })
//
//   describe('MaskedWithBarcodeDetection: ModernDevice', () => {
//     it('should return modern-format-3 for ModernDevice', () => {
//       const format: any = getCameraFormat(ModernDevice as any, CameraFormat.MaskedWithBarcodeDetection)
//
//       expect(format?._id).toBe('modern-format-3')
//     })
//   })
//
//   describe('MaskedWithBarcodeDetection: LegacyDevice', () => {
//     it('should return legacy-format-1 for LegacyDevice', () => {
//       const format: any = getCameraFormat(LegacyDevice as any, CameraFormat.MaskedWithBarcodeDetection)
//
//       expect(format?._id).toBe('legacy-format-1')
//     })
//   })
//
//   describe('MaskedWithBarcodeDetection: RealDevice', () => {
//     it('should return format-16 for RealDevice', () => {
//       const format: any = getCameraFormat(RealDevice as any, CameraFormat.MaskedWithBarcodeDetection)
//
//       expect(format?._id).toBe('format-16')
//     })
//   })
//
//   describe('SelfiePhotoFormat: ModernDevice', () => {
//     it('should return modern-format-3 for ModernDevice', () => {
//       const format: any = getCameraFormat(ModernDevice as any, CameraFormat.SelfiePhoto)
//
//       expect(format?._id).toBe('modern-format-3')
//     })
//
//     describe('SelfiePhotoFormat: LegacyDevice', () => {
//       it('should return legacy-format-1 for LegacyDevice', () => {
//         const format: any = getCameraFormat(LegacyDevice as any, CameraFormat.SelfiePhoto)
//
//         expect(format?._id).toBe('legacy-format-1')
//       })
//     })
//   })
//
//   describe('Filter priority invariants', () => {
//     // getCameraFormat assigns priority by array index (filters.length - index), so the first
//     // entry in each list carries the most weight. Pinning videoHdr to index 0 across every
//     // profile locks in the fix this branch made: previously videoHdr was duplicated across
//     // "tiers" and only the LAST occurrence counted, silently giving it the LOWEST priority
//     // instead of the highest.
//     it.each([
//       ['CodeScanningFormat', CameraFormat.CodeScanningFormat],
//       ['MaskedWithBarcodeDetection', CameraFormat.MaskedWithBarcodeDetection],
//       ['SelfiePhoto', CameraFormat.SelfiePhoto],
//     ])('ranks videoHdr:false as the highest-priority filter in %s', (_name, filters) => {
//       expect(filters[0]).toEqual({ videoHdr: false })
//     })
//   })
//
//   describe('Unique filter properties', () => {
//     it.each([
//       ['CodeScanningFormat', CameraFormat.CodeScanningFormat],
//       ['MaskedWithBarcodeDetection', CameraFormat.MaskedWithBarcodeDetection],
//       ['SelfiePhoto', CameraFormat.SelfiePhoto],
//     ])('has no duplicate filter properties in %s', (_name, filters) => {
//       const allProperties = filters.flatMap((filter) => Object.keys(filter))
//       const uniqueProperties = new Set(allProperties)
//
//       expect(allProperties).toHaveLength(uniqueProperties.size)
//     })
//   })
//
//   describe('HDR exclusion', () => {
//     // Identical in every other property so only the videoHdr filter can influence the outcome —
//     // isolates the HDR-exclusion behaviour from the weighted scoring of the other criteria.
//     const HdrComparisonDevice = {
//       id: 'hdr-comparison-device',
//       formats: [
//         {
//           _id: 'hdr-format',
//           supportsVideoHdr: true,
//           maxFps: 30,
//           photoHeight: 1080,
//           photoWidth: 1920,
//           videoHeight: 1080,
//           videoWidth: 1920,
//           videoStabilizationModes: ['auto'],
//         },
//         {
//           _id: 'non-hdr-format',
//           supportsVideoHdr: false,
//           maxFps: 30,
//           photoHeight: 1080,
//           photoWidth: 1920,
//           videoHeight: 1080,
//           videoWidth: 1920,
//           videoStabilizationModes: ['auto'],
//         },
//       ] satisfies TestCameraDeviceFormat[],
//     }
//
//     it('CodeScanningFormat: prefers a non-HDR format over an otherwise-identical HDR format', () => {
//       const format: any = getCameraFormat(HdrComparisonDevice as any, CameraFormat.CodeScanningFormat)
//
//       expect(format?._id).toBe('non-hdr-format')
//     })
//
//     it('MaskedWithBarcodeDetection: prefers a non-HDR format over an otherwise-identical HDR format', () => {
//       const format: any = getCameraFormat(HdrComparisonDevice as any, CameraFormat.MaskedWithBarcodeDetection)
//
//       expect(format?._id).toBe('non-hdr-format')
//     })
//
//     it('SelfiePhoto: prefers a non-HDR format over an otherwise-identical HDR format', () => {
//       const format: any = getCameraFormat(HdrComparisonDevice as any, CameraFormat.SelfiePhoto)
//
//       expect(format?._id).toBe('non-hdr-format')
//     })
//
//     // Every format on the device supports HDR, so the videoHdr filter can't award points to
//     // either side. Confirms the resolver degrades gracefully to the next-priority criterion
//     // (videoResolution) instead of erroring or picking arbitrarily.
//     const AllHdrDevice = {
//       id: 'all-hdr-device',
//       formats: [
//         {
//           _id: 'all-hdr-format-1080p',
//           supportsVideoHdr: true,
//           maxFps: 30,
//           photoHeight: 1080,
//           photoWidth: 1920,
//           videoHeight: 1080,
//           videoWidth: 1920,
//           videoStabilizationModes: ['auto'],
//         },
//         {
//           _id: 'all-hdr-format-4k',
//           supportsVideoHdr: true,
//           maxFps: 60,
//           photoHeight: 2160,
//           photoWidth: 3840,
//           videoHeight: 2160,
//           videoWidth: 3840,
//           videoStabilizationModes: ['auto'],
//         },
//       ] satisfies TestCameraDeviceFormat[],
//     }
//
//     it('CodeScanningFormat: falls back to the next-priority criterion when every format is HDR', () => {
//       const format: any = getCameraFormat(AllHdrDevice as any, CameraFormat.CodeScanningFormat)
//
//       expect(format?._id).toBe('all-hdr-format-1080p')
//     })
//
//     it('MaskedWithBarcodeDetection: falls back to the next-priority criterion when every format is HDR', () => {
//       const format: any = getCameraFormat(AllHdrDevice as any, CameraFormat.MaskedWithBarcodeDetection)
//
//       expect(format?._id).toBe('all-hdr-format-1080p')
//     })
//
//     it('SelfiePhoto: falls back to the next-priority criterion when every format is HDR', () => {
//       const format: any = getCameraFormat(AllHdrDevice as any, CameraFormat.SelfiePhoto)
//
//       expect(format?._id).toBe('all-hdr-format-1080p')
//     })
//   })
// })
