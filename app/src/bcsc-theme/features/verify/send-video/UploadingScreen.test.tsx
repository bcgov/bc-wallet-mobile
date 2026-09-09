import ProgressBar from '@/components/ProgressBar'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import UploadingScreen from './UploadingScreen'
import useEvidenceUploadModel from './useEvidenceUploadModel'

jest.mock('./useEvidenceUploadModel')
jest.mock('@/components/ProgressBar', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))
jest.mock('@/bcsc-theme/components/BCAnimatedLoadingIcon', () => ({
  BCAnimatedLoadingIcon: () => null,
}))

const defaultModelReturn = {
  handleSend: jest.fn(),
  handleCancel: jest.fn(),
  isCancelling: false,
  uploadMessage: null,
  progressPercent: 0,
  isReady: true,
  isUploading: false,
}

describe('UploadingScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn })
  })

  afterEach(() => jest.useRealTimers())

  it('keeps the heading fixed, updates the status and stepper, and starts the upload only once', () => {
    const navigation = useNavigation()
    const view = render(<UploadingScreen navigation={navigation as never} />, { wrapper: BasicAppContext })

    expect(view.getByText('BCSC.SendVideo.UploadProgress.UploadingInformation')).toBeTruthy()
    expect(view.getByText('BCSC.SendVideo.UploadProgress.PreparingVideo')).toBeTruthy()
    expect(defaultModelReturn.handleSend).toHaveBeenCalledTimes(1)

    jest.mocked(useEvidenceUploadModel).mockReturnValue({
      ...defaultModelReturn,
      uploadMessage: 'Uploading your files',
      progressPercent: 50,
      isUploading: true,
    })
    view.rerender(<UploadingScreen navigation={navigation as never} />)

    expect(view.getByText('BCSC.SendVideo.UploadProgress.UploadingInformation')).toBeTruthy()
    expect(view.getByRole('progressbar', { name: 'Uploading your files' })).toBeTruthy()
    expect(jest.mocked(ProgressBar)).toHaveBeenLastCalledWith(
      expect.objectContaining({ progressPercent: 50 }),
      undefined
    )
    expect(defaultModelReturn.handleSend).toHaveBeenCalledTimes(1)
  })

  it('reveals Cancel after 10 seconds despite stage updates and calls the existing handler', async () => {
    const navigation = useNavigation()
    const view = render(<UploadingScreen navigation={navigation as never} />, { wrapper: BasicAppContext })
    const cancelId = testIdWithKey('CancelUpload')
    const reservedButton = view.getByTestId(cancelId, { includeHiddenElements: true })

    expect(reservedButton).toBeDisabled()
    expect(view.queryByRole('button', { name: 'Global.Cancel' })).toBeNull()
    await act(async () => fireEvent.press(reservedButton))
    expect(defaultModelReturn.handleCancel).not.toHaveBeenCalled()

    act(() => jest.advanceTimersByTime(5000))
    jest.mocked(useEvidenceUploadModel).mockReturnValue({
      ...defaultModelReturn,
      uploadMessage: 'Uploading your files',
      progressPercent: 50,
      isUploading: true,
    })
    view.rerender(<UploadingScreen navigation={navigation as never} />)

    act(() => jest.advanceTimersByTime(4999))
    expect(view.queryByRole('button', { name: 'Global.Cancel' })).toBeNull()

    act(() => jest.advanceTimersByTime(1))
    const cancelButton = view.getByRole('button', { name: 'Global.Cancel' })
    expect(cancelButton).toBe(reservedButton)
    expect(cancelButton).toBeEnabled()
    expect(view.getByText('BCSC.SendVideo.UploadProgress.UploadingInformation')).toBeTruthy()
    expect(view.getByRole('progressbar', { name: 'Uploading your files' })).toBeTruthy()

    await act(async () => fireEvent.press(cancelButton))
    expect(defaultModelReturn.handleCancel).toHaveBeenCalledTimes(1)
    expect(defaultModelReturn.handleSend).toHaveBeenCalledTimes(1)
  })

  it('disables Cancel while cancellation is in progress', async () => {
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn, isCancelling: true })
    const view = render(<UploadingScreen navigation={useNavigation() as never} />, { wrapper: BasicAppContext })

    act(() => jest.advanceTimersByTime(10000))
    const cancelButton = view.getByRole('button', { name: 'Global.Cancel' })
    expect(cancelButton).toBeDisabled()

    await act(async () => fireEvent.press(cancelButton))
    expect(defaultModelReturn.handleCancel).not.toHaveBeenCalled()
  })
})
