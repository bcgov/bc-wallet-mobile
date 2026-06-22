import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import Clipboard from '@react-native-clipboard/clipboard'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ReportProblemModal } from './ReportProblemModal'

const TEST_REFERENCE_CODE = 'TEST-CODE'

// The reference code (the "receipt") is produced by the shared util from PR #4076; stub it so the code
// surfaced to the user is deterministic. reportProblem() builds on this and, with no Loki URL configured
// in tests, simply returns the generated code.
jest.mock('@/utils/reference-code', () => ({
  generateReferenceCode: jest.fn(() => TEST_REFERENCE_CODE),
}))

describe('ReportProblemModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderModal = (onClose: () => void = jest.fn()) =>
    render(
      <BasicAppContext>
        <ReportProblemModal visible onClose={onClose} />
      </BasicAppContext>
    )

  const consentAndSubmit = (utils: ReturnType<typeof renderModal>) => {
    fireEvent.press(utils.getByTestId(testIdWithKey('ReportProblemConsent')))
    fireEvent.press(utils.getByTestId(testIdWithKey('ReportProblemSubmit')))
  }

  it('renders correctly', () => {
    const tree = renderModal()
    expect(tree.toJSON()).toMatchSnapshot()
  })

  it('does not submit until the consent checkbox is checked', () => {
    const { getByTestId, queryByTestId } = renderModal()

    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))

    // Submit is disabled without consent, so we should still be on the form (no reference code yet).
    expect(queryByTestId(testIdWithKey('ReportProblemReferenceCode'))).toBeNull()
  })

  it('shows the generated reference code after consenting and submitting', () => {
    const utils = renderModal()

    consentAndSubmit(utils)

    expect(utils.getByTestId(testIdWithKey('ReportProblemReferenceCode'))).toHaveTextContent(TEST_REFERENCE_CODE)
  })

  it('copies the reference code to the clipboard when copy is pressed', () => {
    const utils = renderModal()

    consentAndSubmit(utils)
    fireEvent.press(utils.getByTestId(testIdWithKey('ReportProblemCopyCode')))

    expect(Clipboard.setString).toHaveBeenCalledWith(TEST_REFERENCE_CODE)
  })

  it('calls onClose when Done is pressed in the success state', () => {
    const onClose = jest.fn()
    const utils = renderModal(onClose)

    consentAndSubmit(utils)
    fireEvent.press(utils.getByTestId(testIdWithKey('ReportProblemDone')))

    expect(onClose).toHaveBeenCalled()
  })
})
