import { render } from '@testing-library/react-native'
import React from 'react'

import { DeviceAuthAppResetScreen } from '@/bcsc-theme/features/auth/DeviceAuthAppResetScreen'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'

describe('DeviceAuthAppResetScreen', () => {
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
        <DeviceAuthAppResetScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
