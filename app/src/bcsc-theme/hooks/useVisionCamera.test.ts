import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { CameraVideoOutput } from 'react-native-vision-camera'

import { useVisionCamera } from './useVisionCamera'

jest.mock('@bifold/core', () => ({
  __esModule: true,
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
  useServices: jest.fn(),
}))

const mockLogger = { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() }

// Mirrors VisionCamera v5: `recordedDuration` is live while recording and 0 once it has stopped
const createRecorder = () => {
  let onFinished: (filePath: string, reason: string) => void = () => undefined
  const recorder = {
    isRecording: false,
    isPaused: false,
    recordedDuration: 0,
    recordedFileSize: 100,
    startRecording: jest.fn(async (finished: typeof onFinished) => {
      onFinished = finished
      recorder.isRecording = true
    }),
    stopRecording: jest.fn(async () => {
      recorder.isRecording = false
      recorder.recordedDuration = 0
    }),
    finish: (reason = 'stopped') => onFinished('/tmp/recording.mov', reason),
  }
  return recorder
}

describe('useVisionCamera recording duration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Bifold).useServices.mockReturnValue([mockLogger] as any)
  })

  const renderRecording = async () => {
    const recorder = createRecorder()
    const videoOutput = {
      setOutputSettings: jest.fn(),
      createRecorder: jest.fn().mockResolvedValue(recorder),
    } as unknown as CameraVideoOutput
    const onRecordingFinished = jest.fn()
    const { result } = renderHook(() => useVisionCamera({ position: 'front', videoOutput }))

    await act(async () => {
      await result.current.startRecordingVideo({ onRecordingFinished, onRecordingError: jest.fn() })
    })

    return { result, recorder, onRecordingFinished }
  }

  it('reports the duration recorded just before stopping, not the 0 the recorder gives afterwards', async () => {
    const { result, recorder, onRecordingFinished } = await renderRecording()
    recorder.recordedDuration = 7.5

    await act(async () => {
      await result.current.stopRecordingVideo()
    })
    recorder.finish()

    expect(onRecordingFinished).toHaveBeenCalledWith(expect.objectContaining({ duration: 7.5, reason: 'stopped' }))
  })

  it("reports the recorder's own value for a recording that ended without stopRecordingVideo", async () => {
    const { recorder, onRecordingFinished } = await renderRecording()
    recorder.recordedDuration = 0
    recorder.isRecording = false

    recorder.finish('max-duration-reached')

    expect(onRecordingFinished).toHaveBeenCalledWith(expect.objectContaining({ duration: 0 }))
  })

  it('does not carry a stop-time duration over to the next recording', async () => {
    const { result, recorder, onRecordingFinished } = await renderRecording()
    recorder.recordedDuration = 7.5
    await act(async () => {
      await result.current.stopRecordingVideo()
    })
    recorder.finish()

    await act(async () => {
      await result.current.startRecordingVideo({ onRecordingFinished, onRecordingError: jest.fn() })
    })
    recorder.recordedDuration = 0
    recorder.finish()

    expect(onRecordingFinished).toHaveBeenLastCalledWith(expect.objectContaining({ duration: 0 }))
  })
})
