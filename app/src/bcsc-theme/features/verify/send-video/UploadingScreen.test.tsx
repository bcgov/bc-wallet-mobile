import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { testIdWithKey } from '@bifold/core'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import UploadingScreen from './UploadingScreen'
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
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn })
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <UploadingScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })

  it('calls handleSend on mount', () => {
    const mockHandleSend = jest.fn()
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn, handleSend: mockHandleSend })

    render(
      <BasicAppContext>
        <UploadingScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(mockHandleSend).toHaveBeenCalledTimes(1)
  })

  it('calls handleCancel when cancel button is pressed', () => {
    const mockHandleCancel = jest.fn()
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn, handleCancel: mockHandleCancel })

    const { getByTestId } = render(
      <BasicAppContext>
        <UploadingScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('CancelUpload')))
    expect(mockHandleCancel).toHaveBeenCalledTimes(1)
  })

  it('disables cancel button when isCancelling is true', () => {
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn, isCancelling: true })

    const { getByTestId } = render(
      <BasicAppContext>
        <UploadingScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(getByTestId(testIdWithKey('CancelUpload')).props.accessibilityState?.disabled).toBe(true)
  })

  it('displays uploadMessage when provided', () => {
    const uploadMessage = 'Uploading your evidence...'
    jest.mocked(useEvidenceUploadModel).mockReturnValue({ ...defaultModelReturn, uploadMessage })

    const { getByText } = render(
      <BasicAppContext>
        <UploadingScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(getByText(uploadMessage)).toBeTruthy()
  })
})
