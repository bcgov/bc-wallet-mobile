import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { ReverifyAccountScreen } from './ReverifyAccountScreen'

jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: jest.fn(() => ({
    startLoading: jest.fn().mockReturnValue(jest.fn()),
  })),
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  useSecureActions: jest.fn(() => ({
    continueVerificationProcess: jest.fn(),
  })),
}))

jest.mock('@/bcsc-theme/hooks/useVerificationReset', () => ({
  useVerificationReset: jest.fn(() => jest.fn()),
}))

const makeRoute = (isExpired: boolean) => ({ params: { isExpired } }) as any

describe('ReverifyAccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly for a renewal notification', () => {
    const tree = render(
      <BasicAppContext>
        <ReverifyAccountScreen route={makeRoute(false)} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders correctly for an expiry notification', () => {
    const tree = render(
      <BasicAppContext>
        <ReverifyAccountScreen route={makeRoute(true)} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
