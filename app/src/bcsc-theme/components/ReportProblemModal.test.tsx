import { reportProblem } from '@/utils/logger'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
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

  it('renders correctly', () => {
    const tree = renderModal()
    expect(tree.toJSON()).toMatchSnapshot()
  })

  it('submits the report and closes when "Send report" is pressed', () => {
    const onClose = jest.fn()
    const { getByTestId } = renderModal(onClose)

    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))

    expect(mockReportProblem).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalled()
  })

  it('omits device details by default', () => {
    const { getByTestId } = renderModal()

    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))

    expect(mockReportProblem).toHaveBeenCalledWith(expect.anything(), { includeDeviceDetails: false })
  })

  it('includes device details once the toggle is checked', () => {
    const { getByTestId } = renderModal()

    fireEvent.press(getByTestId(testIdWithKey('ReportProblemIncludeDeviceDetails')))
    fireEvent.press(getByTestId(testIdWithKey('ReportProblemSubmit')))

    expect(mockReportProblem).toHaveBeenCalledWith(expect.anything(), { includeDeviceDetails: true })
  })
})
