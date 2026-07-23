import { reportProblem } from '@/utils/logger'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import Clipboard from '@react-native-clipboard/clipboard'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ReportProblemModal } from './ReportProblemModal'

// Override only reportProblem so we can assert how the modal calls it; the rest of the logger module
// (appLogger, createAppLogger, …) stays real so the render tree's other consumers keep working.
jest.mock('@/utils/logger', () => {
  const actual = jest.requireActual('@/utils/logger')
  return { __esModule: true, ...actual, reportProblem: jest.fn(() => 'TEST-CODE') }
})

const mockReportProblem = reportProblem as jest.MockedFunction<typeof reportProblem>

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

  // Submit is disabled until there's a non-empty description, so most tests need to type first.
  const enterDescription = (getByTestId: (id: string) => unknown, text = 'Something went wrong') =>
    fireEvent.changeText(getByTestId(testIdWithKey('ReportProblemDescription')) as never, text)

  it('renders correctly', () => {
    const tree = renderModal()
    expect(tree.toJSON()).toMatchSnapshot()
  })

  it('submits the report and shows the returned report ID when "Send report" is pressed', () => {
    const onClose = jest.fn()
    const { getByTestId, getByText } = renderModal(onClose)

    enterDescription(getByTestId)
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))

    expect(mockReportProblem).toHaveBeenCalledTimes(1)
    expect(getByTestId(testIdWithKey('ReportProblemReportId'))).toBeTruthy()
    expect(getByText('TEST-CODE')).toBeTruthy()
    // The confirmation view stays up until the user dismisses it.
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes from the confirmation view when "Done" is pressed', async () => {
    const onClose = jest.fn()
    const { getByTestId } = renderModal(onClose)

    enterDescription(getByTestId)
    // NOTE: This await prevents both presses from being triggered in the same tick.
    // usePreventDoublePress.preventDoublePress() will trigger without the await, and the second press will be ignored.
    await fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemDone')))

    expect(onClose).toHaveBeenCalled()
  })

  it('copies the report ID to the clipboard when copy is pressed', () => {
    const { getByTestId } = renderModal()

    enterDescription(getByTestId)
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemCopyReportId')))

    expect(Clipboard.setString).toHaveBeenCalledWith('TEST-CODE')
  })

  it('sends a report without an error so no stack trace is attached', () => {
    const { getByTestId } = renderModal()

    enterDescription(getByTestId)
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))

    // A user-initiated report isn't a thrown error — no `error` means reportProblem
    // omits the stack field from the Loki payload entirely
    const reportedProblem = mockReportProblem.mock.calls[0][0]
    expect(reportedProblem.error).toBeUndefined()
  })

  it('does not submit an empty (whitespace-only) report', () => {
    const onClose = jest.fn()
    const { getByTestId } = renderModal(onClose)

    enterDescription(getByTestId, '   ')
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))

    expect(mockReportProblem).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('sends one report and retires the submit button on press', () => {
    const { getByTestId, queryByTestId } = renderModal()

    enterDescription(getByTestId)
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))

    expect(mockReportProblem).toHaveBeenCalledTimes(1)
    // Swapping in the confirmation view is what stops a second tap; submittedRef additionally covers a
    // tap batched before that re-render, which can't be simulated by pressing the unmounted node here.
    expect(queryByTestId(testIdWithKey('ReportProblemSubmit'))).toBeNull()
  })

  // reportProblem defaults includeDeviceDetails to true, so passing no options is what attaches them.
  it('includes device details in the report', () => {
    const { getByTestId } = renderModal()

    enterDescription(getByTestId)
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))

    expect(mockReportProblem).toHaveBeenCalledWith(expect.anything())
  })
})
