export default {
  start: jest.fn(),
  stop: jest.fn(),
  setKeepScreenOn: jest.fn(),
  setSpeakerphoneOn: jest.fn(),
  setForceSpeakerphoneOn: jest.fn(),
  setMicrophoneMute: jest.fn(),
  checkRecordPermission: jest.fn().mockResolvedValue('granted'),
  checkCameraPermission: jest.fn().mockResolvedValue('granted'),
  requestRecordPermission: jest.fn().mockResolvedValue('granted'),
  requestCameraPermission: jest.fn().mockResolvedValue('granted'),
}
