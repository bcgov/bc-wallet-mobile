import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import UploadingScreen, { CANCEL_BUTTON_DELAY_MS } from './UploadingScreen'
import useEvidenceUploadModel from './useEvidenceUploadModel'

jest.mock('./useEvidenceUploadModel')

const defaultModelReturn = {
  handleSend: jest.fn(),
  handleCancel: jest.fn(),
  isCancelling: false,
  uploadMessage: null,
  isReady: true,
  isUploading: false,
}

describe('UploadingScreen', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <UploadingScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

  const advancePastCancelDelay = async () => {
    await act(async () => {
      jest.advanceTimersByTime(CANCEL_BUTTON_DELAY_MS)
    })
  }

  it('renders correctly', () => {
    const tree = renderScreen()
    expect(tree).toMatchSnapshot()
  })

  it('calls handleSend on mount', () => {
    const mockHandleSend = jest.fn()
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn, handleSend: mockHandleSend })

    renderScreen()

    expect(mockHandleSend).toHaveBeenCalledTimes(1)
  })

  it('hides the cancel button before the delay elapses', async () => {
    const { queryByTestId } = renderScreen()

    expect(queryByTestId(testIdWithKey('CancelUpload'))).toBeNull()

    // Still hidden right up to the delay
    await act(async () => {
      jest.advanceTimersByTime(CANCEL_BUTTON_DELAY_MS - 1)
    })

    expect(queryByTestId(testIdWithKey('CancelUpload'))).toBeNull()
  })

  it('keeps the cancel button mounted while hidden so the layout does not shift', () => {
    const { queryByTestId } = renderScreen()

    expect(queryByTestId(testIdWithKey('CancelUpload'), { includeHiddenElements: true })).not.toBeNull()
  })

  it('shows the cancel button after the delay elapses', async () => {
    const { queryByTestId } = renderScreen()

    await advancePastCancelDelay()

    expect(queryByTestId(testIdWithKey('CancelUpload'))).not.toBeNull()
  })

  it('calls handleCancel when cancel button is pressed', async () => {
    const mockHandleCancel = jest.fn()
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn, handleCancel: mockHandleCancel })

    const { getByTestId } = renderScreen()

    await advancePastCancelDelay()

    // The button's double-press guard sets state asynchronously
    await act(async () => {
      fireEvent.press(getByTestId(testIdWithKey('CancelUpload')))
    })

    expect(mockHandleCancel).toHaveBeenCalledTimes(1)
  })

  it('does not call handleCancel when the hidden cancel button is pressed', async () => {
    const mockHandleCancel = jest.fn()
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn, handleCancel: mockHandleCancel })

    const { getByTestId } = renderScreen()

    await act(async () => {
      fireEvent.press(getByTestId(testIdWithKey('CancelUpload'), { includeHiddenElements: true }))
    })

    expect(mockHandleCancel).not.toHaveBeenCalled()
  })

  it('disables cancel button when isCancelling is true', async () => {
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn, isCancelling: true })

    const { getByTestId } = renderScreen()

    await advancePastCancelDelay()

    expect(getByTestId(testIdWithKey('CancelUpload')).props.accessibilityState?.disabled).toBe(true)
  })

  it('clears the cancel button timer on unmount', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

    const { unmount } = renderScreen()
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()

    // No pending timer should fire (and warn about updating an unmounted component)
    await advancePastCancelDelay()

    clearTimeoutSpy.mockRestore()
  })

  it('displays uploadMessage when provided', () => {
    const uploadMessage = 'Uploading your evidence...'
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn, uploadMessage })

    const { getByText } = renderScreen()

    expect(getByText(uploadMessage)).toBeTruthy()
  })
})
