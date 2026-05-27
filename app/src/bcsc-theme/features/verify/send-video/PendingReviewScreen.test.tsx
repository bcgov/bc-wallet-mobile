import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import PendingReviewScreen from './PendingReviewScreen'

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
})
