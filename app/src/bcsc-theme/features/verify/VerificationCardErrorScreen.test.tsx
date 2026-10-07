import { BasicAppContext } from '@mocks/helpers/app'
import { useRoute } from '@react-navigation/native'
import { render } from '@testing-library/react-native'
import React from 'react'
import VerificationCardErrorScreen from './VerificationCardErrorScreen'
import { DeviceAuthorizationError } from './deviceAuthorizationError'

describe('VerificationCardErrorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders MismatchedSerial variant correctly', () => {
    jest.mocked(useRoute).mockReturnValue({
      key: 'test',
      name: 'BCSCVerificationCardError',
      params: { errorType: DeviceAuthorizationError.MismatchedSerial },
    })

    const tree = render(
      <BasicAppContext>
        <VerificationCardErrorScreen navigation={jest.fn() as any} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders CardExpired variant correctly', () => {
    jest.mocked(useRoute).mockReturnValue({
      key: 'test',
      name: 'BCSCVerificationCardError',
      params: { errorType: DeviceAuthorizationError.CardExpired },
    })

    const tree = render(
      <BasicAppContext>
        <VerificationCardErrorScreen navigation={jest.fn() as any} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
