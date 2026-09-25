// The real module loads react-native-nitro-modules, whose native TurboModule
// does not exist under jest. Mirrors the v5 API the app uses; tests that
// exercise camera behaviour override this with their own jest.mock.
const Camera = jest.fn(() => null)

const CommonResolutions = {
  VGA_16_9: { width: 480, height: 854 },
  FHD_16_9: { width: 1080, height: 1920 },
}

const permission = () => ({ hasPermission: true, requestPermission: jest.fn().mockResolvedValue(true) })

const useCameraDevice = jest.fn()
const useCameraPermission = jest.fn(permission)
const useMicrophonePermission = jest.fn(permission)
const usePhotoOutput = jest.fn(() => ({
  capturePhotoToFile: jest.fn(),
}))
const useVideoOutput = jest.fn(() => ({
  setOutputSettings: jest.fn(),
  createRecorder: jest.fn(),
}))

export {
  Camera,
  CommonResolutions,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  usePhotoOutput,
  useVideoOutput,
}
