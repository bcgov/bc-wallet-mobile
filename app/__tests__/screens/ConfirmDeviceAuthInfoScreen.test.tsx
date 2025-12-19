import { render } from '@testing-library/react-native'
import React from 'react'

import { ConfirmDeviceAuthInfoScreen } from '@/bcsc-theme/features/auth/ConfirmDeviceAuthInfoScreen'
import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'

describe('ConfirmDeviceAuthInfoScreen', () => {
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
        <ConfirmDeviceAuthInfoScreen navigation={mockNavigation as never} />
      </BasicAppContext>,
    )

    expect(tree).toMatchSnapshot()
  })
})
