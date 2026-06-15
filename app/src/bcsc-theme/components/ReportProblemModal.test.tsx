import { bifoldLoggerInstance, testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ReportProblemModal } from './ReportProblemModal'

const TEST_SESSION_ID = 123456

describe('ReportProblemModal', () => {
  beforeAll(() => {
    // In the app `TOKENS.UTIL_LOGGER` resolves to a RemoteLogger (which exposes a numeric `sessionId`);
    // in tests the container resolves to the default bifold logger, so stub a deterministic session id
    // on that instance to assert the reference code shown to the user.
    const stubLogger = bifoldLoggerInstance as unknown as { sessionId: number }
    stubLogger.sessionId = TEST_SESSION_ID
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderModal = (onClose: () => void = jest.fn()) =>
    render(
      <BasicAppContext>
        <ReportProblemModal visible onClose={onClose} />
      </BasicAppContext>
    )

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

  it('shows the session id as a reference code after consenting and submitting', () => {
    const { getByTestId } = renderModal()

    fireEvent.press(getByTestId(testIdWithKey('ReportProblemConsent')))
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))

    expect(getByTestId(testIdWithKey('ReportProblemReferenceCode'))).toHaveTextContent(String(TEST_SESSION_ID))
  })

  it('calls onClose when Done is pressed in the success state', () => {
    const onClose = jest.fn()
    const { getByTestId } = renderModal(onClose)

    fireEvent.press(getByTestId(testIdWithKey('ReportProblemConsent')))
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemDone')))

    expect(onClose).toHaveBeenCalled()
  })
})
