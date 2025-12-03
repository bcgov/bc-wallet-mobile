export const VolumeManager = {
  getVolume: jest.fn().mockResolvedValue({ volume: 0.5 }),
  setVolume: jest.fn().mockResolvedValue({ volume: 0.5 }),
  showNativeVolumeUI: jest.fn().mockResolvedValue({ show: true }),
  addVolumeListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}
