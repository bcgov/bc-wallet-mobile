import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import PendingReviewScreen from './PendingReviewScreen'
import moment from 'moment'

jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    evidence: {
      getVerificationRequestStatus: jest.fn(),
      cancelVerificationRequest: jest.fn(),
    },
    token: {
      checkDeviceCodeStatus: jest.fn(),
    },
  })),
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  useSecureActions: jest.fn(() => ({})),
  default: jest.fn(() => ({
    updateVerificationRequest: jest.fn(),
    updateAccountFlags: jest.fn().mockResolvedValue(undefined),
  })),
}))

describe('PendingReview', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <PendingReviewScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders the submission timestamp when verificationVideoSubmittedAt is set', () => {
    const submittedAt = new Date('2026-03-10T14:30:00')
    const tree = render(
      <BasicAppContext initialStateOverride={{ bcscSecure: { verificationVideoSubmittedAt: submittedAt } as any }}>
        <PendingReviewScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree.getByText(moment(submittedAt).format('dddd MMMM D, YYYY, h:mm a'))).toBeTruthy()
  })
})
