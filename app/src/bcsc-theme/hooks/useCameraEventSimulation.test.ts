import { SIMULATE_CAMERA_EVENTS } from './useCameraEventSimulation'

describe('camera event simulation', () => {
  // The flags are for local debugging only; this fails if one is committed switched on
  it('is switched off', () => {
    expect(SIMULATE_CAMERA_EVENTS).toEqual({
      interruptionSeconds: 0,
      neverStarts: false,
      notReadyCapture: false,
      mediaServicesResets: 0,
    })
  })
})
