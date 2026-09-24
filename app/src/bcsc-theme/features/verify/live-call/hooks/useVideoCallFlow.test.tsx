import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import useApi from '@bcsc-theme/api/hooks/useApi'
import useAlreadyVerifiedRecovery from '@bcsc-theme/hooks/useAlreadyVerifiedRecovery'
import useEvidenceUpload from '@bcsc-theme/hooks/useEvidenceUpload'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import { VideoCallFlowState } from '../types/live-call'
import useVideoCallFlow from './useVideoCallFlow'

jest.mock('@bcsc-theme/api/hooks/useApi')
jest.mock('@bcsc-theme/hooks/useEvidenceUpload')
jest.mock('@bcsc-theme/hooks/useAlreadyVerifiedRecovery')
jest.mock('@/utils/analytics/analytics-singleton', () => ({
  Analytics: { trackErrorEvent: jest.fn() },
}))
jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useServices: jest.fn(),
}))

const deferred = () => {
  let resolve!: () => void
  let reject!: (reason: Error) => void
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const conflictError = new AppError(
  'Conflict',
  { category: ErrorCategory.VERIFICATION, appEvent: AppEventCode.ALREADY_VERIFIED, statusCode: 2410 },
  {
    cause: new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, { status: 409 } as any),
    track: false,
  }
)

describe('useVideoCallFlow', () => {
  const video = { createVideoSession: jest.fn(), endVideoSession: jest.fn(), updateVideoCallStatus: jest.fn() }
  const uploadSelfiePhoto = jest.fn()
  const processAdditionalEvidence = jest.fn().mockResolvedValue([])
  const uploadEvidenceBinaries = jest.fn().mockResolvedValue(undefined)
  const recoverFromAlreadyVerified = jest.fn().mockResolvedValue(true)

  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .mocked(Bifold.useServices)
      .mockReturnValue([{ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }] as any)
    jest.mocked(useApi).mockReturnValue({ video } as any)
    jest
      .mocked(useEvidenceUpload)
      .mockReturnValue({ uploadSelfiePhoto, processAdditionalEvidence, uploadEvidenceBinaries } as any)
    jest.mocked(useAlreadyVerifiedRecovery).mockReturnValue({ recoverFromAlreadyVerified } as any)
  })

  const startThenCancelDuringUpload = async () => {
    const upload = deferred()
    uploadSelfiePhoto.mockReturnValueOnce(upload.promise)
    const { result } = renderHook(() => useVideoCallFlow(jest.fn()))
    let pending!: Promise<void>
    await act(async () => {
      pending = result.current.startVideoCall()
    })
    expect(result.current.flowState).toBe(VideoCallFlowState.UPLOADING_DOCUMENTS)
    await act(async () => {
      await result.current.cleanup()
    })
    return { result, upload, pending }
  }

  it('ignores a 409 from an upload that finishes after the user cancelled', async () => {
    const { result, upload, pending } = await startThenCancelDuringUpload()

    await act(async () => {
      upload.reject(conflictError)
      await pending
    })

    expect(recoverFromAlreadyVerified).not.toHaveBeenCalled()
    expect(Analytics.trackErrorEvent).not.toHaveBeenCalled()
    expect(result.current.flowState).not.toBe(VideoCallFlowState.ERROR)
    expect(video.createVideoSession).not.toHaveBeenCalled()
  })

  it('stops the upload chain when the selfie upload finishes after the user cancelled', async () => {
    const { upload, pending } = await startThenCancelDuringUpload()

    await act(async () => {
      upload.resolve()
      await pending
    })

    expect(processAdditionalEvidence).not.toHaveBeenCalled()
    expect(uploadEvidenceBinaries).not.toHaveBeenCalled()
    expect(video.createVideoSession).not.toHaveBeenCalled()
  })

  it('still recovers from a 409 when setup was not cancelled', async () => {
    uploadSelfiePhoto.mockRejectedValueOnce(conflictError)
    const { result } = renderHook(() => useVideoCallFlow(jest.fn()))

    await act(async () => {
      await result.current.startVideoCall()
    })

    expect(recoverFromAlreadyVerified).toHaveBeenCalledTimes(1)
    expect(video.createVideoSession).not.toHaveBeenCalled()
  })
})
