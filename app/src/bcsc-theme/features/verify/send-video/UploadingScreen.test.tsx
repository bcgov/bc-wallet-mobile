import ProgressBar from '@/components/ProgressBar'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render } from '@testing-library/react-native'
import UploadingScreen from './UploadingScreen'
import useEvidenceUploadModel from './useEvidenceUploadModel'

jest.mock('./useEvidenceUploadModel')
jest.mock('@/components/ProgressBar', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))
jest.mock('@/bcsc-theme/features/splash-loading/BCAnimatedLoadingIcon', () => ({
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

  it('does not reveal a cancel button during a long upload', () => {
    const view = render(<UploadingScreen navigation={useNavigation() as never} />, { wrapper: BasicAppContext })

    act(() => jest.advanceTimersByTime(30000))

    expect(view.queryByTestId(testIdWithKey('CancelUpload'), { includeHiddenElements: true })).toBeNull()
    expect(view.queryByRole('button', { name: 'Global.Cancel', includeHiddenElements: true })).toBeNull()
  })
})
